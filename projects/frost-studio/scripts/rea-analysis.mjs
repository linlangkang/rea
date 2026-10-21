// REA remains a development tool: no target code is executed and no browser is opened.
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "output", "rea");
await mkdir(out, { recursive: true });
const cli = path.join(
  root,
  "tools",
  "rea",
  "node_modules",
  "rea-agents",
  "scripts",
  "rea.mjs",
);
const evidencePath = path.join(out, "application-evidence.json");
const evidence = createWriteStream(evidencePath),
  progress = createWriteStream(path.join(out, "analysis-progress.jsonl"));
const proc = spawn(
  process.execPath,
  [
    cli,
    "analyze-javascript-application",
    path.join(root, "dist"),
    "--max-heap-mb",
    "512",
    "--analysis-timeout-ms",
    "60000",
    "--format",
    "json",
  ],
  { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
);
proc.stdout.pipe(evidence);
proc.stderr.pipe(progress);
const exitCode = await new Promise((resolve, reject) => {
  proc.once("error", reject);
  proc.once("close", resolve);
});
await Promise.all([
  new Promise((r) => evidence.end(r)),
  new Promise((r) => progress.end(r)),
]);
const raw = await readFile(evidencePath, "utf8");
let result;
try {
  result = JSON.parse(raw);
} catch {
  throw Error("REA 未返回有效 JSON，请检查 output/rea/analysis-progress.jsonl");
}
const summary = {
  version: "6.7.0",
  target: "dist/",
  exitCode,
  evidenceBytes: Buffer.byteLength(raw),
  topLevelKeys: Object.keys(result),
  staticOnly: true,
  completedAt: new Date().toISOString(),
};
await writeFile(
  path.join(out, "summary.json"),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
if (exitCode !== 0) process.exitCode = 1;
