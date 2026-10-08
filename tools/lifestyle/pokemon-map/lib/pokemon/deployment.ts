import { SNAPSHOT_GZIP } from "./json-response";
// Resolve public files against the HTML entry, including nested static hosting.
export function assetUrl(path: string): string {
  return typeof document === "undefined" ? `/${path}` : new URL(path, document.baseURI).href;
}

export function publicAssetUrl(path: string): string {
  return typeof document === "undefined" ? `/${path}` : assetUrl(`public/${path}`);
}

export async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(assetUrl(path.replace(/^\//, "")), init);
  const contentType = response.headers.get("Content-Type")?.split(";")[0] ?? "";
  if (response.status === 404 || response.ok && !contentType.includes("json") && contentType !== SNAPSHOT_GZIP) {
    throw new Error("地图数据服务尚未连接，请使用带数据接口的站点预览服务。");
  }
  return response;
}
