import { spawn } from "node:child_process";
import path from "node:path";
import type { Plugin } from "vite";
import { POGO_DIRECTORY_BOUNDS, pogoDirectoryResult, pogoDirectoryFailure, pogoStopResult, pogoStopFailure } from "../lib/pokemon/pogomap-provider";
import { pogoMapBody, PogoMapError } from "../lib/pokemon/pogomap";
import type { FeedResult, Gym, Stop } from "../lib/pokemon/facilities";

// The local Windows app uses its standard HTTP stack. Worker deployments use
// the public fetch route instead. Both read the same verified endpoint and
// validate the same payload. This is not a browser/session credential bridge.
type Directory = FeedResult<Gym | Stop>;
export function readPublicDirectory(script: string, kind: "gym" | "stop"): Promise<Directory> {
  const failure = kind === "gym" ? pogoDirectoryFailure : pogoStopFailure;
  const result = kind === "gym" ? pogoDirectoryResult : pogoStopResult;
  return new Promise(resolve => {
    const child = spawn("pwsh.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-File", script], {
      windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "", settled = false;
    const finish = (value: Directory) => { if (settled) return; settled = true; clearTimeout(timer); resolve(value); };
    const timer = setTimeout(() => { child.kill(); finish(failure("error", "PogoMap 公开目录请求超时")); }, 45000);
    child.stdout.setEncoding("utf8"); child.stderr.resume();
    child.stdout.on("data", data => {
      output += data;
      if (output.length > 4 * 1024 * 1024) { child.kill(); finish(failure("error", "PogoMap 目录超过读取上限")); }
    });
    child.on("error", () => finish(failure("error", "本地目录读取需要 PowerShell 7（pwsh.exe），请检查安装或 PATH")));
    child.on("close", code => {
      if (settled) return;
      try {
        if (code !== 0) throw new Error("本地公开目录读取失败");
        const response = JSON.parse(output.replace(/^\uFEFF/, ""));
        if (["authorization", "rate-limit", "error"].includes(response.status)) {
          finish(failure(response.status, response.message)); return;
        }
        if (!Number.isFinite(response.fetchedAt)) throw new Error("来源取得时间不合法");
        finish(result(response.payload, response.fetchedAt));
      } catch (error) {
        finish(failure(error instanceof PogoMapError ? error.status : "error", error instanceof Error ? error.message : "公开目录响应不合法"));
      }
    });
    child.stdin.on("error", () => {});
    child.stdin.end(pogoMapBody(POGO_DIRECTORY_BOUNDS,kind).toString());
  });
}
export function pogoMapLocal(): Plugin {
  let root = "";
  const state = { gym: { pending: null as Promise<Directory>|null, cached: null as Directory|null, lastRequest: 0 }, stop: { pending: null as Promise<Directory>|null, cached: null as Directory|null, lastRequest: 0 } };
  return {
    name: "pogomap-public-local", apply: "serve",
    configResolved(config) { root = config.root; },
    configureServer(server) {
      if (process.platform !== "win32") return;
      server.middlewares.use(async (request, response, next) => {
        const route=request.url?.split("?")[0];
        if (!["/api/gym-directory","/api/stop-directory"].includes(route??"")) { next(); return; }
        const kind=route==="/api/gym-directory"?"gym":"stop",entry=state[kind];
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        if (request.method !== "GET") { response.statusCode = 405; response.end(JSON.stringify({message:"仅支持 GET"})); return; }
        console.info(`[${kind} directory] open-page request`);
        // Open-page requests share concurrent work and a 60-second courtesy
        // interval; there is no timer or scheduled directory polling.
        if (!entry.pending && (!entry.cached || Date.now() - entry.lastRequest >= 60000)) {
          entry.lastRequest = Date.now();
          console.info(`[${kind} directory] public anonymous read`);
          entry.pending = readPublicDirectory(path.join(root, "scripts/read-pogomap.ps1"),kind);
        }
        const task = entry.pending;
        if (task) { entry.cached = await task; if (entry.pending === task) entry.pending = null; }
        response.end(JSON.stringify(entry.cached));
      });
    },
  };
}
