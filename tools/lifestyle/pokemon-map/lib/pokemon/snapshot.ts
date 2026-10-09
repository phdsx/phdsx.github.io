import type { Source, SourceResult } from "./model";
import type { FacilityResults } from "./facilities";
import { EXTRA_SOURCES, type ExtraFacilities } from "./extra-feeds";

export const REFRESH_INTERVAL = 5 * 60 * 1000;
export type SnapshotSource = Exclude<Source, "radar">;
export const SOURCES: SnapshotSource[] = ["nyc", "pgc", ...EXTRA_SOURCES];
export type SnapshotResults = Record<SnapshotSource, SourceResult>;
export interface Snapshot { results: SnapshotResults; facilities: FacilityResults; extraFacilities: ExtraFacilities; completedAt: number; nextUpdateAt: number; delivery?: { mode: "published"; generatedAt: number } }
export const emptyResult = (source: Source): SourceResult => ({ source, status: "idle", records: [], message: "", updatedAt: null, fetchedAt: null, coverage: "unknown" });
export const emptyResults = (): SnapshotResults => Object.fromEntries(SOURCES.map(s=>[s,emptyResult(s)])) as SnapshotResults;

// A temporary transport error must not blank a usable, previously fetched set.
// Authorization/coverage changes intentionally replace it with the new state.
export function mergeSnapshot(previous: SnapshotResults, incoming: SnapshotResults): SnapshotResults {
  return Object.fromEntries(SOURCES.map(source => {
    const next = incoming[source], old = previous[source];
    return [source, (next.status === "error" || next.status === "rate-limit") && old.fetchedAt !== null
      ? { ...next, records: old.records, updatedAt: old.updatedAt, fetchedAt: old.fetchedAt, coverageGap: old.coverageGap, stale: true }
      : next];
  })) as SnapshotResults;
}
export function countdown(nextUpdateAt: number | null, now: number) {
  const seconds = Math.max(0, Math.ceil(((nextUpdateAt ?? now) - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

// Clock-driven scheduling is separate from viewport state. Concurrent manual
// and automatic refreshes share one in-flight request.
export class SnapshotSchedule {
  nextUpdateAt: number | null = null;
  refreshing = false;
  begin() { if (this.refreshing) return false; this.refreshing = true; return true; }
  complete(now: number, nextUpdateAt = now + REFRESH_INTERVAL) { this.refreshing = false; this.nextUpdateAt = Math.max(now,nextUpdateAt); }
  due(now: number) { return !this.refreshing && this.nextUpdateAt !== null && now >= this.nextUpdateAt; }
}
