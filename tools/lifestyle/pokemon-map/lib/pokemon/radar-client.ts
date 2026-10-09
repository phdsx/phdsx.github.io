import { assetUrl } from "./deployment";
import { parseRadarSnapshot, radarSearchUrl, type RadarQuery, type RadarSnapshot } from "./radar-search";

function configuredOrigin(): string {
  return typeof document === "undefined" ? "" : document.querySelector<HTMLMetaElement>('meta[name="pokemon-radar-api-origin"]')?.content.trim() ?? "";
}

export function usesBrowserRadar(): boolean {
  return !configuredOrigin() && typeof document !== "undefined" && new URL(document.baseURI).hostname.endsWith(".github.io");
}

export function radarApiUrl(query: RadarQuery, manual = false): string {
  const origin = configuredOrigin();
  const url = origin ? new URL("/tools/lifestyle/pokemon-map/api/radar-search", origin) : new URL(assetUrl("api/radar-search"), "http://localhost");
  url.search = new URLSearchParams({ lat: String(query.lat), lon: String(query.lng), radius_km: String(query.radiusKm), layers: query.layers.join(","), ...(manual ? { refresh: "1" } : {}) }).toString();
  return url.href;
}

export function browserRadarUrl(query: RadarQuery): string {
  return `https://r.jina.ai/${radarSearchUrl(query).href}`;
}

async function browserRadarSearch(query: RadarQuery, signal?: AbortSignal): Promise<RadarSnapshot> {
  const response = await fetch(browserRadarUrl(query), {
    signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer",
    // Reader otherwise caches URLs longer than the map's five-minute refresh.
    headers: { Accept: "application/json", "X-No-Cache": "true" },
  });
  if (response.status === 429) throw new Error("公开查询通道暂时限流，请稍后重试；已有结果将保留。");
  if (!response.ok) throw new Error(`公开查询通道请求失败（HTTP ${response.status}），请稍后重试。`);
  const wrapper = await response.json() as { code?: number; data?: { content?: unknown } };
  if (wrapper.code !== 200 || typeof wrapper.data?.content !== "string") throw new Error("公开查询通道未返回有效的 iFlowGo 数据。");
  let payload;
  try { payload = JSON.parse(wrapper.data.content); }
  catch { throw new Error("公开查询通道返回的 iFlowGo JSON 不完整，请重试。"); }
  // Verify that the returned document belongs to this search before displaying it.
  if (!payload || Math.abs(payload.center?.lat - query.lat) > 0.000001 || Math.abs(payload.center?.lon - query.lng) > 0.000001
    || !Number.isFinite(payload.center?.lat) || !Number.isFinite(payload.center?.lon) || payload.radius_km !== query.radiusKm) {
    throw new Error("公开查询通道返回的搜索范围不匹配，请重试。");
  }
  const snapshot = parseRadarSnapshot(payload, query);
  for (const feed of [snapshot.result, snapshot.gyms, snapshot.quests]) feed.message += " 通过 Jina Reader 读取 iFlowGo 公开数据。";
  return snapshot;
}

export async function requestRadarSnapshot(query: RadarQuery, manual = false, signal?: AbortSignal): Promise<RadarSnapshot> {
  // GitHub Pages has no runtime API. Skip its guaranteed 404 entirely.
  if (usesBrowserRadar()) return browserRadarSearch(query, signal);
  const response = await fetch(radarApiUrl(query, manual), {
    signal, cache: "no-store", credentials: "omit", headers: { Accept: "application/json" },
  });
  if (response.status === 404 || response.headers.get("Content-Type")?.includes("text/html")) {
    if (configuredOrigin()) throw new Error("配置的坐标搜索服务地址无效，请检查服务部署。");
    // Other static hosts can use the same browser transport after detecting no API.
    return browserRadarSearch(query, signal);
  }
  if (!response.ok) throw new Error(`搜索失败（HTTP ${response.status}）`);
  const value = await response.json() as RadarSnapshot;
  if (value.result?.source !== "radar" || !Array.isArray(value.result.records) || !Array.isArray(value.gyms?.records) || !Array.isArray(value.quests?.records)) throw new Error("坐标搜索响应格式不合法。");
  return value;
}
