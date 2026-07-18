import fs from "node:fs/promises";
import crypto from "node:crypto";

const writeQueues = new Map();

export async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

export async function atomicWriteJson(file, data) {
  const contents = `${JSON.stringify(data, null, 2)}\n`;
  const previous = writeQueues.get(file) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    const temp = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temp, contents, "utf8");
    await fs.rename(temp, file);
  });
  writeQueues.set(file, task);
  try {
    await task;
  } finally {
    if (writeQueues.get(file) === task) writeQueues.delete(file);
  }
}

export async function writeCanonicalJsonl(file, jobs) {
  const content = jobs.map((job) => JSON.stringify(job)).join("\n");
  await fs.writeFile(file, content ? `${content}\n` : "", "utf8");
}
