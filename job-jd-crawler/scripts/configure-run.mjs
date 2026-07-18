#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

function splitList(value) {
  return String(value || "").split(/[，,、;；|]/).map((item) => item.trim()).filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseArgs(argv) {
  const options = { cities: [], roles: [], evidenceTerms: [], sources: ["boss", "51job"], output: "job-search.config.json" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--cities") options.cities = splitList(argv[++index]);
    else if (arg === "--roles") options.roles = splitList(argv[++index]);
    else if (arg === "--salary-min") options.salaryMin = Number(argv[++index]);
    else if (arg === "--salary-max") options.salaryMax = Number(argv[++index]);
    else if (arg === "--evidence-terms") options.evidenceTerms = splitList(argv[++index]);
    else if (arg === "--sources") options.sources = splitList(argv[++index]);
    else if (arg === "--output") options.output = argv[++index];
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.help) return options;
  if (!options.cities.length) throw new Error("--cities is required");
  if (!options.roles.length) throw new Error("--roles is required");
  if (!Number.isFinite(options.salaryMin) || options.salaryMin < 0) throw new Error("--salary-min must be a non-negative K/month value");
  if (!Number.isFinite(options.salaryMax) || options.salaryMax < options.salaryMin) throw new Error("--salary-max must be >= --salary-min");
  if (!options.sources.length || options.sources.some((source) => !["boss", "51job"].includes(source))) {
    throw new Error("--sources supports only boss and 51job");
  }
  return options;
}

function expandRoles(roles) {
  const joined = roles.join(" ").toLowerCase();
  const terms = [];
  if (/ai|人工智能|大模型|aigc|agent/.test(joined) && /产品/.test(joined)) {
    terms.push(
      "AIGC产品经理", "Agent产品经理", "大模型产品经理", "AI应用产品经理", "AI平台产品经理",
      "AI算力产品经理", "大模型开放平台产品经理", "智能体产品经理", "具身智能产品经理",
      "机器人产品经理", "智能硬件产品经理", "智能驾驶产品经理", "智能座舱产品经理", "AI眼镜产品经理"
    );
  }
  if (/机器人|具身|人形/.test(joined)) terms.push("具身智能产品经理", "人形机器人产品经理", "机器人产品经理", "智能硬件产品经理");
  if (/智驾|智能驾驶|自动驾驶|座舱/.test(joined)) terms.push("智能驾驶产品经理", "自动驾驶产品经理", "智能座舱产品经理");
  if (/数据.*产品|产品.*数据/.test(joined)) terms.push("数据产品经理", "数据中台产品经理", "BI产品经理", "数据平台产品经理");
  if (/算法|机器学习|大模型工程/.test(joined)) terms.push("AI算法工程师", "大模型算法工程师", "NLP算法工程师", "CV算法工程师", "多模态算法工程师");
  return unique(terms).filter((term) => !roles.includes(term));
}

function deriveEvidenceTerms(roles, explicit) {
  if (explicit.length) return unique(explicit);
  const joined = roles.join(" ").toLowerCase();
  const terms = [];
  if (/ai|人工智能|大模型|aigc|agent/.test(joined)) {
    terms.push(
      "AI", "人工智能", "大模型", "LLM", "AIGC", "Agent", "智能体", "生成式", "多模态",
      "机器学习", "深度学习", "算力", "模型", "机器人", "具身", "智能驾驶", "自动驾驶",
      "智能座舱", "智能硬件", "AI眼镜", "智能眼镜"
    );
  }
  if (/机器人|具身|人形/.test(joined)) terms.push("机器人", "具身", "人形", "机械臂", "机器视觉");
  if (/智驾|智能驾驶|自动驾驶|座舱/.test(joined)) terms.push("智能驾驶", "自动驾驶", "辅助驾驶", "智驾", "ADAS", "智能座舱");
  if (/智能硬件|ai眼镜|智能眼镜/.test(joined)) terms.push("智能硬件", "AI眼镜", "智能眼镜", "IoT", "可穿戴");
  if (/数据.*产品|产品.*数据/.test(joined)) terms.push("数据产品", "数据中台", "数据平台", "BI");
  if (/算法/.test(joined)) terms.push("算法", "机器学习", "深度学习", "模型");
  if (!terms.length) terms.push(...roles);
  return unique(terms);
}

function titleRules(roles) {
  const joined = roles.join(" ");
  if (/产品/.test(joined)) {
    return {
      include: ["产品经理", "产品负责人", "产品总监"],
      exclude: ["项目经理", "销售", "研发", "开发工程师", "测试工程师"]
    };
  }
  if (/算法/.test(joined)) {
    return {
      include: ["算法工程师", "算法专家", "算法负责人", "算法研究员"],
      exclude: ["产品经理", "项目经理", "销售", "测试工程师"]
    };
  }
  return { include: roles, exclude: [] };
}

function printHelp() {
  console.log(`Usage: node configure-run.mjs --cities 上海,杭州 --salary-min 30 --salary-max 60 --roles AI产品经理 [options]

Options:
  --evidence-terms <list>  Optional relevance terms when automatic derivation is insufficient
  --sources <list>         boss,51job (default: both)
  --output <file>          Config path (default: ./job-search.config.json)`);
}

const options = parseArgs(process.argv.slice(2));
if (options.help) {
  printHelp();
  process.exit(0);
}

const supplementalSearchTerms = expandRoles(options.roles);
const evidenceTerms = deriveEvidenceTerms(options.roles, options.evidenceTerms);
const rules = titleRules(options.roles);
const equalWeight = 1 / options.cities.length;
const queueLength = options.cities.length * options.sources.length * (options.roles.length * 2 + supplementalSearchTerms.length);
const config = {
  cities: options.cities,
  cityWeights: Object.fromEntries(options.cities.map((city) => [city, equalWeight])),
  salary: { minimumK: options.salaryMin, maximumK: options.salaryMax, matchRule: "overlap" },
  categoryCaps: { embodiedRobotCompanies: 1000 },
  sources: options.sources,
  searchTerms: options.roles,
  supplementalSearchTerms,
  targetEvidenceTerms: evidenceTerms,
  industryRules: { "目标岗位": evidenceTerms },
  titleInclude: rules.include,
  titleExclude: rules.exclude,
  crawler: {
    minimumDelayMs: 30000,
    maximumDelayMs: 33000,
    searchPhaseMaximumMinutes: 40,
    candidateMultiplier: 1.5,
    maximumSearchRequests: Math.min(400, queueLength),
    pageSize: 20,
    backoffMinutes: [2, 5, 15],
    maximumConsecutiveErrors: 3
  },
  generatedFrom: {
    cities: options.cities,
    salaryKPerMonth: [options.salaryMin, options.salaryMax],
    roles: options.roles,
    evidenceTerms
  }
};

const output = path.resolve(options.output);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify(config, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output, searchTerms: config.searchTerms, supplementalSearchTerms, evidenceTerms, estimatedSearchRequests: queueLength }, null, 2));
