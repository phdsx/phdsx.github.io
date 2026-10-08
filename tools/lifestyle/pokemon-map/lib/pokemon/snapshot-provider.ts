import { parsePayload } from "./adapters";
import { CITY, geometryBounds, ownedBy, intersectCoverage } from "./spatial";
import { planSingleSource } from "./source-registry";
import { coverageFor } from "./coverage";
import { emptyResult, REFRESH_INTERVAL, type Snapshot } from "./snapshot";
import type { Source, SourceResult, Spawn } from "./model";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { requestFacilities } from "./facility-provider";
import { requestExtraSources } from "./extra-provider";
type CoreSource = "nyc" | "pgc";

export const URLS = { nyc: "https://nycpokemap.com/query2.php", pgc: "https://pokemongocoordinates.com/api/map/free" };
export const CITY_BOUNDS = geometryBounds(CITY.geometry.coordinates as Parameters<typeof geometryBounds>[0]);
const cached = new Map<Source, { until: number; result: SourceResult }>();
const pending = new Map<Source, Promise<SourceResult>>();
const lastRequest = new Map<Source, number>();
let sharedSnapshot: Snapshot | null = null;
let pendingSnapshot: Promise<Snapshot> | null = null;

export function snapshotUrl(source: CoreSource, cursor?: string) {
  const url = new URL(URLS[source]);
  if (source === "nyc") {
    const b = CITY_BOUNDS;
    url.searchParams.set("bounds", `${b.west},${b.east},${b.south},${b.north}`);
    url.searchParams.set("since", "0"); url.searchParams.set("mons", ""); url.searchParams.set("time", String(Date.now()));
  } else {
    // The site's actual global free-feed request has no viewport bounds.
    url.searchParams.set("limit", "500"); if (cursor) url.searchParams.set("cursor", cursor);
  }
  return url;
}
async function fetchSource(source: CoreSource): Promise<SourceResult> {
  const base: SourceResult = { ...emptyResult(source), status:"success" };
  const coverage = coverageFor(source);
  const region = source === "nyc" ? CITY : coverage ? planSingleSource({west:-180,east:180,south:-85,north:85},"pgc") : null;
  if (coverage && region) {
    base.coverage = "verified";
    const clipped = intersectCoverage(region,coverage.feature);
    base.coverageGap = {type:"Feature",properties:{},geometry:{type:"MultiPolygon",coordinates:clipped.uncovered}};
    if (!clipped.covered.length) return {...base,status:"uncovered",message:"数据源未覆盖负责区域"};
  }
  const records: Spawn[] = [], seen = new Set<string>();
  let cursor: string | undefined, partial = false, rejected = 0, updatedAt: number | null = null;
  try {
    // Follow the actual next_cursor protocol used by the source page. Locked
    // public coordinates exit on page one and never become map records.
    for (let page = 0; page < (source === "pgc" ? 20 : 1); page++) {
      const response = await fetch(snapshotUrl(source,cursor), {headers:{Accept:"application/json",Referer:source === "nyc" ? "https://nycpokemap.com/" : "https://pokemongocoordinates.com/pokemongomap/"},signal:AbortSignal.timeout(15000)});
      if (!response.ok) return {...base,status:response.status === 401 || response.status === 403 ? "authorization" : response.status === 429 ? "rate-limit" : "error",message:`来源${response.status === 401 || response.status === 403 ? "拒绝访问，需要授权" : "请求失败"}（HTTP ${response.status}）`,retryAfter:response.status === 429 ? 60 : undefined};
      const text = await response.text(); if (!text.trim()) throw new Error("来源返回空响应，无法读取数据");
      let payload: unknown; try { payload = JSON.parse(text); } catch { throw new Error("来源返回非 JSON 页面，可能需要授权"); }
      const parsed = parsePayload(source,payload);
      if (parsed.locked) return {...base,status:"authorization",message:"来源未开放精确坐标，需要授权；未展示锁定数据",updatedAt:parsed.updatedAt,fetchedAt:Date.now(),rejected:parsed.rejected};
      records.push(...parsed.records); rejected += parsed.rejected; updatedAt = Math.max(updatedAt ?? 0,parsed.updatedAt ?? 0) || null;
      const next = (payload as {next_cursor?:unknown}).next_cursor;
      partial = parsed.partial;
      if (source === "nyc" || typeof next !== "string" || !next) break;
      if (seen.has(next)) { partial = true; break; }
      seen.add(next); cursor = next;
    }
    // Keep the public PGC feed unpartitioned in the cache. Automatic ownership
    // is applied in presentation; manual PGC selection can use its real rows
    // anywhere when precise coordinates are actually available and authorized.
    const unique = [...new Map(records.filter(s => (source==="pgc" || ownedBy(source,s.lng,s.lat)) && (!coverage || booleanPointInPolygon([s.lng,s.lat],coverage.feature)) && (s.expiresAt === null || s.expiresAt > Date.now())).map(s => [s.id,s])).values()];
    const hasGaps = !!base.coverageGap?.geometry.coordinates.length;
    return {...base,records:unique,status:partial || hasGaps ? "partial" : "success",message:partial ? "来源尚有未取得的数据；当前缓存为部分快照" : hasGaps ? "部分区域数据源未覆盖" : "",updatedAt,fetchedAt:Date.now(),rejected};
  } catch (error) {
    return {...base,status:"error",message:error instanceof Error ? error.name === "TimeoutError" || error.name === "AbortError" ? "来源请求超时" : error.message : "来源请求失败"};
  }
}
async function requestSource(source: CoreSource, force: boolean) {
  const old = cached.get(source), now = Date.now();
  const minimumInterval = source === "pgc" ? 60000 : 2000;
  // Automatic requests share a five-minute cache; manual refresh respects
  // the upstream service's own minimum interval while bypassing this TTL.
  if (old && ((!force && old.until > now) || now - (lastRequest.get(source) ?? 0) < minimumInterval)) return old.result;
  const inFlight = pending.get(source); if (inFlight) return inFlight;
  lastRequest.set(source,now);
  const task = fetchSource(source); pending.set(source,task);
  try { const result = await task; cached.set(source,{until:Date.now()+REFRESH_INTERVAL,result}); return result; }
  finally { pending.delete(source); }
}
export async function requestSnapshot(force = false): Promise<Snapshot> {
  if (pendingSnapshot) return pendingSnapshot;
  if (!force && sharedSnapshot && sharedSnapshot.nextUpdateAt > Date.now()) return sharedSnapshot;
  pendingSnapshot = (async () => {
    const [entries, facilities, extra] = await Promise.all([
      Promise.all((["nyc","pgc"] as const).map(async source => [source,await requestSource(source,force)] as const)),
      requestFacilities(),
      requestExtraSources(force),
    ]);
    const completedAt = Date.now();
    sharedSnapshot = {results:{...Object.fromEntries(entries),...extra.results} as Snapshot["results"],facilities,extraFacilities:extra.facilities,completedAt,nextUpdateAt:completedAt+REFRESH_INTERVAL};
    return sharedSnapshot;
  })();
  try { return await pendingSnapshot; } finally { pendingSnapshot = null; }
}
