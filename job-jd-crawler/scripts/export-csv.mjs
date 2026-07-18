#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

function csvCell(value) {
  const text = Array.isArray(value) ? value.join("、") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function parseArgs(argv) {
  const options = { state: "", output: "" };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--state") options.state = argv[++index];
    else if (argv[index] === "--output") options.output = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!options.state) throw new Error("--state <crawl-state.json> is required");
  return options;
}

const options = parseArgs(process.argv.slice(2));
const statePath = path.resolve(options.state);
const state = JSON.parse(await fs.readFile(statePath, "utf8"));
const output = path.resolve(options.output || path.join(path.dirname(statePath), "jobs.csv"));
const headers = [
  "岗位ID", "来源", "职位名称", "公司", "城市", "区域", "原始薪资", "月薪下限K", "月薪上限K",
  "经验", "学历", "行业标签", "技能", "公司行业", "完整JD", "招聘者", "抓取时间", "来源URL", "备用来源URL"
];
const rows = state.accepted.map((job) => [
  job.id, job.source, job.title, job.company, job.city, job.district, job.salaryRaw,
  job.salary?.minimumK, job.salary?.maximumK, job.experience, job.degree, job.industries,
  job.skills, job.industry, job.description, job.recruiter, job.fetchedAt, job.url,
  (job.alternateSources || []).filter((item) => item.url && item.url !== job.url).map((item) => item.url)
]);
const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
await fs.writeFile(output, `\uFEFF${csv}\n`, "utf8");
console.log(JSON.stringify({ output, rows: rows.length }, null, 2));
