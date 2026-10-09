"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { assetUrl } from "./deployment";
import { emptyRadarSnapshot, mergeRadarSnapshot, type RadarQuery, type RadarSnapshot } from "./radar-search";
import { SnapshotSchedule } from "./snapshot";

export function radarApiUrl(query: RadarQuery, manual = false): string {
  const configured = typeof document === "undefined" ? "" : document.querySelector<HTMLMetaElement>('meta[name="pokemon-radar-api-origin"]')?.content.trim();
  const url = configured ? new URL("/tools/lifestyle/pokemon-map/api/radar-search", configured) : new URL(assetUrl("api/radar-search"), "http://localhost");
  url.search = new URLSearchParams({ lat: String(query.lat), lon: String(query.lng), radius_km: String(query.radiusKm), layers: query.layers.join(","), ...(manual ? { refresh: "1" } : {}) }).toString();
  return url.href;
}

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
        const response = await fetch(radarApiUrl(query, manual), { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]), cache: "no-store", credentials: "omit", headers: { Accept: "application/json" } });
        if (response.status === 404 || response.headers.get("Content-Type")?.includes("text/html")) throw new Error("当前站点未连接坐标搜索服务。纯 GitHub Pages 需配置支持实时查询的数据服务；静态快照无法查询任意坐标。");
        if (!response.ok) throw new Error(`搜索失败（HTTP ${response.status}）`);
        const value = await response.json() as RadarSnapshot;
        if (value.result?.source !== "radar" || !Array.isArray(value.result.records) || !Array.isArray(value.gyms?.records) || !Array.isArray(value.quests?.records)) throw new Error("坐标搜索响应格式不合法。");
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
