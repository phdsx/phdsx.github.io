import { adaptRadar } from "./adapters";
import names from "./names.json";
import { numeric, timestamp, type SourceResult } from "./model";
import type { FeedResult, Gym, StopQuest } from "./facilities";
import { emptyResult } from "./snapshot";
import { RADAR_API } from "./source-registry";

export const RADAR_LAYERS = ["spawns", "raids", "quests"] as const;
export type RadarLayer = typeof RADAR_LAYERS[number];
export const RADAR_LAYER_LABELS: Record<RadarLayer, string> = { spawns: "宝可梦", raids: "团体战", quests: "补给站任务" };
export const RADAR_LIMIT = 800;
export interface RadarQuery { lat: number; lng: number; radiusKm: number; layers: RadarLayer[] }
export interface RadarSnapshot {
  query: RadarQuery; result: SourceResult; gyms: FeedResult<Gym>; quests: FeedResult<StopQuest>;
  generatedAt: number | null;
}
export const NEW_YORK_PLACES = [
  { name: "时代广场", lat: 40.758000, lng: -73.985500 },
  { name: "中央公园 · Bethesda 喷泉", lat: 40.774000, lng: -73.970900 },
  { name: "帝国大厦", lat: 40.748440, lng: -73.985664 },
  { name: "中央车站", lat: 40.752726, lng: -73.977229 },
  { name: "布鲁克林大桥", lat: 40.706086, lng: -73.996864 },
  { name: "自由女神像", lat: 40.689249, lng: -74.044500 },
];

export function radarQuery(lat: string, lng: string, radiusKm: string, layers: readonly string[]): RadarQuery {
  if (!lat.trim() || !lng.trim()) throw new Error("请填写纬度和经度，或选择一个纽约地点。");
  const y = Number(lat), x = Number(lng), radius = Number(radiusKm);
  if (!Number.isFinite(y) || Math.abs(y) > 90 || !Number.isFinite(x) || Math.abs(x) > 180) throw new Error("纬度须在 -90 到 90 之间，经度须在 -180 到 180 之间。");
  if (!radiusKm.trim() || !Number.isFinite(radius) || radius < 1 || radius > 15) throw new Error("搜索半径须在 1 到 15 km 之间。");
  if (!layers.length || layers.some(layer => !(RADAR_LAYERS as readonly string[]).includes(layer))) throw new Error("请至少选择一个搜索类别。");
  return { lat: y, lng: x, radiusKm: radius, layers: RADAR_LAYERS.filter(layer => layers.includes(layer)) };
}
export function radarSearchUrl(query: RadarQuery): URL {
  const url = new URL(`${RADAR_API}/nearby`);
  url.search = new URLSearchParams({ lat: String(query.lat), lon: String(query.lng), radius_km: String(query.radiusKm), layers: query.layers.join(","), limit: String(RADAR_LIMIT) }).toString();
  return url;
}
export function radarQueryKey(query: RadarQuery): string { return radarSearchUrl(query).search; }
export function inRadarRadius(point: { lat: number; lng: number }, query: RadarQuery): boolean {
  const rad = Math.PI / 180, dLat = (point.lat - query.lat) * rad, dLng = (point.lng - query.lng) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(query.lat * rad) * Math.cos(point.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))) <= query.radiusKm + 0.001;
}
export function emptyRadarSnapshot(query: RadarQuery): RadarSnapshot {
  const blank = { source: "radar" as const, status: "idle" as const, records: [], updatedAt: null, fetchedAt: null, message: "" };
  return { query, result: emptyResult("radar"), gyms: { ...blank, records: [] }, quests: { ...blank, records: [] }, generatedAt: null };
}
type Raw = Record<string, unknown>;
const text = (value: unknown) => typeof value === "string" && value.trim() ? value : null;
function place(raw: Raw, query: RadarQuery) {
  const rawId = text(raw.id) ?? (typeof raw.id === "number" && Number.isSafeInteger(raw.id) ? String(raw.id) : null);
  const lat = raw.lat === null || raw.lat === undefined || raw.lat === "" ? NaN : Number(raw.lat);
  const lng = raw.lon === null || raw.lon === undefined || raw.lon === "" ? NaN : Number(raw.lon);
  if (!rawId || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180 || !inRadarRadius({ lat, lng }, query)) return null;
  return { source: "radar" as const, rawId, lat, lng, raw };
}
export function parseRadarSnapshot(payload: unknown, query: RadarQuery, now = Date.now()): RadarSnapshot {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("iFlowGo 返回的数据格式不合法。");
  const data = payload as Raw, snapshot = emptyRadarSnapshot(query);
  let rejected = 0;
  const truncated: string[] = [];
  for (const layer of query.layers) {
    const rows = data[layer];
    if (!Array.isArray(rows)) throw new Error(`iFlowGo 响应缺少${RADAR_LAYER_LABELS[layer]}数组。`);
    if (rows.length >= RADAR_LIMIT) truncated.push(RADAR_LAYER_LABELS[layer]);
    let valid = 0;
    for (const value of rows) {
      if (!value || typeof value !== "object" || Array.isArray(value)) { rejected++; continue; }
      const raw = value as Raw, p = place(raw, query);
      if (!p) { rejected++; continue; }
      if (layer === "spawns") {
        const spawn = adaptRadar(raw, "radar");
        if (!spawn) { rejected++; continue; }
        valid++;
        if (spawn.expiresAt === null || spawn.expiresAt > now) snapshot.result.records.push(spawn);
      } else if (layer === "raids") {
        const dex = numeric(raw.raid_pokemon_id), endsAt = timestamp(raw.raid_end_at);
        valid++;
        if (endsAt !== null && endsAt <= now) continue;
        snapshot.gyms.records.push({ ...p, id: `radar:raid:${p.rawId}`, name: text(raw.gym_name), team: null,
          raid: { dex, name: dex === null ? null : (names as Record<string, string>)[String(dex)] ?? null, form: null, cp: null,
            tier: numeric(raw.raid_level), startsAt: timestamp(raw.raid_battle_at), endsAt } });
      } else {
        valid++;
        snapshot.quests.records.push({ ...p, id: `radar:quest:${p.rawId}`, name: text(raw.pokestop_name),
          description: text(raw.quest_title), reward: Array.isArray(raw.quest_rewards) ? JSON.stringify(raw.quest_rewards) : null, expiresAt: null });
      }
    }
    if (rows.length && !valid) throw new Error(`iFlowGo 的${RADAR_LAYER_LABELS[layer]}记录全部未通过坐标与字段验证。`);
  }
  const message = `中心 ${query.lat.toFixed(6)}, ${query.lng.toFixed(6)} · 半径 ${query.radiusKm} km。扫描覆盖与完整性未知。${truncated.length ? `${truncated.join("、")}达到每类 ${RADAR_LIMIT} 条上限，结果可能截断。` : ""}${rejected ? `已忽略 ${rejected} 条异常或范围外记录。` : ""}`;
  for (const feed of [snapshot.result, snapshot.gyms, snapshot.quests]) {
    feed.status = "partial"; feed.fetchedAt = now; feed.message = message;
    feed.records = [...new Map(feed.records.map(record => [record.id, record])).values()] as typeof feed.records;
  }
  snapshot.result.rejected = rejected;
  // generated_at is the response creation time, not the scanner observation time.
  snapshot.generatedAt = timestamp(data.generated_at);
  return snapshot;
}
export function mergeRadarSnapshot(previous: RadarSnapshot | null, next: RadarSnapshot): RadarSnapshot {
  if (!previous || radarQueryKey(previous.query) !== radarQueryKey(next.query) || previous.result.fetchedAt === null || !["error", "rate-limit"].includes(next.result.status)) return next;
  return { ...previous,
    result: { ...previous.result, status: next.result.status, message: next.result.message, stale: true },
    gyms: { ...previous.gyms, status: next.gyms.status, message: next.gyms.message, stale: true },
    quests: { ...previous.quests, status: next.quests.status, message: next.quests.message, stale: true } };
}
