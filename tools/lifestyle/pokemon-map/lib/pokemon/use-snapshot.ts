"use client";
import { fetchApi } from "./deployment";
import { useCallback, useEffect, useRef, useState } from "react";
import { RequestGate } from "./model";
import { emptyResults, mergeSnapshot, SnapshotSchedule, SOURCES, type Snapshot } from "./snapshot";
import { emptyFacilities, mergeFacilities, FACILITY_FEEDS, type FacilityResults } from "./facilities";
import { EXTRA_SOURCES,emptyExtraFacilities,mergeExtraFacilities } from "./extra-feeds";
import { SNAPSHOT_GZIP,readSnapshotResponse } from "./json-response";

export function useSpawnSnapshot(enabled: boolean) {
  const [results, setResults] = useState(emptyResults);
  const [facilities, setFacilities] = useState(emptyFacilities);
  const [extraFacilities,setExtraFacilities] = useState(emptyExtraFacilities);
  const [refreshing, setRefreshing] = useState(false), [now, setNow] = useState(Date.now());
  const [nextUpdateAt, setNextUpdateAt] = useState<number | null>(null);
  const gate = useRef(new RequestGate()), schedule = useRef(new SnapshotSchedule());
  const refresh = useCallback(async (manual = false) => {
    if (!schedule.current.begin()) return;
    gate.current.invalidate(); const token = gate.current.token();
    setRefreshing(true);
    let nextDeadline: number | undefined;
    try {
      const response = await fetchApi(`/api/snapshot${manual ? "?refresh=1" : ""}`, { signal: token.signal, cache: "no-store",headers:{Accept:typeof DecompressionStream!=="undefined"?SNAPSHOT_GZIP:"application/json"} });
      if (!response.ok) throw new Error(`数据更新失败（HTTP ${response.status}）`);
      const snapshot = await readSnapshotResponse(response) as Snapshot;
      if (!gate.current.current(token.revision)) return;
      if (!SOURCES.every(s => Array.isArray(snapshot.results?.[s]?.records))) throw new Error("数据快照格式不合法");
      if (!FACILITY_FEEDS.every(s => Array.isArray(snapshot.facilities?.[s]?.records))) throw new Error("设施快照格式不合法");
      if(!EXTRA_SOURCES.every(s=>["quests","activities"].every(k=>Array.isArray(snapshot.extraFacilities?.[s]?.[k as "quests"|"activities"]?.records))))throw new Error("补充设施快照格式不合法");
      if (Number.isFinite(snapshot.nextUpdateAt)) nextDeadline = snapshot.nextUpdateAt;
      setResults(previous => mergeSnapshot(previous, snapshot.results));
      setFacilities(previous => mergeFacilities(previous, snapshot.facilities));
      setExtraFacilities(previous=>mergeExtraFacilities(previous,snapshot.extraFacilities));
    } catch (error) {
      if (!gate.current.current(token.revision)) return;
      const message = error instanceof Error ? error.message : "数据更新失败";
      setResults(previous => mergeSnapshot(previous, Object.fromEntries(SOURCES.map(source => [source, { ...previous[source], status: "error", message }])) as typeof previous));
      setFacilities(previous => mergeFacilities(previous, Object.fromEntries(FACILITY_FEEDS.map(feed => [feed, { ...previous[feed], status: "error", message }])) as unknown as FacilityResults));
      setExtraFacilities(previous=>mergeExtraFacilities(previous,Object.fromEntries(EXTRA_SOURCES.map(s=>[s,{quests:{...previous[s].quests,status:"error",message},activities:{...previous[s].activities,status:"error",message}}])) as typeof previous));
    } finally {
      if (gate.current.current(token.revision)) {
        schedule.current.complete(Date.now(),nextDeadline); setNextUpdateAt(schedule.current.nextUpdateAt); setNow(Date.now()); setRefreshing(false);
      }
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = setInterval(() => { const t = Date.now(); setNow(t); if (schedule.current.due(t)) void refresh(); }, 1000);
    return () => { clearInterval(timer); gate.current.invalidate(); schedule.current.refreshing = false; };
  }, [enabled, refresh]);
  return { results, facilities, extraFacilities, refreshing, now, nextUpdateAt, refresh };
}
