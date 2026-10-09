import type {Feature,MultiPolygon} from "geojson";
export type RegionalSource = "london" | "singapore" | "sydney" | "vancouver";
export type PokeMapSource = "nyc" | RegionalSource;
export type Source = PokeMapSource | "pgc" | "radarSF" | "radarNYC" | "radar";
export const SOURCE_NAMES: Record<Source, string> = { nyc: "NYC PokéMap", pgc: "Pokémon GO Coordinates", london: "London PoGo Map", singapore: "SG PokéMap", sydney: "Sydney PoGo Map", vancouver: "Van PokéMap", radarSF: "iFlowGo · 旧金山试点", radarNYC: "iFlowGo · 纽约试点", radar: "iFlowGo · 坐标搜索" };
export const SOURCE_TAGS: Record<Source, string> = {nyc:"NYC",pgc:"PGC",london:"London",singapore:"SG",sydney:"Sydney",vancouver:"Van",radarSF:"Radar SF",radarNYC:"Radar NYC",radar:"iFlowGo"};
export interface Bounds { west: number; east: number; south: number; north: number }
export interface Spawn {
  id: string; source: Source; rawId: string | null; name: string | null; dex: number | null;
  form: string | null; lat: number; lng: number; iv: number | null; cp: number | null;
  level: number | null; expiresAt: number | null; expiryVerified: boolean | null;
  raw: Record<string, unknown>;
}
export type RequestStatus = "idle" | "loading" | "success" | "partial" | "authorization" | "error" | "rate-limit" | "uncovered";
export interface SourceResult {
  source: Source; status: RequestStatus; records: Spawn[]; message: string;
  updatedAt: number | null; fetchedAt: number | null; coverage: "unknown" | "verified";
  retryAfter?: number; rejected?: number; coverageGap?: Feature<MultiPolygon>; stale?: boolean;
}
export interface Filters {
  query: string; dexIds: number[]; forms: string[];
  ivMin: string; ivMax: string; cpMin: string; cpMax: string;
  levelMin: string; levelMax: string; remainingMin: string; remainingMax: string;
  includeUnknown: boolean;
}
export const DEFAULT_FILTERS: Filters = { query: "", dexIds: [], forms: [], ivMin: "", ivMax: "", cpMin: "", cpMax: "", levelMin: "", levelMax: "", remainingMin: "", remainingMax: "", includeUnknown: false };
export function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : null;
}
export function timestamp(value: unknown): number | null {
  if (typeof value === "number" || (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value))) {
    const n = numeric(value); return n === null || n === 0 ? null : n < 1e12 ? n * 1000 : n;
  }
  // A timezone-free string must not be silently interpreted in the visitor's timezone.
  if (typeof value !== "string" || !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)) return null;
  const t = Date.parse(value); return Number.isFinite(t) ? t : null;
}
export function inBounds(s: Pick<Spawn, "lat" | "lng">, b: Bounds): boolean {
  return s.lat >= b.south && s.lat <= b.north && (b.west <= b.east ? s.lng >= b.west && s.lng <= b.east : s.lng >= b.west || s.lng <= b.east);
}
export function matches(s: Spawn, f: Filters, now: number): boolean {
  const q = f.query.trim().toLowerCase();
  if (q && !`${s.name ?? ""} ${s.dex ?? ""}`.toLowerCase().includes(q)) return false;
  if (f.dexIds.length && (s.dex === null || !f.dexIds.includes(s.dex))) return false;
  if (f.forms.length && !f.forms.includes(s.form ?? "未知")) return false;
  const ranges: [number | null, string, string][] = [
    [s.iv, f.ivMin, f.ivMax], [s.cp, f.cpMin, f.cpMax], [s.level, f.levelMin, f.levelMax],
    [s.expiresAt === null ? null : (s.expiresAt - now) / 60000, f.remainingMin, f.remainingMax],
  ];
  return ranges.every(([v, lo, hi]) => {
    if (lo === "" && hi === "") return true;
    if (v === null) return f.includeUnknown;
    return (lo === "" || v >= Number(lo)) && (hi === "" || v <= Number(hi));
  });
}
export function visibleRecords(records: Spawn[], bounds: Bounds, filters: Filters, now: number): Spawn[] {
  return [...new Map(records.filter(s => inBounds(s, bounds) && (s.expiresAt === null || s.expiresAt > now) && matches(s, filters, now)).map(s => [s.id, s])).values()];
}
// A newer snapshot request or unmount invalidates earlier work. Map movement
// only changes local presentation and does not invalidate the cached snapshot.
export class RequestGate {
  private revision = 0;
  private controller = new AbortController();
  invalidate() { this.controller.abort(); this.controller = new AbortController(); return ++this.revision; }
  token() { return { revision: this.revision, signal: this.controller.signal }; }
  current(revision: number) { return revision === this.revision && !this.controller.signal.aborted; }
}
