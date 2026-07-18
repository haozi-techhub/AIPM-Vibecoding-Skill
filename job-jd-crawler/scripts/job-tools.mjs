import crypto from "node:crypto";

export const TARGET_MIN_K = 33;
export const TARGET_MAX_K = 60;

const ARRAY_KEYS = ["result", "data", "rows", "items", "list", "jobs", "jobList"];

export function parseOpenCliJson(stdout) {
  const text = String(stdout ?? "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const starts = [text.indexOf("["), text.indexOf("{")].filter((v) => v >= 0).sort((a, b) => a - b);
    for (const start of starts) {
      for (let end = text.length; end > start; end -= 1) {
        const last = text[end - 1];
        if (last !== "]" && last !== "}") continue;
        try {
          return JSON.parse(text.slice(start, end));
        } catch {
          // Continue searching for the JSON boundary.
        }
      }
    }
    throw new Error(`opencli did not return valid JSON: ${text.slice(0, 300)}`);
  }
}

export function rowsFromOpenCli(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of ARRAY_KEYS) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = rowsFromOpenCli(value);
      if (nested.length) return nested;
    }
  }
  const values = Object.values(payload);
  if (values.length && values.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    return values;
  }
  return [];
}

function cleanSalaryText(raw) {
  return String(raw ?? "")
    .replace(/[，,]/g, "")
    .replace(/[—–－~～至]/g, "-")
    .replace(/人民币|税前|月薪|薪资|待遇/gi, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function parseSalary(raw) {
  const rawText = String(raw ?? "").trim();
  const text = cleanSalaryText(rawText);
  if (!text || /面议|保密|negotiable/.test(text) || /\/天|每天|日薪|\/小时|时薪/.test(text)) {
    return { raw: rawText, parseable: false, reason: "missing_or_non_monthly" };
  }

  const monthsMatch = text.match(/[·x×*](1[3-9]|2[0-4])薪?/i) || text.match(/(1[3-9]|2[0-4])薪/i);
  const months = monthsMatch ? Number(monthsMatch[1]) : 12;
  const annual = /年薪|\/年|每年|annum|annual/.test(text);
  const below = /以下|以内|below|up\s*to/.test(text);
  const above = /以上|起|及以上|above/.test(text);

  const range = text.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(k|千|万|元)?/i);
  const single = text.match(/(\d+(?:\.\d+)?)\s*(k|千|万|元)/i);
  if (!range && !single) return { raw: rawText, parseable: false, reason: "unrecognized" };

  const lowValue = Number(range ? range[1] : single[1]);
  const highValue = Number(range ? range[2] : single[1]);
  const unit = (range ? range[3] : single[2]) || (lowValue <= 10 ? "万" : "k");
  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue) || lowValue <= 0 || highValue <= 0) {
    return { raw: rawText, parseable: false, reason: "invalid_numbers" };
  }

  let multiplier = 1;
  if (unit === "万") multiplier = 10;
  if (unit === "元") multiplier = 0.001;

  let minimumK = lowValue * multiplier;
  let maximumK = highValue * multiplier;
  let normalization = "monthly";
  if (annual) {
    minimumK /= 12;
    maximumK /= 12;
    normalization = "annual_divided_by_12";
  }

  if (!range && below) minimumK = 0;
  if (!range && above) maximumK = Number.POSITIVE_INFINITY;

  return {
    raw: rawText,
    parseable: true,
    minimumK: roundSalary(minimumK),
    maximumK: Number.isFinite(maximumK) ? roundSalary(maximumK) : null,
    openEndedMaximum: !Number.isFinite(maximumK),
    months,
    normalization
  };
}

function roundSalary(value) {
  return Math.round(value * 100) / 100;
}

export function salaryOverlaps(salary, minimumK = TARGET_MIN_K, maximumK = TARGET_MAX_K) {
  if (!salary?.parseable) return false;
  const upper = salary.openEndedMaximum ? Number.POSITIVE_INFINITY : salary.maximumK;
  return salary.minimumK <= maximumK && upper >= minimumK;
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

export function titleEligible(title, config) {
  const value = String(title ?? "");
  const includes = config.titleInclude.some((keyword) => value.includes(keyword));
  const excludes = config.titleExclude.some((keyword) => value.includes(keyword));
  return includes && !excludes;
}

export function classifyIndustries(job, config) {
  const haystack = [
    job.title,
    job.description,
    job.skills,
    job.industry,
    job.company,
    job.tags,
    job.category
  ].flat().filter(Boolean).join(" ").toLowerCase();
  const labels = [];
  for (const [label, keywords] of Object.entries(config.industryRules)) {
    if (keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) labels.push(label);
  }
  return labels;
}

export function isEmbodiedRobotJob(job) {
  const embodiedLabels = new Set(["具身智能", "四足机器人", "人形机器人", "机器人"]);
  return (job.industries || []).some((label) => embodiedLabels.has(label));
}

export function normalizeCompany(company) {
  return normalizeText(company)
    .replace(/有限责任公司|股份有限公司|有限公司|集团|科技|网络/g, "");
}

export function normalizeTitle(title) {
  return normalizeText(title)
    .replace(/资深|高级|中高级|专家|专家级|负责人|总监|（.*?）|\(.*?\)/g, "")
    .replace(/ai|人工智能|aigc/g, "");
}

export function sourceKey(job) {
  const fallback = [job.company, job.title, job.city, job.salaryRaw].map(normalizeText).join("|");
  return `${job.source}:${job.sourceId || normalizeText(job.url) || fallback}`;
}

function ngrams(text, size = 3) {
  const normalized = normalizeText(text);
  const set = new Set();
  if (normalized.length <= size) {
    if (normalized) set.add(normalized);
    return set;
  }
  for (let index = 0; index <= normalized.length - size; index += 1) {
    set.add(normalized.slice(index, index + size));
  }
  return set;
}

export function textSimilarity(left, right) {
  const a = ngrams(left);
  const b = ngrams(right);
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function isCrossSourceDuplicate(left, right) {
  if (sourceKey(left) === sourceKey(right)) return true;
  if (left.city !== right.city) return false;
  const leftDescription = normalizeText(left.description);
  const rightDescription = normalizeText(right.description);
  const exactSubstantialDescription = leftDescription.length >= 200 && leftDescription === rightDescription;
  const sameCompany = normalizeCompany(left.company) === normalizeCompany(right.company);
  if (sameCompany && exactSubstantialDescription) return true;
  if (normalizeTitle(left.title) !== normalizeTitle(right.title)) return false;
  if (sameCompany) return textSimilarity(left.description, right.description) >= 0.8;

  // Recruiters sometimes publish the same role once with the real company and
  // once with an anonymized company name. Exact, substantial JD text plus the
  // same normalized title and city is sufficient evidence that it is one role.
  return exactSubstantialDescription;
}

export function mergeDuplicate(primary, duplicate) {
  const sources = primary.alternateSources || [{ source: primary.source, url: primary.url, sourceId: primary.sourceId }];
  const candidate = { source: duplicate.source, url: duplicate.url, sourceId: duplicate.sourceId };
  if (!sources.some((item) => item.source === candidate.source && item.url === candidate.url)) sources.push(candidate);
  return {
    ...primary,
    alternateSources: sources,
    description: String(duplicate.description ?? "").length > String(primary.description ?? "").length
      ? duplicate.description
      : primary.description
  };
}

export function stableId(job) {
  const material = `${job.source}|${job.sourceId || job.url}|${job.company}|${job.title}|${job.city}`;
  return crypto.createHash("sha256").update(material).digest("hex").slice(0, 16);
}

export function listCandidateFromRow(source, row, context) {
  if (source === "boss") {
    const url = row.url || "";
    const sourceId = row.security_id || row.securityId || extractBossSecurityId(url);
    return {
      source,
      sourceId,
      securityId: sourceId,
      title: row.name || row.title || "",
      salaryRaw: row.salary || "",
      company: row.company || "",
      city: context.city,
      district: row.area || row.district || "",
      experience: row.experience || "",
      degree: row.degree || "",
      skills: row.skills || [],
      recruiter: row.boss || "",
      activeStatus: row.bossOnline || "",
      url,
      searchTerm: context.searchTerm
    };
  }
  const sourceId = String(row.jobId || row.job_id || row.id || "");
  return {
    source,
    sourceId,
    jobId: sourceId,
    title: row.title || row.name || "",
    salaryRaw: row.salary || "",
    company: row.companyFull || row.company || "",
    city: row.city || context.city,
    district: row.district || "",
    experience: row.workYear || row.experience || "",
    degree: row.degree || "",
    skills: row.tags || [],
    industry: row.industry || "",
    recruiter: row.hr || "",
    publishedAt: row.issueDate || "",
    url: row.url || "",
    companyUrl: row.companyUrl || "",
    searchTerm: context.searchTerm
  };
}

function extractBossSecurityId(url) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("securityId") || "";
  } catch {
    return "";
  }
}

export function fullJobFromDetail(candidate, detail, config) {
  const detailTitle = String(detail.name || detail.title || "").trim();
  const usableDetailTitle = detailTitle && !/^(APP下载|app下载|职位详情|前程无忧|51job)$/i.test(detailTitle);
  const detailCompany = String(detail.company || "").trim();
  const locationRaw = String(detail.location || detail.city || "").trim();
  const inferredCity = config.cities.find((city) => locationRaw.includes(city)) || candidate.city;
  const common = {
    ...candidate,
    title: usableDetailTitle ? detailTitle : candidate.title,
    salaryRaw: detail.salary || candidate.salaryRaw,
    company: detailCompany || candidate.company,
    city: inferredCity,
    locationRaw,
    experience: detail.experience || detail.workYear || candidate.experience,
    degree: detail.degree || candidate.degree,
    description: detail.description || "",
    skills: detail.skills || candidate.skills || [],
    welfare: detail.welfare || [],
    industry: detail.industry || detail.companyIndustry || candidate.industry || "",
    companyType: detail.companyType || detail.stage || "",
    companySize: detail.companySize || detail.scale || "",
    address: detail.address || "",
    recruiter: detail.boss_name || candidate.recruiter || "",
    recruiterTitle: detail.boss_title || "",
    activeStatus: detail.active_time || candidate.activeStatus || "",
    category: detail.category || "",
    url: detail.url || candidate.url,
    fetchedAt: new Date().toISOString()
  };
  const salary = parseSalary(common.salaryRaw);
  const industries = classifyIndustries(common, config);
  return {
    ...common,
    id: stableId(common),
    salary,
    industries,
    alternateSources: [{ source: common.source, url: common.url, sourceId: common.sourceId }]
  };
}

export function locationInScope(job, config) {
  const evidence = String(job.locationRaw || "").trim();
  if (evidence) return config.cities.some((city) => evidence.includes(city));
  const explicitOtherCity = /(?:^|[-（(\/])(?:北京|天津|重庆|广州|深圳|南京|成都|武汉|西安|长沙|合肥|宁波|无锡|常州|青岛|济南|厦门|福州|郑州)(?:$|[-）)\/])/;
  return !explicitOtherCity.test(String(job.title || ""));
}

export function nextDelayMs(randomInt = crypto.randomInt, minimumMs = 30000, maximumMs = 40000) {
  if (minimumMs < 30000 || maximumMs > 40000 || maximumMs < minimumMs) {
    throw new Error("Website delay must stay within the 30–40 second safety boundary");
  }
  return randomInt(minimumMs, maximumMs + 1);
}

export function isFatalRiskSignal(text) {
  return /验证码|安全验证|访问过于频繁|异常访问|账号异常|登录失效|请先登录|未登录|captcha|too many requests|风控拦截|触发.{0,8}风控|(?:http|status|statuscode|code|错误码)\s*["']?\s*[:=]?\s*(?:403|429)\b|\b(?:403|429)\s*(?:forbidden|too many requests)/i.test(String(text ?? ""));
}

export function verifyRequestSpacing(requestLog, minimumGapMs = 30000) {
  const violations = [];
  for (let index = 1; index < requestLog.length; index += 1) {
    const previous = requestLog[index - 1];
    const current = requestLog[index];
    const gapMs = current.startedAt - previous.finishedAt;
    if (gapMs < minimumGapMs) violations.push({ previous: index - 1, current: index, gapMs });
  }
  return violations;
}
