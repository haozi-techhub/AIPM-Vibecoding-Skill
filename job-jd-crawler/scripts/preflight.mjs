#!/usr/bin/env node

import { spawnSync } from "node:child_process";

function command(name, args = []) {
  const result = spawnSync(name, args, { encoding: "utf8", shell: false });
  return { available: !result.error, code: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
}

const opencli = command("opencli", ["--version"]);
if (!opencli.available) {
  console.log(JSON.stringify({
    ready: false,
    reason: "opencli_missing",
    installCommand: "npm install -g @jackwener/opencli",
    next: "Ask for approval before installing, then connect the Browser Bridge extension and rerun preflight."
  }, null, 2));
  process.exitCode = 2;
} else {
  const doctor = command("opencli", ["doctor"]);
  const bossHelp = command("opencli", ["boss", "--help"]);
  const job51Help = command("opencli", ["51job", "--help"]);
  const ready = doctor.code === 0 && /Connectivity: connected/.test(doctor.stdout) && bossHelp.code === 0 && job51Help.code === 0;
  console.log(JSON.stringify({
    ready,
    version: opencli.stdout.trim(),
    bridgeConnected: doctor.code === 0 && /Connectivity: connected/.test(doctor.stdout),
    adapters: { boss: bossHelp.code === 0, "51job": job51Help.code === 0 },
    doctor: doctor.stdout.trim()
  }, null, 2));
  if (!ready) process.exitCode = 3;
}
