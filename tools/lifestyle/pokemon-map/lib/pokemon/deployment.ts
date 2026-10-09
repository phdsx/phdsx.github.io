import { SNAPSHOT_GZIP } from "./json-response";
// Resolve public files against the HTML entry, including nested static hosting.
export function assetUrl(path: string): string {
  return typeof document === "undefined" ? `/${path}` : new URL(path, document.baseURI).href;
}

export function publicAssetUrl(path: string): string {
  return typeof document === "undefined" ? `/${path}` : assetUrl(`public/${path}`);
}

const PUBLISHED_ROUTES = new Set(["snapshot", "gym-directory", "stop-directory", "gym-raids", "regional-gyms"]);
export const PUBLISHED_TRANSPORT = "X-Pokemon-Transport";

async function fetchPublished(path: string, init?: RequestInit): Promise<Response> {
  const route = path.replace(/^\/api\//, "").split("?")[0];
  if (!PUBLISHED_ROUTES.has(route)) throw new Error("地图数据接口不存在");
  const gzip = typeof DecompressionStream !== "undefined";
  const response = await fetch(assetUrl(`data/${route}.json${gzip ? ".gz" : ""}`), {
    signal: init?.signal, cache: "no-store", credentials: "omit",
  });
  if (!response.ok || response.headers.get("Content-Type")?.includes("text/html")) {
    throw new Error("地图数据快照尚未发布，请在仓库 Actions 中运行 Deploy GitHub Pages 工作流。");
  }
  // Static hosts serve .gz as a file, not as an HTTP content encoding. Use
  // the same explicit representation as the API, including directory feeds.
  const headers = new Headers(response.headers);
  headers.set("Content-Type", gzip ? SNAPSHOT_GZIP : "application/json");
  headers.set(PUBLISHED_TRANSPORT, "published");
  return new Response(response.body, { status: response.status, headers });
}

export async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  const readOnly = !init?.method || init.method.toUpperCase() === "GET";
  if (readOnly && typeof document !== "undefined" && new URL(document.baseURI).hostname.endsWith(".github.io")) {
    return fetchPublished(path, init);
  }
  const response = await fetch(assetUrl(path.replace(/^\//, "")), init);
  const contentType = response.headers.get("Content-Type")?.split(";")[0] ?? "";
  if (response.status === 404 || response.ok && !contentType.includes("json") && contentType !== SNAPSHOT_GZIP) {
    if (readOnly) return fetchPublished(path, init);
    throw new Error("地图数据服务尚未连接");
  }
  return response;
}
