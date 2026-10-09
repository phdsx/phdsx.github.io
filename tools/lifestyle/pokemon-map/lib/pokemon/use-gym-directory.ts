"use client";
import { fetchApi } from "./deployment";
import { useEffect, useRef, useState } from "react";
import { emptyFacilities, type FeedResult, type Gym, type Stop } from "./facilities";
import { emptyRegionalGyms, type RegionalGyms } from "./extra-feeds";
import { REGIONAL_SOURCES } from "./source-registry";
import { readSnapshotResponse } from "./json-response";
const emptyStops=():FeedResult<Stop>=>({source:"pogomap",status:"idle",records:[],updatedAt:null,fetchedAt:null,message:""});

export function useGymData(enabled: boolean) {
  const [data, setData] = useState(() => ({ directory: emptyFacilities().pogoGyms, raids: emptyFacilities().gyms, stops:emptyStops(), regional:emptyRegionalGyms() }));
  const pending = useRef<Promise<typeof data> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setData(previous => ({ ...previous, directory: { ...previous.directory, status: "loading", message: "本次打开正在读取社区道馆目录" }, raids: { ...previous.raids, status: "loading", message: "本次打开正在读取团体战信息" },stops:{...previous.stops,status:"loading"},regional:Object.fromEntries(REGIONAL_SOURCES.map(s=>[s,{...previous.regional[s],status:"loading"}])) as RegionalGyms }));
    // Reuse even across StrictMode effect cleanup; map changes and the spawn
    // refresh button never trigger another directory request for this opening.
    async function read<T extends Gym|Stop>(url: string, source: "pogomap" | "nyc"): Promise<FeedResult<T>> {
      try {
        const response = await fetchApi(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`道馆目录读取失败（HTTP ${response.status}）`);
        const value = await readSnapshotResponse(response) as FeedResult<T>;
        if (value.source !== source || !Array.isArray(value.records)) throw new Error("道馆数据格式不合法");
        return value;
      } catch (error) {
        return { source,records:[],updatedAt:null,fetchedAt:null, status: "error" as const, message: error instanceof Error ? error.message : "道馆读取失败" };
      }
    }
    async function readRegional():Promise<RegionalGyms>{try{const response=await fetchApi("/api/regional-gyms",{cache:"no-store"});if(!response.ok)throw Error(`区域团体战读取失败（HTTP ${response.status}）`);const value=await readSnapshotResponse(response) as RegionalGyms;if(!REGIONAL_SOURCES.every(s=>value[s]?.source===s&&Array.isArray(value[s]?.records)))throw Error("区域道馆格式不合法");return value;}catch(e){return Object.fromEntries(REGIONAL_SOURCES.map(s=>[s,{...emptyRegionalGyms()[s],status:"error",message:e instanceof Error?e.message:"区域道馆读取失败"}])) as RegionalGyms;}}
    pending.current ??= Promise.all([read<Gym>("/api/gym-directory", "pogomap"), read<Gym>("/api/gym-raids", "nyc"),read<Stop>("/api/stop-directory","pogomap"),readRegional()]).then(([directory, raids,stops,regional]) => ({ directory, raids,stops,regional }));
    void pending.current.then(value => { if (alive) setData(value); });
    return () => { alive = false; };
  }, [enabled]);
  return data;
}
