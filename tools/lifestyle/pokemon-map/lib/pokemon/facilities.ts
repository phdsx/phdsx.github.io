import { inBounds, SOURCE_NAMES, type Source, type Bounds, type RequestStatus } from "./model";

export type ResultKind = "pokemon" | "gym" | "stop" | "rocket";
export type Layers = Record<ResultKind, boolean>;
export const DEFAULT_LAYERS: Layers = { pokemon: true, gym: true, stop: true, rocket: true };
export const LAYER_LABELS: Record<ResultKind, string> = { pokemon: "宝可梦", gym: "Gym 道馆", stop: "Stop 补给站", rocket: "火箭队" };
export const FACILITY_FEEDS = ["pogoGyms", "gyms", "quests", "activities"] as const;
export type FacilityFeed = typeof FACILITY_FEEDS[number];
export const FEED_LABELS: Record<FacilityFeed, string> = { pogoGyms: "PogoMap 社区道馆", gyms: "NYC 道馆团体战", quests: "NYC 补给站任务", activities: "NYC 火箭队与站点活动" };
export type FacilitySource = Source | "pogomap";
export const FACILITY_SOURCE_NAMES: Record<FacilitySource, string> = { ...SOURCE_NAMES, pogomap: "PogoMap.info（社区目录）" };

interface Place {
  id: string; source: FacilitySource; rawId: string | null; name: string | null; lat: number; lng: number;
}
export interface Gym extends Place {
  team: number | null;
  raid: { dex: number | null; name: string | null; form: string | null; cp: number | null; tier: number | null; startsAt: number | null; endsAt: number | null };
  raw: Record<string, unknown>;
  community?: { elite: boolean | null; sponsored: boolean | null; verified: boolean | null; reportedTeam: string | null; url: string };
  raidRecord?: { source: FacilitySource; id: string; rawId: string | null; raw: Record<string, unknown> };
  referenceAt?: number;
}
export interface StopQuest extends Place {
  description: string | null; reward: string | null; expiresAt: number | null; raw: Record<string, unknown>;
}
export interface StopActivity extends Place {
  startsAt: number | null; endsAt: number | null; characterCode: number | null; typeCode: number | null;
  activity: "rocket" | "kecleon" | "gold" | "showcase" | "npc" | "unknown";
  opponent: string | null; typeName: string | null; gender: string | null; radar: string | null;
  raw: Record<string, unknown>;
}
export interface Stop extends Place { quests: StopQuest[]; activities: StopActivity[]; directory?: { raw: Record<string, unknown>; url: string } }
export interface FeedResult<T> {
  source: FacilitySource; status: RequestStatus; records: T[]; updatedAt: number | null; fetchedAt: number | null;
  message: string; stale?: boolean;
  referenceRecords?: T[]; referenceAt?: number;
}
export interface FacilityResults { pogoGyms: FeedResult<Gym>; gyms: FeedResult<Gym>; quests: FeedResult<StopQuest>; activities: FeedResult<StopActivity> }
export type VenueSelection = { kind: "gym" | "stop" | "rocket"; id: string };
export const placeKey = (p: {lat: number; lng: number}) => `${p.lat.toFixed(8)}:${p.lng.toFixed(8)}`;
export function emptyFacilities(): FacilityResults {
  const blank = { source: "nyc" as const, status: "idle" as const, records: [], updatedAt: null, fetchedAt: null, message: "" };
  return { pogoGyms: { ...blank, source: "pogomap" }, gyms: { ...blank }, quests: { ...blank }, activities: { ...blank } };
}
export function mergeGyms(directory: Gym[], raids: Gym[]): Gym[] {
  const places = [...new Map(directory.map(g => [g.id, g])).values()];
  const uniqueRaids = [...new Map(raids.map(g => [g.id, g])).values()];
  // Only one-to-one matches with the same name and coordinates rounded to
  // six decimals (about 0.1 m) can attach another source's raid observation.
  // Nearby gyms, reused names and ambiguous matches remain separate records.
  const key = (g: Gym) => g.name ? `${g.lat.toFixed(6)}:${g.lng.toFixed(6)}:${g.name.trim().toLowerCase().normalize("NFKC")}` : null;
  const directoryKeys = new Map<string, number[]>(), raidKeys = new Map<string, Gym[]>();
  places.forEach((g, i) => { const k = key(g); if (k) directoryKeys.set(k, [...(directoryKeys.get(k) ?? []), i]); });
  uniqueRaids.forEach(g => { const k = key(g); if (k) raidKeys.set(k, [...(raidKeys.get(k) ?? []), g]); });
  for (const g of uniqueRaids) {
    const k = key(g), matches = k ? directoryKeys.get(k) : undefined;
    if (matches?.length === 1 && raidKeys.get(k!)?.length === 1) {
      const i = matches[0]; places[i] = { ...places[i], team: g.team, raid: g.raid,
        raidRecord: { source: g.source, id: g.id, rawId: g.rawId, raw: g.raw } };
    } else places.push(g);
  }
  return places;
}
export function gymDirectoryRecords(feed: FeedResult<Gym>) {
  return ["error", "authorization", "rate-limit"].includes(feed.status) && !feed.records.length ? feed.referenceRecords ?? [] : feed.records;
}
export function mergeFacilities(previous: FacilityResults, incoming: FacilityResults): FacilityResults {
  return Object.fromEntries(FACILITY_FEEDS.map(key => {
    const old = previous[key], next = incoming[key];
    return [key, ["error", "rate-limit"].includes(next.status) && old.fetchedAt !== null
      ? { ...next, records: old.records, updatedAt: old.updatedAt, fetchedAt: old.fetchedAt, stale: true }
      : next];
  })) as unknown as FacilityResults;
}
export function mergeStops(quests: StopQuest[], activities: StopActivity[], directory: Stop[] = []): Stop[] {
  const places = new Map<string, Stop>();
  function add(p: StopQuest | StopActivity) {
    const id = `${p.source}:stop:${placeKey(p)}`;
    let stop = places.get(id);
    if (!stop) { stop = { id, source: p.source, rawId: null, name: p.name, lat: p.lat, lng: p.lng, quests: [], activities: [] }; places.set(id, stop); }
    if (!stop.name && p.name) stop.name = p.name;
    return stop;
  }
  for (const q of new Map(quests.map(q => [q.id, q])).values()) add(q).quests.push(q);
  for (const a of new Map(activities.map(a => [a.id, a])).values()) add(a).activities.push(a);
  // Attach static POIs only on an unambiguous exact name + six-decimal location.
  // Preserve all underlying IDs; never infer an activity from community fields.
  const key=(p:Place)=>p.name?`${p.lat.toFixed(6)}:${p.lng.toFixed(6)}:${p.name.trim().toLowerCase().normalize("NFKC")}`:null;
  const existing=[...places.values()], counts=new Map<string,number>(), staticCounts=new Map<string,number>();
  for(const p of existing){const k=key(p);if(k)counts.set(k,(counts.get(k)??0)+1);}
  for(const p of new Map(directory.map(p=>[p.id,p])).values()){const k=key(p);if(k)staticCounts.set(k,(staticCounts.get(k)??0)+1);}
  for(const p of new Map(directory.map(p=>[p.id,p])).values()) {
    const k=key(p),match=k&&counts.get(k)===1&&staticCounts.get(k)===1?existing.find(v=>key(v)===k):null;
    if(match) {places.delete(match.id);places.set(p.id,{...p,quests:match.quests,activities:match.activities});}
    else places.set(p.id,p);
  }
  return [...places.values()];
}
export function activeActivities(stop: Stop, now: number) {
  // An event with an unknown end remains explicitly unknown; a known expired
  // event loses its Rocket badge while the observed stop location remains.
  return stop.activities.filter(a => (a.startsAt === null || a.startsAt <= now) && (a.endsAt === null || a.endsAt > now));
}
export const hasRocket = (stop: Stop, now: number) => activeActivities(stop, now).some(a => a.activity === "rocket");
export function visiblePlaces<T extends Place>(records: T[], bounds: Bounds | null, query: string): T[] {
  if (!bounds) return [];
  const q = query.trim().toLowerCase();
  return records.filter(p => inBounds(p, bounds) && (!q || (p.name ?? "").toLowerCase().includes(q)));
}
export function mapVenues(gyms: Gym[], stops: Stop[], layers: Layers, now: number) {
  const venues: ({kind:"gym";record:Gym}|{kind:"stop"|"rocket";record:Stop})[] = [];
  if (layers.gym) for (const record of gyms) venues.push({kind:"gym",record});
  for (const record of stops) {
    if (hasRocket(record,now) && layers.rocket) venues.push({kind:"rocket",record});
    else if (layers.stop) venues.push({kind:"stop",record});
  }
  return venues;
}
export function raidPhase(gym: Gym, now: number) {
  const r = gym.raid;
  if (r.endsAt !== null && r.endsAt <= now) return "ended";
  if (r.startsAt !== null && r.startsAt > now) return "egg";
  if (r.dex === 0) return "pending";
  return r.dex === null ? "unknown" : "active";
}
export const TEAM_NAMES: Record<number, string> = { 0: "无队伍", 1: "蓝队 Mystic", 2: "红队 Valor", 3: "黄队 Instinct" };
export const tierLabel = (tier: number | null) => tier === null ? "未知" : tier === 6 ? "Mega" : [11, 13, 15].includes(tier) ? `暗影 ${tier - 10} 星` : `${tier} 星`;
export function remainingText(end: number | null, now: number) {
  if (end === null) return "结束时间未知";
  if (end <= now) return "已结束";
  const seconds = Math.ceil((end - now) / 1000);
  return `${Math.floor(seconds / 60)}分${String(seconds % 60).padStart(2, "0")}秒`;
}
