import { emptyRadarSnapshot, parseRadarSnapshot, radarQueryKey, radarSearchUrl, type RadarQuery, type RadarSnapshot } from "./radar-search";
import { REFRESH_INTERVAL } from "./snapshot";

const cache = new Map<string, { until: number; requestedAt: number; value: RadarSnapshot }>();
const pending = new Map<string, Promise<RadarSnapshot>>();
export async function requestRadarSearch(query: RadarQuery, force = false): Promise<RadarSnapshot> {
  const key = radarQueryKey(query), old = cache.get(key), now = Date.now();
  if (old && ((!force && old.until > now) || now - old.requestedAt < 2000)) return old.value;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const task = (async () => {
    try {
      const response = await fetch(radarSearchUrl(query), { headers: { Accept: "application/json", Referer: "https://pokecoords.iflowgo.com/" }, signal: AbortSignal.timeout(20000) });
      if (!response.ok) {
        const value = emptyRadarSnapshot(query);
        const status = [401, 403].includes(response.status) ? "authorization" : response.status === 429 ? "rate-limit" : "error";
        for (const feed of [value.result, value.gyms, value.quests]) { feed.status = status; feed.message = `iFlowGo 请求失败（HTTP ${response.status}）`; }
        return value;
      }
      return parseRadarSnapshot(await response.json(), query);
    } catch (error) {
      const value = emptyRadarSnapshot(query);
      for (const feed of [value.result, value.gyms, value.quests]) {
        feed.status = "error"; feed.message = error instanceof Error ? ["TimeoutError", "AbortError"].includes(error.name) ? "iFlowGo 请求超时，请稍后重试。" : error.message : "iFlowGo 请求失败。";
      }
      return value;
    }
  })();
  pending.set(key, task);
  try {
    const value = await task;
    // Bound memory even when many different coordinates are searched.
    if (cache.size >= 64) cache.delete(cache.keys().next().value!);
    cache.set(key, { until: Date.now() + REFRESH_INTERVAL, requestedAt: now, value });
    return value;
  } finally { pending.delete(key); }
}
