import { adaptGym, adaptQuest, adaptActivity, readRows, questCatalog } from "./facility-adapters";
import { emptyFacilities, mergeFacilities, FACILITY_FEEDS, type FacilityFeed, type FacilityResults } from "./facilities";
import { ownedBy } from "./spatial";
type NYCFeed = Exclude<FacilityFeed, "pogoGyms">;

export const FACILITY_URLS = { gyms: "https://nycpokemap.com/raids.php", quests: "https://nycpokemap.com/quests.php", activities: "https://nycpokemap.com/pokestop.php" };
const PAGES = { gyms: "gym.html", quests: "quest.html", activities: "pokestop.html" };
const KEYS = { gyms: "raids", quests: "quests", activities: "invasions" } as const;
let cached = emptyFacilities();
const lastRequest = new Map<FacilityFeed, number>();
const pending = new Map<FacilityFeed, Promise<FacilityResults[FacilityFeed]>>();

export function facilityUrl(feed: NYCFeed, quests: string[] = []) {
  const url = new URL(FACILITY_URLS[feed]); url.searchParams.set("time", String(Date.now()));
  if (feed === "quests") for (const quest of quests) url.searchParams.append("quests[]", quest);
  return url;
}
class SourceError extends Error {
  constructor(public status: "authorization" | "rate-limit" | "error", message: string) { super(message); }
}
async function getPayload(feed: NYCFeed, quests: string[] = []) {
  const wait = 2000 - (Date.now() - (lastRequest.get(feed) ?? 0));
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
  lastRequest.set(feed, Date.now());
  const response = await fetch(facilityUrl(feed, quests), { headers: { Accept: "application/json", Referer: `https://nycpokemap.com/${PAGES[feed]}` }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new SourceError([401,403].includes(response.status) ? "authorization" : response.status === 429 ? "rate-limit" : "error", `设施来源请求失败（HTTP ${response.status}）${[401,403].includes(response.status) ? "，需要授权" : ""}`);
  const text = await response.text();
  if (!text.trim()) throw new Error("设施来源返回空响应");
  try { return JSON.parse(text) as unknown; } catch { throw new Error("设施来源返回非 JSON 页面，可能需要授权"); }
}
async function fetchFeed(feed: NYCFeed): Promise<FacilityResults[NYCFeed]> {
  const base = emptyFacilities()[feed];
  try {
    let payload = await getPayload(feed), partial = false;
    if (feed === "quests") {
      // An empty selection returns the source's available reward catalog, not
      // all stops. Select every published option using its actual jQuery array
      // protocol, independent of the visitor's map and Pokemon filters.
      const catalog = questCatalog(payload); partial = catalog.partial;
      if (catalog.values.length) {
        payload = await getPayload(feed, catalog.values);
      }
    }
    const parsed = readRows(payload, KEYS[feed]);
    const adapter = feed === "gyms" ? adaptGym : feed === "quests" ? adaptQuest : adaptActivity;
    const records = parsed.rows.map(raw => adapter(raw)).filter(r => r !== null && ownedBy("nyc", r.lng, r.lat));
    const unique = [...new Map(records.map(r => [r!.id, r!])).values()];
    return { ...base, records: unique, status: partial ? "partial" : "success", updatedAt: parsed.updatedAt, fetchedAt: Date.now(),
      message: partial ? "来源任务目录包含尚未支持的选项，当前为部分快照" : "" } as FacilityResults[FacilityFeed];
  } catch (error) {
    return { ...base, status: error instanceof SourceError ? error.status : "error", message: error instanceof Error
      ? ["TimeoutError","AbortError"].includes(error.name) ? "设施来源请求超时" : error.message : "设施来源请求失败" };
  }
}
async function requestFeed(feed: "gyms"): Promise<FacilityResults["gyms"]>;
async function requestFeed(feed: "quests" | "activities"): Promise<FacilityResults["quests"] | FacilityResults["activities"]>;
async function requestFeed(feed: NYCFeed) {
  const interval = 2000;
  if (Date.now() - (lastRequest.get(feed) ?? 0) < interval && cached[feed].status !== "idle") return cached[feed];
  const old = pending.get(feed); if (old) return old;
  const task = fetchFeed(feed); pending.set(feed, task);
  try { return await task; } finally { pending.delete(feed); }
}
export async function requestFacilities(): Promise<FacilityResults> {
  // All gym data have open-once routes, never this five-minute timer.
  const entries = await Promise.all(FACILITY_FEEDS.filter((feed): feed is "quests" | "activities" => feed === "quests" || feed === "activities").map(async feed => [feed, await requestFeed(feed)] as const));
  cached = mergeFacilities(cached, { ...cached, ...Object.fromEntries(entries) } as unknown as FacilityResults);
  return cached;
}
export async function requestGymRaids() {
  const gyms = await requestFeed("gyms");
  // Read the other feeds after awaiting, so a concurrent dynamic refresh is
  // retained rather than replaced by the cache from before the gym request.
  cached = mergeFacilities(cached, { ...cached, gyms });
  return cached.gyms;
}
