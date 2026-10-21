import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
const child = spawn(
  process.execPath,
  [
    fileURLToPath(
      new URL(
        "../tools/rea/node_modules/rea-agents/scripts/rea.mjs",
        import.meta.url,
      ),
    ),
    "mcp",
  ],
  { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
);
const send = (message) => child.stdin.write(JSON.stringify(message) + "\n");
let buffer = "";
const pending = new Map();
child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  buffer += chunk;
  let end;
  while ((end = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, end);
    buffer = buffer.slice(end + 1);
    if (!line.trim()) continue;
    try {
      const message = JSON.parse(line);
      const waiter = pending.get(message.id);
      if (waiter) {
        pending.delete(message.id);
        message.error
          ? waiter.reject(Error(JSON.stringify(message.error)))
          : waiter.resolve(message.result);
      }
    } catch {}
  }
});
child.stderr.resume();
function request(id, method, params = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(Error("MCP 响应超时"));
    }, 30000);
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timer);
        reject(error);
      },
    });
    send({ jsonrpc: "2.0", id, method, params });
  });
}
try {
  await request(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "frost-studio-readiness", version: "1.0.0" },
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  const tools = await request(2, "tools/list");
  const names = tools.tools.map((t) => t.name);
  if (!names.includes("analyze_javascript_application"))
    throw Error("缺少 JavaScript 分析工具");
  const summary = {
    version: "6.7.0",
    transport: "stdio",
    connected: true,
    toolCount: names.length,
    staticAnalyzer: true,
    checkedAt: new Date().toISOString(),
  };
  await mkdir(new URL("../output/rea/", import.meta.url), { recursive: true });
  await writeFile(
    new URL("../output/rea/mcp-check.json", import.meta.url),
    JSON.stringify(summary, null, 2) + "\n",
  );
  console.log(JSON.stringify(summary, null, 2));
} finally {
  child.stdin.end();
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill();
      resolve();
    }, 3000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
