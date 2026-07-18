#!/usr/bin/env node

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import {
  fullJobFromDetail,
  isCrossSourceDuplicate,
  isEmbodiedRobotJob,
  isFatalRiskSignal,
  listCandidateFromRow,
  locationInScope,
  mergeDuplicate,
  nextDelayMs,
  normalizeCompany,
  parseOpenCliJson,
  parseSalary,
  rowsFromOpenCli,
  salaryOverlaps,
  sourceKey,
  titleEligible,
  verifyRequestSpacing
} from "./job-tools.mjs";
import { atomicWriteJson, readJson, writeCanonicalJsonl } from "./checkpoint.mjs";

const ROOT = path.resolve(process.cwd());
const DEFAULT_TARGET = 200;
const DEFAULT_MAX_HOURS = 3;

class RiskStop extends Error {
  constructor(message) {
    super(message);
    this.name = "RiskStop";
  }
}

function parseArgs(argv) {
  const options = {
    target: DEFAULT_TARGET,
    maxHours: DEFAULT_MAX_HOURS,
    resume: false,
    newSession: false,
    dryRun: false,
    output: "",
    config: path.join(ROOT, "job-search.config.json")
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--target") options.target = Number(argv[++index]);
    else if (arg === "--max-hours") options.maxHours = Number(argv[++index]);
    else if (arg === "--output") options.output = argv[++index];
    else if (arg === "--config") options.config = path.resolve(argv[++index]);
    else if (arg === "--resume") options.resume = true;
    else if (arg === "--new-session") options.newSession = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.target) || options.target < 1 || options.target > 1000) {
    throw new Error("--target must be an integer between 1 and 1000");
  }
  if (!Number.isFinite(options.maxHours) || options.maxHours <= 0 || options.maxHours > 3) {
    throw new Error("--max-hours must be greater than 0 and no more than 3");
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/crawl-jobs.mjs [options]

Options:
  --target <n>       Desired number of accepted jobs (default: 200)
  --max-hours <n>    Hard runtime cap, maximum 3 hours (default: 3)
  --resume           Resume the most recent checkpoint
  --new-session      Start a fresh runtime window while retaining the checkpoint
  --output <dir>     Explicit output directory
  --config <file>    Generated search configuration (default: ./job-search.config.json)
  --dry-run          Validate configuration and print the request plan without website access
  -h, --help         Show this help

Safety invariants: all website calls are serial; every call waits a random 30–40 seconds
after the previous website call; captcha/login/risk-control responses stop the run.`);
}

function timestampForPath(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
}

async function findLatestState(outputsRoot) {
  let entries = [];
  try {
    entries = await fs.readdir(outputsRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
  const candidates = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("job-jd-"))
    .map((entry) => path.join(outputsRoot, entry.name, "crawl-state.json"))
    .sort()
    .reverse();
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next run.
    }
  }
  return "";
}

function buildSearchQueue(config) {
  const queue = [];
  for (const page of [1, 2]) {
    const terms = page === 1
      ? [...config.searchTerms, ...config.supplementalSearchTerms]
      : config.searchTerms;
    for (const city of config.cities) {
      for (const searchTerm of terms) {
        for (const source of config.sources) queue.push({ source, city, searchTerm, page });
      }
    }
  }
  return queue;
}

function requestKey(request) {
  return `${request.source}|${request.city}|${request.searchTerm}|${request.page}`;
}

function createInitialState(options, config, outputDir) {
  const startedAt = Date.now();
  return {
    version: 1,
    runId: path.basename(outputDir),
    outputDir,
    startedAt,
    startedAtIso: new Date(startedAt).toISOString(),
    deadlineAt: startedAt + options.maxHours * 60 * 60 * 1000,
    target: options.target,
    phase: "preflight",
    stopReason: "",
    nextAllowedAt: 0,
    completedSearches: [],
    candidates: [],
    attemptedDetails: [],
    accepted: [],
    rejected: [],
    requestLog: [],
    counters: { searches: 0, details: 0, errors: 0 },
    settings: {
      cities: config.cities,
      cityWeights: config.cityWeights,
      salaryMinimumK: config.salary.minimumK,
      salaryMaximumK: config.salary.maximumK,
      delayMinimumMs: config.crawler.minimumDelayMs,
      delayMaximumMs: config.crawler.maximumDelayMs,
      maxHours: options.maxHours
    }
  };
}

async function canonicalizeJsonl(state) {
  const jsonl = path.join(state.outputDir, "jobs.jsonl");
  await writeCanonicalJsonl(jsonl, state.accepted);
}

async function saveState(state) {
  await atomicWriteJson(path.join(state.outputDir, "crawl-state.json"), state);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runProcess(command, args, { timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

class OpenCliClient {
  constructor(state, config) {
    this.state = state;
    this.config = config;
    this.inFlight = false;
    this.consecutiveErrors = 0;
  }

  async waitForRateLimit() {
    const remaining = Math.max(0, this.state.nextAllowedAt - Date.now());
    if (remaining > 0) {
      console.log(`[rate-limit] waiting ${(remaining / 1000).toFixed(1)}s before the next website call`);
      await sleep(remaining);
    }
  }

  async request(site, command, commandArgs = [], metadata = {}) {
    const allowed = new Set(["boss:whoami", "boss:search", "boss:detail", "51job:search", "51job:detail"]);
    if (!allowed.has(`${site}:${command}`)) throw new Error(`Blocked opencli operation: ${site}:${command}`);
    if (this.inFlight) throw new Error("Safety invariant violated: concurrent website request attempted");

    const backoffs = this.config.crawler.backoffMinutes;
    for (let attempt = 0; attempt < this.config.crawler.maximumConsecutiveErrors; attempt += 1) {
      await this.waitForRateLimit();
      if (Date.now() >= this.state.deadlineAt) throw new Error("runtime_deadline_reached");
      this.inFlight = true;
      const startedAt = Date.now();
      const monotonicStartedMs = performance.now();
      const args = [
        site,
        command,
        ...commandArgs,
        "-f", "json",
        "--window", "background",
        "--site-session", "persistent",
        "--keep-tab", "true"
      ];
      console.log(`[request] ${new Date(startedAt).toISOString()} opencli ${site} ${command} ${metadata.label || ""}`.trim());
      let result;
      try {
        result = await runProcess("opencli", args);
      } finally {
        this.inFlight = false;
      }
      const finishedAt = Date.now();
      const delayMs = nextDelayMs(
        crypto.randomInt,
        this.config.crawler.minimumDelayMs,
        this.config.crawler.maximumDelayMs
      );
      this.state.nextAllowedAt = finishedAt + delayMs;
      const combined = `${result.stdout}\n${result.stderr}`;
      this.state.requestLog.push({
        site,
        command,
        label: metadata.label || "",
        startedAt,
        startedAtIso: new Date(startedAt).toISOString(),
        finishedAt,
        durationMs: Math.round(performance.now() - monotonicStartedMs),
        exitCode: result.code,
        nextDelayMs: delayMs
      });
      await saveState(this.state);

      if (isFatalRiskSignal(combined)) {
        throw new RiskStop(`Risk-control/login signal detected during ${site} ${command}; stopped without retry`);
      }
      if (result.code === 0) {
        this.consecutiveErrors = 0;
        return parseOpenCliJson(result.stdout);
      }

      this.consecutiveErrors += 1;
      this.state.counters.errors += 1;
      const message = result.stderr.trim() || result.stdout.trim() || `exit code ${result.code}`;
      if (this.consecutiveErrors >= this.config.crawler.maximumConsecutiveErrors) {
        throw new Error(`opencli failed ${this.consecutiveErrors} consecutive times: ${message.slice(0, 500)}`);
      }
      const backoffMs = backoffs[Math.min(attempt, backoffs.length - 1)] * 60 * 1000;
      console.error(`[backoff] ${message.slice(0, 300)}; waiting ${backoffMs / 60000} minute(s)`);
      await sleep(backoffMs);
    }
    throw new Error("unreachable retry state");
  }
}

async function ensureBrowserBridge() {
  let doctor = await runProcess("opencli", ["doctor"], { timeoutMs: 30000 });
  if (doctor.code === 0 && /\[OK\] Connectivity: connected/.test(doctor.stdout)) return;
  console.log("[preflight] opencli browser bridge is unavailable; restarting the local daemon once");
  await runProcess("opencli", ["daemon", "restart"], { timeoutMs: 30000 });
  const reconnectDeadline = Date.now() + 30000;
  do {
    await sleep(3000);
    doctor = await runProcess("opencli", ["doctor"], { timeoutMs: 30000 });
    if (doctor.code === 0 && /\[OK\] Connectivity: connected/.test(doctor.stdout)) return;
  } while (Date.now() < reconnectDeadline);
  if (doctor.code !== 0 || !/\[OK\] Connectivity: connected/.test(doctor.stdout)) {
    throw new Error(`opencli browser bridge unavailable after 30s reconnect window: ${(doctor.stderr || doctor.stdout).trim()}`);
  }
}

function searchArgs(request, config) {
  if (request.source === "boss") {
    return [
      request.searchTerm,
      "--city", request.city,
      "--jobType", "全职",
      "--page", String(request.page),
      "--limit", String(Math.min(15, config.crawler.pageSize))
    ];
  }
  return [
    request.searchTerm,
    "--area", request.city,
    "--sort", "综合",
    "--page", String(request.page),
    "--limit", String(config.crawler.pageSize)
  ];
}

function detailArgs(candidate) {
  if (candidate.source === "boss") return [candidate.securityId || candidate.sourceId];
  return [candidate.jobId || candidate.sourceId];
}

function candidateCountsByCity(state, config) {
  const counts = Object.fromEntries(config.cities.map((city) => [city, 0]));
  const attempted = new Set(state.attemptedDetails);
  for (const candidate of state.candidates) {
    if (!attempted.has(sourceKey(candidate))) counts[candidate.city] = (counts[candidate.city] || 0) + 1;
  }
  return counts;
}

function acceptedCountsByCity(state, config) {
  const counts = Object.fromEntries(config.cities.map((city) => [city, 0]));
  for (const job of state.accepted) counts[job.city] = (counts[job.city] || 0) + 1;
  return counts;
}

function targetCountsByCity(state, config) {
  const targets = Object.fromEntries(config.cities.map((city) => [
    city,
    Math.round(state.target * (config.cityWeights[city] || 0))
  ]));
  const difference = state.target - Object.values(targets).reduce((sum, value) => sum + value, 0);
  targets[config.cities[0]] += difference;
  return targets;
}

function candidateGoalReached(state, config) {
  const attempted = new Set(state.attemptedDetails);
  const unattempted = state.candidates.filter((candidate) => !attempted.has(sourceKey(candidate)));
  const desired = Math.ceil(state.target * config.crawler.candidateMultiplier);
  const counts = candidateCountsByCity(state, config);
  const targets = targetCountsByCity(state, config);
  return unattempted.length >= desired && config.cities.every((city) => {
    const candidateFloor = Math.ceil(targets[city] * config.crawler.candidateMultiplier);
    return counts[city] >= candidateFloor;
  });
}

async function harvestCandidates(state, config, client, queue, maxNewRequests = Number.POSITIVE_INFINITY) {
  const completed = new Set(state.completedSearches);
  const known = new Set(state.candidates.map(sourceKey));
  let requests = 0;
  for (const request of queue) {
    if (requests >= maxNewRequests || candidateGoalReached(state, config)) break;
    if (state.counters.searches >= config.crawler.maximumSearchRequests) break;
    if (Date.now() >= state.deadlineAt - 60000) break;
    const key = requestKey(request);
    if (completed.has(key)) continue;

    const payload = await client.request(request.source, "search", searchArgs(request, config), {
      label: `${request.city}/${request.searchTerm}/page-${request.page}`
    });
    const rows = rowsFromOpenCli(payload);
    let added = 0;
    for (const row of rows) {
      const candidate = listCandidateFromRow(request.source, row, request);
      const salary = parseSalary(candidate.salaryRaw);
      if (!candidate.sourceId || !titleEligible(candidate.title, config) || !salaryOverlaps(salary, config.salary.minimumK, config.salary.maximumK)) {
        continue;
      }
      const keyForCandidate = sourceKey(candidate);
      if (known.has(keyForCandidate)) continue;
      known.add(keyForCandidate);
      state.candidates.push({ ...candidate, salary });
      added += 1;
    }
    state.completedSearches.push(key);
    completed.add(key);
    state.counters.searches += 1;
    requests += 1;
    console.log(`[search] ${request.source} ${request.city} ${request.searchTerm}: ${rows.length} rows, ${added} new salary/title matches, ${state.candidates.length} candidates total`);
    await saveState(state);
  }
  return requests;
}

function chooseNextCandidate(state, config) {
  const attempted = new Set(state.attemptedDetails);
  const acceptedUrls = new Set(state.accepted.map((job) => job.url).filter(Boolean));
  const available = state.candidates.filter((candidate) => (
    !attempted.has(sourceKey(candidate)) && (!candidate.url || !acceptedUrls.has(candidate.url))
  ));
  if (!available.length) return null;
  const counts = acceptedCountsByCity(state, config);
  const targets = targetCountsByCity(state, config);
  const robotCandidate = (candidate) => /具身|四足|人形|机器人/.test(`${candidate.title || ""} ${candidate.searchTerm || ""}`);
  const acceptedRobotCompanies = new Set(
    state.accepted.filter(isEmbodiedRobotJob).map((job) => normalizeCompany(job.company)).filter(Boolean)
  );
  const candidateRank = (candidate) => {
    const highPriority = /算力|token|大模型.*平台|开放平台|模型api|aigc|agent|智能体/i.test(
      `${candidate.title || ""} ${candidate.searchTerm || ""}`
    ) || /字节|阿里|蚂蚁|腾讯|百度|美团|拼多多|pdd|网易|华为|小米|京东|携程|滴滴|快手|同花顺|科大讯飞|美的|零跑|传音/i.test(candidate.company || "");
    if (!robotCandidate(candidate)) return highPriority ? -1 : 0;
    if (acceptedRobotCompanies.has(normalizeCompany(candidate.company))) return 1;
    return acceptedRobotCompanies.size >= config.categoryCaps.embodiedRobotCompanies ? 3 : 2;
  };
  const underTarget = config.cities
    .filter((city) => counts[city] < targets[city])
    .sort((a, b) => (counts[a] / targets[a]) - (counts[b] / targets[b]));
  for (const city of underTarget) {
    const match = available
      .filter((candidate) => candidate.city === city)
      .sort((a, b) => candidateRank(a) - candidateRank(b))[0];
    if (match) return match;
  }
  return available.sort((a, b) => {
    const rankDifference = candidateRank(a) - candidateRank(b);
    if (rankDifference !== 0) return rankDifference;
    const cityDifference = (counts[a.city] || 0) - (counts[b.city] || 0);
    if (cityDifference !== 0) return cityDifference;
    if (a.source !== b.source) return a.source === "boss" ? -1 : 1;
    return a.title.localeCompare(b.title, "zh-CN");
  })[0];
}

function addAcceptedJob(state, job) {
  const duplicateIndex = state.accepted.findIndex((current) => isCrossSourceDuplicate(current, job));
  if (duplicateIndex >= 0) {
    state.accepted[duplicateIndex] = mergeDuplicate(state.accepted[duplicateIndex], job);
    return { accepted: false, reason: "cross_source_duplicate_merged" };
  }
  state.accepted.push(job);
  return { accepted: true, reason: "accepted" };
}

function deduplicateAcceptedJobs(state) {
  const unique = [];
  const removed = [];
  for (const job of state.accepted) {
    const duplicateIndex = unique.findIndex((current) => isCrossSourceDuplicate(current, job));
    if (duplicateIndex < 0) {
      unique.push(job);
      continue;
    }
    const primary = unique[duplicateIndex];
    unique[duplicateIndex] = mergeDuplicate(primary, job);
    removed.push({
      keptId: primary.id,
      removedId: job.id,
      source: job.source,
      title: job.title,
      company: job.company,
      city: job.city,
      url: job.url
    });
  }
  if (removed.length) {
    state.accepted = unique;
    state.deduplicationLog ||= [];
    state.deduplicationLog.push({ at: new Date().toISOString(), removed });
  }
  return removed.length;
}

async function fetchOneDetail(state, config, client, candidate) {
  const key = sourceKey(candidate);
  state.attemptedDetails.push(key);
  const payload = await client.request(candidate.source, "detail", detailArgs(candidate), {
    label: `${candidate.city}/${candidate.company}/${candidate.title}`
  });
  const rows = rowsFromOpenCli(payload);
  const detail = rows[0] || (payload && typeof payload === "object" ? payload.result || payload.data || payload : {});
  const job = fullJobFromDetail(candidate, detail, config);
  state.counters.details += 1;

  let reason = "";
  if (!titleEligible(job.title, config)) reason = "title_not_product_role";
  else if (!locationInScope(job, config)) reason = "location_out_of_scope";
  else if (!salaryOverlaps(job.salary, config.salary.minimumK, config.salary.maximumK)) reason = "salary_outside_or_unparseable";
  else if (!String(job.description || "").trim()) reason = "empty_job_description";
  else if (!job.industries.length) reason = "industry_not_in_scope";
  else if (isEmbodiedRobotJob(job)) {
    const embodiedCompanies = new Set(
      state.accepted.filter(isEmbodiedRobotJob).map((item) => normalizeCompany(item.company)).filter(Boolean)
    );
    const companyKey = normalizeCompany(job.company);
    if (companyKey && !embodiedCompanies.has(companyKey) && embodiedCompanies.size >= config.categoryCaps.embodiedRobotCompanies) {
      reason = "embodied_robot_company_cap_reached";
    }
  }

  if (reason) {
    state.rejected.push({ key, reason, source: job.source, title: job.title, company: job.company, city: job.city, url: job.url });
    console.log(`[detail] rejected (${reason}): ${job.city} ${job.company} ${job.title}`);
  } else {
    const result = addAcceptedJob(state, job);
    console.log(`[detail] ${result.reason}: ${state.accepted.length}/${state.target} ${job.city} ${job.company} ${job.title}`);
  }
  await canonicalizeJsonl(state);
  await saveState(state);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const config = await readJson(options.config);
  if (config.crawler.minimumDelayMs < 30000 || config.crawler.maximumDelayMs > 40000 || config.crawler.maximumDelayMs < config.crawler.minimumDelayMs) {
    throw new Error("Safety configuration must stay within the 30–40 second boundary");
  }

  const queue = buildSearchQueue(config);
  if (options.dryRun) {
    console.log(JSON.stringify({
      valid: true,
      target: options.target,
      maxHours: options.maxHours,
      cities: config.cities,
      sources: config.sources,
      searchQueueLength: queue.length,
      maximumSearchRequests: config.crawler.maximumSearchRequests,
      delayRangeMs: [config.crawler.minimumDelayMs, config.crawler.maximumDelayMs],
      allowedOpenCliOperations: ["boss whoami", "boss search", "boss detail", "51job search", "51job detail"]
    }, null, 2));
    return;
  }

  const outputsRoot = path.join(ROOT, "outputs");
  await fs.mkdir(outputsRoot, { recursive: true });
  let state;
  let statePath = "";
  if (options.resume) statePath = options.output ? path.join(path.resolve(options.output), "crawl-state.json") : await findLatestState(outputsRoot);
  if (statePath) {
    state = await readJson(statePath);
    if (options.newSession) {
      const sessionStartedAt = Date.now();
      state.sessions ||= [];
      state.sessions.push({ startedAt: sessionStartedAt, maxHours: options.maxHours });
      state.deadlineAt = sessionStartedAt + options.maxHours * 60 * 60 * 1000;
    } else if (!state.deadlineAt) {
      state.deadlineAt = state.startedAt + options.maxHours * 60 * 60 * 1000;
    }
    state.target = options.target;
    state.stopReason = "";
    console.log(`[resume] ${state.runId}: ${state.accepted.length} accepted, ${state.candidates.length} candidates`);
  } else {
    const outputDir = options.output
      ? path.resolve(options.output)
      : path.join(outputsRoot, `job-jd-${timestampForPath()}`);
    await fs.mkdir(outputDir, { recursive: true });
    state = createInitialState(options, config, outputDir);
  }
  await fs.mkdir(state.outputDir, { recursive: true });
  const outOfScopeAccepted = state.accepted.filter((job) => !locationInScope(job, config));
  if (outOfScopeAccepted.length) {
    const removedIds = new Set(outOfScopeAccepted.map((job) => job.id));
    state.accepted = state.accepted.filter((job) => !removedIds.has(job.id));
    state.rejected.push(...outOfScopeAccepted.map((job) => ({
      key: sourceKey(job),
      reason: "location_out_of_scope",
      source: job.source,
      title: job.title,
      company: job.company,
      city: job.city,
      url: job.url
    })));
    console.log(`[repair] removed ${outOfScopeAccepted.length} previously accepted out-of-scope location(s)`);
  }
  const duplicateCount = deduplicateAcceptedJobs(state);
  if (duplicateCount) {
    console.log(`[repair] merged ${duplicateCount} previously accepted duplicate job(s)`);
  }
  await canonicalizeJsonl(state);
  await saveState(state);

  const client = new OpenCliClient(state, config);
  const shutdown = async (signal) => {
    state.stopReason = `received_${signal}`;
    state.phase = "stopped";
    await canonicalizeJsonl(state);
    await saveState(state);
    console.error(`[stop] checkpoint saved after ${signal}`);
    process.exit(130);
  };
  process.once("SIGINT", () => { void shutdown("SIGINT"); });
  process.once("SIGTERM", () => { void shutdown("SIGTERM"); });

  try {
    state.phase = "preflight";
    await ensureBrowserBridge();
    if (!state.preflightCompleted) {
      const identity = await client.request("boss", "whoami", [], { label: "account preflight" });
      const serialized = JSON.stringify(identity);
      if (/"logged_in"\s*:\s*false/i.test(serialized)) {
        throw new RiskStop("BOSS account is not logged in; run `opencli boss login` manually before resuming");
      }
      state.preflightCompleted = true;
      await saveState(state);
    }

    state.phase = "searching";
    const searchPhaseDeadline = Math.min(
      state.deadlineAt - 60 * 60 * 1000,
      Date.now() + config.crawler.searchPhaseMaximumMinutes * 60 * 1000
    );
    while (!candidateGoalReached(state, config) && Date.now() < searchPhaseDeadline) {
      const count = await harvestCandidates(state, config, client, queue, 1);
      if (count === 0) break;
    }

    const supplementalSet = new Set(config.supplementalSearchTerms);
    const hasPendingSupplemental = () => {
      const completed = new Set(state.completedSearches);
      return queue.some((request) => request.page === 1 && supplementalSet.has(request.searchTerm) && !completed.has(requestKey(request)));
    };
    const supplementalDeadline = Math.min(state.deadlineAt - 30 * 60 * 1000, Date.now() + 12 * 60 * 1000);
    while (hasPendingSupplemental() && Date.now() < supplementalDeadline && state.counters.searches < config.crawler.maximumSearchRequests) {
      const count = await harvestCandidates(state, config, client, queue, 1);
      if (count === 0) break;
    }

    state.phase = "details";
    while (state.accepted.length < state.target && Date.now() < state.deadlineAt - 60000) {
      const candidate = chooseNextCandidate(state, config);
      if (candidate) {
        await fetchOneDetail(state, config, client, candidate);
        continue;
      }
      state.phase = "searching_more";
      const addedSearches = await harvestCandidates(state, config, client, queue, 1);
      state.phase = "details";
      if (addedSearches === 0) {
        state.stopReason = "candidate_queue_exhausted";
        break;
      }
    }

    if (!state.stopReason) {
      state.stopReason = state.accepted.length >= state.target ? "target_reached" : "runtime_deadline_reached";
    }
    const spacingViolations = verifyRequestSpacing(state.requestLog);
    state.phase = "complete";
    state.completedAt = new Date().toISOString();
    state.quality = {
      spacingViolations,
      accepted: state.accepted.length,
      rejected: state.rejected.length,
      cityCounts: acceptedCountsByCity(state, config)
    };
    await canonicalizeJsonl(state);
    await saveState(state);
    console.log(`[complete] ${state.stopReason}; accepted=${state.accepted.length}; spacingViolations=${spacingViolations.length}`);
    console.log(`[output] ${state.outputDir}`);
  } catch (error) {
    state.phase = error instanceof RiskStop ? "risk_stopped" : "failed";
    state.stopReason = error.message;
    state.completedAt = new Date().toISOString();
    await canonicalizeJsonl(state);
    await saveState(state);
    console.error(`[stopped] ${error.name}: ${error.message}`);
    console.error(`[output] ${state.outputDir}`);
    process.exitCode = error instanceof RiskStop ? 2 : 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
