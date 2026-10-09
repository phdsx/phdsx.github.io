"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { requestRadarSnapshot } from "./radar-client";
import { emptyRadarSnapshot, mergeRadarSnapshot, type RadarQuery, type RadarSnapshot } from "./radar-search";
import { SnapshotSchedule } from "./snapshot";

export function useRadarSearch(enabled: boolean) {
  const [submitted, setSubmitted] = useState<{ query: RadarQuery; revision: number } | null>(null);
  const [snapshot, setSnapshot] = useState<RadarSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false), [now, setNow] = useState(Date.now());
  const [nextUpdateAt, setNextUpdateAt] = useState<number | null>(null);
  const refreshRef = useRef<(manual?: boolean) => Promise<void>>(async () => {});
  const search = useCallback((query: RadarQuery) => {
    setSnapshot(null); setNextUpdateAt(null);
    setSubmitted(previous => ({ query, revision: (previous?.revision ?? 0) + 1 }));
  }, []);
  const clear = useCallback(() => { setSubmitted(null); setSnapshot(null); setNextUpdateAt(null); }, []);
  useEffect(() => {
    if (!enabled || !submitted) { setRefreshing(false); setNextUpdateAt(null); return; }
    const { query } = submitted, controller = new AbortController(), schedule = new SnapshotSchedule();
    let alive = true;
    async function refresh(manual = false) {
      if (!alive || !schedule.begin()) return;
      setRefreshing(true);
      try {
        const value = await requestRadarSnapshot(query, manual, AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]));
        if (alive) setSnapshot(previous => mergeRadarSnapshot(previous, value));
      } catch (error) {
        if (!alive) return;
        const value = emptyRadarSnapshot(query);
        for (const feed of [value.result, value.gyms, value.quests]) { feed.status = "error"; feed.message = error instanceof Error ? error.message : "搜索失败，请稍后重试。"; }
        setSnapshot(previous => mergeRadarSnapshot(previous, value));
      } finally {
        if (alive) { schedule.complete(Date.now()); setNextUpdateAt(schedule.nextUpdateAt); setNow(Date.now()); setRefreshing(false); }
      }
    }
    refreshRef.current = refresh;
    void refresh(true);
    const timer = setInterval(() => { const time = Date.now(); setNow(time); if (schedule.due(time)) void refresh(); }, 1000);
    return () => { alive = false; controller.abort(); clearInterval(timer); refreshRef.current = async () => {}; };
  }, [enabled, submitted]);
  const refresh = useCallback(async (_manual = true) => { await refreshRef.current(true); }, []);
  return { snapshot, query: submitted?.query ?? null, refreshing, now, nextUpdateAt, search, clear, refresh };
}
