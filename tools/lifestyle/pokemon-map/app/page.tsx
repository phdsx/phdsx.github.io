"use client";
import { publicAssetUrl } from "@/lib/pokemon/deployment";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as GLMap, GeoJSONSource } from "maplibre-gl";
import { Filter, RefreshCw, Search, Layers, X, Copy, MapPin, List, ExternalLink, Check, Clock, AlertCircle, Radio, SlidersHorizontal } from "lucide-react";
import { CITY, BOUNDARY_SOURCE } from "@/lib/pokemon/spatial";
import { planSources, sourceOwns, REGIONAL_SOURCES } from "@/lib/pokemon/source-registry";
import { EXTRA_SOURCES } from "@/lib/pokemon/extra-feeds";
import { SourceSettings } from "@/components/source-settings";
import { selectedSourcePlan, selectSourceRecords, SOURCE_DESTINATIONS } from "@/lib/pokemon/source-selection";
import { useSourceChoice } from "@/lib/pokemon/use-source-choice";
import { PokemonArt } from "@/components/pokemon-art";
import { pokemonArt } from "@/lib/pokemon/artwork";
import { createMapArtwork, mapArtKey, PLACEHOLDER } from "@/lib/pokemon/map-artwork";
import { DEFAULT_FILTERS, SOURCE_NAMES, SOURCE_TAGS, visibleRecords, inBounds, type Bounds, type Filters, type SourceResult, type Spawn, type Source } from "@/lib/pokemon/model";
import { SOURCES, countdown, REFRESH_INTERVAL, emptyResult } from "@/lib/pokemon/snapshot";
import { useSpawnSnapshot } from "@/lib/pokemon/use-snapshot";
import { useGymData } from "@/lib/pokemon/use-gym-directory";
import { DEFAULT_LAYERS, LAYER_LABELS, mergeStops, mergeGyms, gymDirectoryRecords, visiblePlaces, hasRocket, mapVenues, type ResultKind, type VenueSelection, type Gym } from "@/lib/pokemon/facilities";
import { addFacilityMap, gymIcon } from "@/lib/pokemon/facility-map";
import { LayerBar, FacilityStatus, GymDirectoryStatus, ResultTabs, VenueListContent, VenueDetail } from "@/components/facilities";
import { AreaSearch } from "@/components/area-search";
import { useRadarSearch } from "@/lib/pokemon/use-radar-search";
import { inRadarRadius, type RadarQuery } from "@/lib/pokemon/radar-search";
import type { SourceChoice } from "@/lib/pokemon/source-selection";

const time = (t: number | null) => t ? new Date(t).toLocaleTimeString("zh-CN", { hour12: false }) : "尚未更新";
const STATUS: Record<SourceResult["status"], string> = { idle: "等待首次更新", loading: "更新中", success: "缓存就绪", partial: "部分快照", authorization: "需要授权", error: "更新失败", "rate-limit": "来源限流", uncovered: "数据源未覆盖" };
const EMPTY = { type: "FeatureCollection" as const, features: [] };
function mapBounds(map: GLMap): Bounds {
  const b = map.getBounds(), norm = (v: number) => ((v + 180) % 360 + 360) % 360 - 180;
  return { west: norm(b.getWest()), east: norm(b.getEast()), south: Math.max(-85, b.getSouth()), north: Math.min(85, b.getNorth()) };
}
const num = (v: number | null, suffix = "") => v === null ? "未知" : `${Number(v.toFixed(2))}${suffix}`;
function expiry(s: Spawn, now: number) { if (s.expiresAt === null) return "消失时间未知"; const n = Math.max(0, Math.ceil((s.expiresAt - now) / 1000)); return `${Math.floor(n / 60)}分${String(n % 60).padStart(2, "0")}秒${s.source === "pgc" || s.source.startsWith("radar") ? "" : " · 约"}`; }
function SourceStatus({ result: r, count }: { result: SourceResult; count?: number }) {
  return <div className={`source-inline ${r.source}`} aria-label={`${SOURCE_NAMES[r.source]}数据状态`}><div><i className="source-dot" /><strong>{SOURCE_NAMES[r.source]}</strong><span className={`inline-state ${r.status}`}>{STATUS[r.status]} · {count ?? r.records.length} 条</span><time>来源 {r.updatedAt ? time(r.updatedAt) : "更新时间未知"} · 取得 {r.fetchedAt?time(r.fetchedAt):"尚未取得"}</time>{r.stale && <span className="stale-label">使用上次缓存</span>}</div>{r.message && <p>{r.message}</p>}</div>;
}
function RangeField({ name, low, high, f, update, max, min = 0 }: { name: string; low: keyof Filters; high: keyof Filters; f: Filters; update: (f: Filters) => void; max?: number; min?: number }) {
  return <div className="range-field"><span>{name}</span><div><input aria-label={`${name}最小值`} type="number" min={min} max={max} placeholder="不限" value={f[low] as string} onChange={e => update({ ...f, [low]: e.target.value })} /><span>—</span><input aria-label={`${name}最大值`} type="number" min={min} max={max} placeholder="不限" value={f[high] as string} onChange={e => update({ ...f, [high]: e.target.value })} /></div></div>;
}
export default function Home() {
  const canvas = useRef<HTMLDivElement>(null), map = useRef<GLMap | null>(null);
  const mapArtwork = useRef<ReturnType<typeof createMapArtwork> | null>(null);
  const recordsRef = useRef<Spawn[]>([]), mapDataKey = useRef<string | null>(null);
  const venueDataKey = useRef<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS), [dexText, setDexText] = useState("");
  const [selected, setSelected] = useState<Spawn | null>(null), [sort, setSort] = useState("expires"), [showList, setShowList] = useState(true), [showFilters, setShowFilters] = useState(false);
  const [layers, setLayers] = useState(DEFAULT_LAYERS), [resultKind, setResultKind] = useState<ResultKind>("pokemon"), [venueQuery, setVenueQuery] = useState("");
  const [selectedVenue, setSelectedVenue] = useState<VenueSelection | null>(null);
  const [coords, setCoords] = useState(""), [inputError, setInputError] = useState(""), [mapError, setMapError] = useState(""), [copied, setCopied] = useState(false), [loaded, setLoaded] = useState(false), [boundaryVisible, setBoundaryVisible] = useState(true);
  const {sourceChoice,chooseSource:saveSourceChoice} = useSourceChoice();
  const [legacyQuery, setLegacyQuery] = useState<RadarQuery | null>(null);
  const radarMode = sourceChoice === "radar";
  const radar = useRadarSearch(radarMode);
  const legacy = useSpawnSnapshot(loaded && legacyQuery !== null && !radarMode);
  const { facilities: dynamicFacilities, extraFacilities } = legacy;
  const results = useMemo(() => ({ ...legacy.results, radar: radar.snapshot?.result ?? emptyResult("radar") }), [legacy.results, radar.snapshot]);
  const query = radarMode ? radar.query : legacyQuery, started = query !== null;
  const loading = radarMode ? radar.refreshing : legacy.refreshing;
  const now = radarMode ? radar.now : legacy.now, nextUpdateAt = radarMode ? radar.nextUpdateAt : legacy.nextUpdateAt;
  const publishedAt = radarMode ? null : legacy.publishedAt;
  const refresh = radarMode ? radar.refresh : legacy.refresh;
  const gymData = useGymData(loaded && legacyQuery !== null && !radarMode);
  const facilities = useMemo(() => ({ ...dynamicFacilities, pogoGyms: gymData.directory, gyms: gymData.raids }), [dynamicFacilities, gymData]);
  const plan = useMemo(() => bounds ? selectedSourcePlan(bounds,sourceChoice) : null, [bounds,sourceChoice]);
  const active: Source[] = useMemo(()=>sourceChoice!=="auto"?[sourceChoice]:plan?SOURCES.filter(s=>plan[s]):[],[plan,sourceChoice]);
  const facilityPlan = useMemo(()=>bounds?planSources(bounds):null,[bounds]);
  const facilityActive: Source[] = useMemo(()=>radarMode?["radar"]:facilityPlan?SOURCES.filter(s=>facilityPlan[s]):[],[facilityPlan,radarMode]);
  const manualOutside = sourceChoice!=="auto" && bounds!==null && !plan?.[sourceChoice];
  const ownedRecords = useMemo(() => radarMode ? results.radar.records : selectSourceRecords(SOURCES.flatMap(s => results[s].records),sourceChoice), [results,sourceChoice,radarMode]);
  const records = useMemo(()=>query ? ownedRecords.filter(s=>(s.expiresAt===null||s.expiresAt>now) && inRadarRadius(s,query)) : [],[ownedRecords,now,query]);
  const filtered = useMemo(() => bounds ? visibleRecords(records, bounds, filters, now) : [], [records, bounds, filters, now]);
  const displayedSpawns = useMemo(() => layers.pokemon ? filtered : [], [filtered, layers.pokemon]);
  const allStops = useMemo(() => !query ? [] : (radarMode ? mergeStops(radar.snapshot?.quests.records ?? [],[]) : mergeStops([...facilities.quests.records,...EXTRA_SOURCES.filter(s=>s!=="radarNYC").flatMap(s=>extraFacilities[s].quests.records)].filter(s=>sourceOwns(s.source as Spawn["source"],s.lng,s.lat)),[...facilities.activities.records,...EXTRA_SOURCES.flatMap(s=>extraFacilities[s].activities.records)].filter(s=>sourceOwns(s.source as Spawn["source"],s.lng,s.lat)),gymData.stops.records)).filter(s=>inRadarRadius(s,query)), [query,radarMode,radar.snapshot,facilities.quests.records, facilities.activities.records,extraFacilities,gymData.stops.records]);
  const allGyms = useMemo(() => !query ? [] : (radarMode ? (radar.snapshot?.gyms.records ?? []).filter(s=>s.raid.endsAt===null||s.raid.endsAt>now) : mergeGyms(gymDirectoryRecords(facilities.pogoGyms), [...facilities.gyms.records,...REGIONAL_SOURCES.flatMap(s=>gymData.regional[s].records)].filter(s=>sourceOwns(s.source as Spawn["source"],s.lng,s.lat)))).filter(s=>inRadarRadius(s,query)), [query,radarMode,radar.snapshot,now,facilities.pogoGyms, facilities.gyms.records,gymData.regional]);
  const venueGyms = useMemo(() => visiblePlaces(allGyms, bounds, venueQuery), [allGyms, bounds, venueQuery]);
  const venueStops = useMemo(() => visiblePlaces(allStops, bounds, venueQuery), [allStops, bounds, venueQuery]);
  const rocketStops = useMemo(() => venueStops.filter(s => hasRocket(s, now)), [venueStops, now]);
  const venues = useMemo(() => mapVenues(venueGyms, venueStops, layers, now), [venueGyms, venueStops, layers, now]);
  const counts: Record<ResultKind, number> = { pokemon: displayedSpawns.length, gym: layers.gym ? venueGyms.length : 0, stop: layers.stop ? venueStops.length : 0, rocket: layers.rocket ? rocketStops.length : 0 };
  const selectedVenueRecord = selectedVenue?.kind === "gym" ? layers.gym ? venueGyms.find(s => s.id === selectedVenue.id) : null
    : selectedVenue?.kind === "rocket" ? layers.rocket ? rocketStops.find(s => s.id === selectedVenue.id) : null
    : selectedVenue?.kind === "stop" && layers.stop ? venueStops.find(s => s.id === selectedVenue.id) : null;
  const viewportRecords = useMemo(() => bounds ? records.filter(s => inBounds(s,bounds)) : [], [records,bounds]);
  const sorted = useMemo(() => [...displayedSpawns].sort((a, b) => { const av = sort === "iv" ? a.iv : sort === "cp" ? a.cp : a.expiresAt, bv = sort === "iv" ? b.iv : sort === "cp" ? b.cp : b.expiresAt; return av === null ? bv === null ? a.id.localeCompare(b.id) : 1 : bv === null ? -1 : sort === "expires" ? av - bv : bv - av; }), [displayedSpawns, sort]);
  const species = useMemo(() => [...new Map(records.filter(s => s.dex !== null).map(s => [s.dex!, s.name])).entries()].sort((a, b) => a[0] - b[0]), [records]);
  const forms = useMemo(() => [...new Set([...records.map(s => s.form ?? "未知"), ...filters.forms])].sort(), [records, filters.forms]);
  const filterCount = Object.entries(filters).filter(([k, v]) => k !== "includeUnknown" && (Array.isArray(v) ? v.length : !!v)).length;
  const successful = active.length > 0 && active.every(s => ["success","partial"].includes(results[s].status));
  const unavailable = active.some(s => ["authorization","error","rate-limit","uncovered"].includes(results[s].status));
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const gl = await import("maplibre-gl"); if (!alive || !canvas.current) return;
        gl.setWorkerUrl(publicAssetUrl("maplibre-gl-worker.mjs"));
        const instance = new gl.Map({ container: canvas.current, center: [-73.979, 40.777], zoom: 14.2, minZoom: 2, maxZoom: 18, renderWorldCopies: false, attributionControl: { compact: true }, style: { version: 8, glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf", sources: { basemap: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>' } }, layers: [{ id: "basemap", type: "raster", source: "basemap" }] } });
        map.current = instance; instance.addControl(new gl.NavigationControl({ showCompass: false }), "bottom-right");
        instance.on("load", () => {
          if (!alive) return;
          instance.addSource("nyc-boundary", { type: "geojson", data: CITY });
          instance.addLayer({ id: "nyc-fill", type: "fill", source: "nyc-boundary", paint: { "fill-color": "#008d91", "fill-opacity": 0.025 } });
          instance.addLayer({ id: "nyc-outline", type: "line", source: "nyc-boundary", paint: { "line-color": "#008d91", "line-width": 2, "line-dasharray": [3, 2] } });
          instance.addSource("coverage-gaps", {type:"geojson",data:EMPTY});
          instance.addLayer({id:"coverage-gaps",type:"fill",source:"coverage-gaps",paint:{"fill-color":"#c56c33","fill-opacity":0.2}});
          addFacilityMap(instance, selection => { setSelectedVenue(selection); setSelected(null); setCopied(false); });
          instance.addSource("spawns", { type: "geojson", data: EMPTY, cluster: true, clusterRadius: 38, clusterMaxZoom: 15 });
          instance.addLayer({ id: "clusters", type: "circle", source: "spawns", filter: ["has", "point_count"], paint: { "circle-color": "#113e47", "circle-radius": 21, "circle-stroke-color": "#fff", "circle-stroke-width": 3 } });
          instance.addLayer({ id: "cluster-count", type: "symbol", source: "spawns", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Semibold"], "text-size": 14 }, paint: { "text-color": "#fff" } });
          mapArtwork.current = createMapArtwork(instance);
          instance.addLayer({ id: "points", type: "circle", source: "spawns", filter: ["!", ["has", "point_count"]], paint: { "circle-color": "#ffffff", "circle-radius": 25, "circle-stroke-color": ["match", ["get", "source"], "nyc", "#008d91", "#7959c2"], "circle-stroke-width": 2 } });
          instance.addLayer({ id: "point-artwork", type: "symbol", source: "spawns", filter: ["!", ["has", "point_count"]], layout: { "icon-image": ["coalesce", ["image", ["get", "image"]], ["image", PLACEHOLDER]], "icon-size": 1, "icon-allow-overlap": true, "icon-ignore-placement": true } });
          instance.on("click", "points", e => { const id = instance.queryRenderedFeatures(e.point, { layers: ["points"] })[0]?.properties?.id; setSelected(recordsRef.current.find(s => s.id === id) ?? null); setSelectedVenue(null); });
          instance.on("click", "clusters", async e => { const f = instance.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0]; if (!f || f.geometry.type !== "Point") return; const z = await (instance.getSource("spawns") as GeoJSONSource).getClusterExpansionZoom(Number(f.properties.cluster_id)); instance.easeTo({ center: f.geometry.coordinates as [number, number], zoom: z }); });
          for (const layer of ["points", "clusters"]) { instance.on("mouseenter", layer, () => { instance.getCanvas().style.cursor = "pointer"; }); instance.on("mouseleave", layer, () => { instance.getCanvas().style.cursor = ""; }); }
          setLoaded(true); setBounds(mapBounds(instance));
        });
        instance.on("moveend", () => { setBounds(mapBounds(instance)); });
        instance.on("error", e => { if (!instance.loaded()) setMapError(e.error?.message ?? "地图底图加载失败"); });
      } catch (error) { setMapError(error instanceof Error ? error.message : "地图无法加载"); }
    })();
    return () => { alive = false; mapArtwork.current?.dispose(); mapArtwork.current = null; map.current?.remove(); map.current = null; mapDataKey.current = null; venueDataKey.current = null; };
  }, []);
  useEffect(() => { recordsRef.current = displayedSpawns; const source = map.current?.getSource("spawns") as GeoJSONSource | undefined; if (!source) return; const key = displayedSpawns.map(s => `${s.id}:${s.lng}:${s.lat}:${mapArtKey(s)}`).join("|"); if (mapDataKey.current !== key) { mapDataKey.current = key; mapArtwork.current?.ensure(displayedSpawns); source.setData({ type: "FeatureCollection", features: displayedSpawns.map(s => ({ type: "Feature", geometry: { type: "Point", coordinates: [s.lng, s.lat] }, properties: { id: s.id, source: s.source, image: mapArtKey(s) } })) }); } if (selected) { const current = displayedSpawns.find(s => s.id === selected.id) ?? null; if (current !== selected) setSelected(current); } }, [displayedSpawns, selected, loaded]);
  useEffect(() => {
    const source = map.current?.getSource("venues") as GeoJSONSource | undefined; if (!source) return;
    const key = venues.map(({kind,record:r}) => `${kind}:${r.id}:${r.lng}:${r.lat}:${"team" in r ? r.team : ""}`).join("|");
    if (venueDataKey.current === key) return; venueDataKey.current = key;
    source.setData({type:"FeatureCollection",features:venues.map(({kind,record:r})=>({type:"Feature",geometry:{type:"Point",coordinates:[r.lng,r.lat]},properties:{id:r.id,kind,icon:kind==="gym"?gymIcon((r as Gym).team):`venue-${kind}`}}))});
  }, [venues,loaded]);
  useEffect(() => { if (selectedVenue && !selectedVenueRecord) setSelectedVenue(null); }, [selectedVenue, selectedVenueRecord]);
  useEffect(()=>{const source=map.current?.getSource("coverage-gaps") as GeoJSONSource|undefined;source?.setData({type:"FeatureCollection",features:active.flatMap(s=>results[s].coverageGap?[results[s].coverageGap!]:[])});},[results,loaded,active]);
  useEffect(() => { map.current?.resize(); }, [showList, showFilters]);
  useEffect(() => { if (!loaded || !canvas.current) return; const observer = new ResizeObserver(() => map.current?.resize()); observer.observe(canvas.current); return () => observer.disconnect(); }, [loaded]);
  useEffect(() => {
    if (!loaded || !query || !map.current) return;
    const dy = query.radiusKm / 111.2, dx = Math.min(180, dy / Math.max(0.01, Math.cos(query.lat * Math.PI / 180)));
    const clamp = (lat: number) => Math.max(-85, Math.min(85, lat));
    map.current.fitBounds([[query.lng - dx, clamp(query.lat - dy)], [query.lng + dx, clamp(query.lat + dy)]], { padding: 55, maxZoom: 15, duration: 700 });
  }, [loaded, query]);
  useEffect(() => { for (const id of ["nyc-fill", "nyc-outline"]) if (map.current?.getLayer(id)) map.current.setLayoutProperty(id, "visibility", boundaryVisible ? "visible" : "none"); }, [boundaryVisible, loaded]);
  function reset() { setFilters({ ...DEFAULT_FILTERS }); setDexText(""); }
  function chooseSource(choice: SourceChoice) {
    saveSourceChoice(choice); setLegacyQuery(null); radar.clear(); setSelected(null); setSelectedVenue(null);
    setResultKind("pokemon"); setLayers({ ...DEFAULT_LAYERS, rocket: choice !== "radar" });
  }
  function searchArea(next: RadarQuery) {
    setSelected(null); setSelectedVenue(null); setInputError("");
    setLayers({ pokemon: next.layers.includes("spawns"), gym: next.layers.includes("raids"), stop: next.layers.includes("quests"), rocket: !radarMode && next.layers.includes("quests") });
    setResultKind(next.layers.includes("spawns") ? "pokemon" : next.layers.includes("raids") ? "gym" : "stop");
    if (radarMode) radar.search(next);
    else { setLegacyQuery(next); if (legacyQuery) void legacy.refresh(true); }
  }
  function jump(lng: number, lat: number, zoom: number) { map.current?.flyTo({ center: [lng, lat], zoom, duration: 700 }); setShowFilters(false); }
  function focusSpawn(spawn: Spawn) {
    setSelected(spawn); setSelectedVenue(null); setCopied(false);
    const instance = map.current;
    instance?.flyTo({ center: [spawn.lng, spawn.lat], zoom: Math.max(instance.getZoom(), 17), duration: 700 });
  }
  function goCoordinates(e: React.FormEvent) { e.preventDefault(); const parts = coords.split(/[,，]/), [lat, lng] = parts.map(Number); if (parts.length !== 2 || parts.some(p => !p.trim()) || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) { setInputError("请输入有效的纬度,经度"); return; } setInputError(""); jump(lng, lat, 14); }
  async function copy(s: {lat:number;lng:number}) { try { await navigator.clipboard.writeText(`${s.lat.toFixed(6)},${s.lng.toFixed(6)}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setInputError("浏览器未允许复制坐标"); } }
  function toggleLayer(kind: ResultKind) { const next = {...layers,[kind]:!layers[kind]}; setLayers(next); if (!next[resultKind]) setResultKind((Object.keys(next) as ResultKind[]).find(k=>next[k])??"pokemon"); }
  function changeResultKind(kind: ResultKind) { setResultKind(kind); setLayers(previous=>({...previous,[kind]:true})); }
  function toggleDex(id: number) { const ids = filters.dexIds.includes(id) ? filters.dexIds.filter(n => n !== id) : [...filters.dexIds, id]; setFilters({ ...filters, dexIds: ids }); setDexText(ids.join(",")); }
  return <main className="app-shell">
    <header className="app-header"><div className="brand"><span className="brand-icon"><MapPin size={23} /></span><div><h1>宝可梦视野地图</h1><span>Pokémon viewport explorer</span></div></div><form className="coordinate-search" onSubmit={goCoordinates}><Search size={17} /><input aria-label="纬度,经度跳转" placeholder="输入纬度,经度跳转" value={coords} onChange={e => setCoords(e.target.value)} /><button type="submit">前往</button></form><div className="header-actions"><button className="filter-toggle" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><SlidersHorizontal size={17} />筛选{filterCount > 0 && <b>{filterCount}</b>}</button><button className="icon-button" aria-label="显示或隐藏结果列表" onClick={() => setShowList(!showList)} aria-pressed={showList}><List size={20} /></button><button className="refresh-button" aria-label={publishedAt !== null ? "读取最新快照" : "手动刷新数据"} onClick={() => void refresh(true)} disabled={!started || loading}><RefreshCw size={16} className={loading ? "spinning" : ""} />{publishedAt !== null ? "读取最新快照" : "刷新数据"}</button></div></header>
    <AreaSearch source={sourceChoice} onSource={chooseSource} onSearch={searchArea} loading={loading} started={started} />
    <section className="data-bar" aria-label="数据更新状态"><div className="update-summary"><Clock size={16} /><span>{!started ? "等待搜索" : loading ? nextUpdateAt === null ? "正在搜索" : "正在后台更新" : nextUpdateAt === null ? "等待搜索" : publishedAt !== null ? "下次检查" : "下次更新"}</span><strong className="update-countdown" aria-label="数据更新倒计时">{!started ? "—" : loading ? "…" : nextUpdateAt === null ? "—" : countdown(nextUpdateAt, now)}</strong><span className="cache-total">缓存 {radarMode ? records.length + allGyms.length + allStops.length : records.length} 条 · {publishedAt !== null ? "定时快照" : "5 分钟更新"}</span></div><div className="source-status-list">{active.map(source => <SourceStatus key={source} count={source === "radar" ? records.length + allGyms.length + allStops.length : undefined} result={{...results[source],records:results[source].records.filter(s => s.expiresAt === null || s.expiresAt > now)}} />)}{manualOutside&&<p className="manual-source-notice" role="status">当前视野超出所选来源的已接入范围，可在数据源设置中前往该来源范围。</p>}</div></section>
    {publishedAt !== null && <p className={`published-notice ${now - publishedAt > REFRESH_INTERVAL ? "outdated" : ""}`} role="status">定时快照 · 采集于 {new Date(publishedAt).toLocaleString("zh-CN", { hour12: false })}。每 5 分钟检查最新版本；采集和发布可能延迟。{now - publishedAt > REFRESH_INTERVAL ? " 当前快照较早，到期记录已自动移除。" : ""}刷新按钮读取最新已发布快照。</p>}
    <div className="map-options"><LayerBar layers={layers} counts={counts} onToggle={toggleLayer} radar={radarMode}/>{!radarMode && <FacilityStatus facilities={facilities} nyc={facilityActive.includes("nyc")} pgc={facilityActive.includes("pgc")}/>}<SourceSettings results={results} extra={extraFacilities} gyms={gymData.regional} stops={gymData.stops} active={active} facilityActive={facilityActive} sourceChoice={sourceChoice} onSourceChoice={chooseSource} outside={manualOutside} onViewSource={source=>{const d=SOURCE_DESTINATIONS[source];if(d)jump(d.lng,d.lat,d.zoom);}}/></div>
    {inputError && <div className="input-error" role="alert">{inputError}<button aria-label="关闭提示" onClick={() => setInputError("")}><X size={16} /></button></div>}
    <div className={`workspace ${showList ? "" : "list-hidden"}`}>
      {showFilters && <button className="drawer-backdrop" aria-label="关闭筛选" onClick={() => setShowFilters(false)} />}
      <aside className={`filters-panel ${showFilters ? "open" : ""}`} aria-label="统一筛选条件"><div className="panel-title"><h2><Filter size={17} />筛选条件{filterCount > 0 && <span className="small-badge">{filterCount}</span>}</h2><button onClick={reset}>重置</button><button className="mobile-close icon-button" aria-label="关闭筛选" onClick={() => setShowFilters(false)}><X size={18} /></button></div><div className="filter-scroll">
        <label className="field-label" htmlFor="pokemon-search">宝可梦</label><div className="field-search"><Search size={16} /><input id="pokemon-search" placeholder="名称或图鉴编号" value={filters.query} onChange={e => setFilters({ ...filters, query: e.target.value })} /></div><label className="field-label" htmlFor="dex-ids">图鉴编号多选</label><input className="full-input" id="dex-ids" placeholder="例如 25, 149, 610" value={dexText} onChange={e => { setDexText(e.target.value); setFilters({ ...filters, dexIds: [...new Set(e.target.value.split(/[,，\s]+/).filter(Boolean).map(Number).filter(n => Number.isInteger(n) && n > 0))] }); }} />
        {species.length > 0 && <div className="species-chips">{species.slice(0, 12).map(([id, name]) => <button key={id} title={name ?? "未知"} className={filters.dexIds.includes(id) ? "chosen" : ""} onClick={() => toggleDex(id)}><PokemonArt pokemon={{dex:id,name,form:null}} size="chip" /><span>#{id}</span></button>)}</div>}
        <div className="filter-section"><h3>个体与战斗属性</h3><RangeField name="IV (%)" low="ivMin" high="ivMax" f={filters} update={setFilters} max={100} /><RangeField name="CP" low="cpMin" high="cpMax" f={filters} update={setFilters} /><RangeField name="等级" low="levelMin" high="levelMax" f={filters} update={setFilters} min={1} max={50} /></div><div className="filter-section"><h3>存在时间</h3><RangeField name="剩余时间 (分钟)" low="remainingMin" high="remainingMax" f={filters} update={setFilters} /></div><div className="filter-section"><h3>形态多选</h3>{forms.length ? <div className="form-chips">{forms.map(form => <button key={form} className={filters.forms.includes(form) ? "chosen" : ""} onClick={() => setFilters({ ...filters, forms: filters.forms.includes(form) ? filters.forms.filter(s => s !== form) : [...filters.forms, form] })}>{form}</button>)}</div> : <p className="muted">取得记录后显示可选形态</p>}</div><label className="unknown-toggle"><input type="checkbox" checked={filters.includeUnknown} onChange={e => setFilters({ ...filters, includeUnknown: e.target.checked })} /><span>数值筛选包含未知值</span></label><p className="filter-note">不同条件同时满足。同一多选项满足任一项。移动地图保留筛选条件。</p>
        <details className="source-details"><summary>数据与覆盖说明</summary><p>宝可梦、任务和站点活动每 5 分钟更新；道馆和静态 Stop 在打开页面时读取一次。缩放、拖动和筛选只使用缓存。纽约按行政边界裁剪；新增城市按固定请求窗口分区；iFlowGo 坐标搜索在点击搜索后按所选中心和半径查询宝可梦、团体战、任务，每 5 分钟刷新；固定 Radar 模式为 2 km 试点；PGC 使用公开数据流，精确坐标锁定时无法展示。来源与覆盖限制见“数据源设置”。</p><p>纽约市行政边界来自 NYC Open Data，包含水域。它不代表 NYC PokéMap 的扫描覆盖。</p><p>来源未公开完整扫描边界，覆盖范围暂未确认。无记录区域不能据此认定已覆盖或没有出现。</p><p>配图来自 PokéAPI 图鉴资源。地区形态已匹配时显示对应配图；形态未知或未收录时显示图鉴示意，具体以来源记录为准。图片加载失败显示“暂无配图”。地图问号表示配图暂不可用，数量圆圈表示聚合记录。</p><a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noreferrer">宝可梦配图来源<ExternalLink size={12} /></a><p>已锁定的坐标不会绘制。缺失字段显示“未知”。NYC 消失时间为近似值，IV/CP 适用于等级 30 及以上训练家。</p><a href={BOUNDARY_SOURCE} target="_blank" rel="noreferrer">纽约市边界<ExternalLink size={12} /></a><a href="https://nycpokemap.com/" target="_blank" rel="noreferrer">NYC PokéMap<ExternalLink size={12} /></a><a href="https://pokemongocoordinates.com/pokemongomap/" target="_blank" rel="noreferrer">Pokémon GO Coordinates<ExternalLink size={12} /></a></details><form className="mobile-coordinates" onSubmit={goCoordinates}><label className="field-label" htmlFor="mobile-coords">跳转至坐标</label><input id="mobile-coords" className="full-input" placeholder="纬度,经度" value={coords} onChange={e => setCoords(e.target.value)} /><button type="submit">前往</button></form>
      </div><div className="filter-footer"><Radio size={14} />视野与筛选使用本地缓存</div></aside>
      <section className="map-panel" aria-label="宝可梦地图"><div ref={canvas} className="map-canvas" />{!loaded && <div className="map-loading">{mapError ? <><AlertCircle size={25} /><strong>地图加载失败</strong><p>{mapError}</p></> : <><Layers size={28} /><strong>正在加载地图</strong></>}</div>}<div className="map-top"><div className="region-bar"><span className="viewport-label"><i className="live-dot" />{sourceChoice!=="auto" ? `${SOURCE_NAMES[sourceChoice]} · 手动` : active.length > 1 ? `混合视野 · ${active.length} 个来源分区` : active.length ? SOURCE_NAMES[active[0]] : "读取当前视野"}</span><button onClick={() => setBoundaryVisible(!boundaryVisible)} aria-pressed={boundaryVisible} aria-label="显示或隐藏城市边界"><Layers size={15} /><span>城市边界</span></button></div><nav className="map-shortcuts" aria-label="地图范围快捷跳转"><button onClick={() => jump(-73.979, 40.777, 14.2)}>纽约市内</button><button onClick={() => jump(-74.071, 40.728, 14)}>纽约市外</button><button onClick={() => jump(-74.032, 40.728, 12.5)}>跨边界</button><button onClick={() => jump(-0.12,51.51,14)}>伦敦</button><button onClick={() => jump(103.85,1.305,14)}>新加坡</button><button onClick={() => jump(151.205,-33.875,14)}>悉尼</button><button onClick={() => jump(-123.12,49.28,14)}>温哥华</button><button onClick={() => jump(-122.40935,37.75694,15)}>旧金山试点</button></nav></div><div className="map-bottom"><div className="map-legend"><span><i className="nyc" />NYC</span><span><i className="pgc" />其他来源</span><span><i className="boundary" />纽约市边界</span></div><div className="bounds-caption">{bounds ? `${bounds.south.toFixed(4)}, ${bounds.west.toFixed(4)} / ${bounds.north.toFixed(4)}, ${bounds.east.toFixed(4)}` : ""}</div></div>
        {selected && <article className="detail-card" aria-label="宝可梦详情"><button className="detail-close icon-button" aria-label="关闭详情" onClick={() => setSelected(null)}><X size={18} /></button><div className="detail-heading"><PokemonArt key={selected.id} pokemon={selected} size="detail" /><div><h3>{selected.name ?? "未知"}</h3><span>#{selected.dex ?? "?"} · {selected.form ?? "形态未知"}</span><p className="art-note">{pokemonArt(selected).note}</p></div></div><div className="detail-stats"><div><span>IV</span><strong>{num(selected.iv, "%")}</strong></div><div><span>CP</span><strong>{num(selected.cp)}</strong></div><div><span>等级</span><strong>{num(selected.level)}</strong></div></div><div className="detail-time"><Clock size={15} />{expiry(selected, now)}</div><div className="detail-coords"><span>{selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}</span><button onClick={() => copy(selected)}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "已复制" : "复制"}</button></div><p className="detail-source">来源：{SOURCE_NAMES[selected.source]}<br />原始 ID：{selected.rawId ?? "未知（使用坐标与消失时间去重）"}</p></article>}
        {selectedVenue && selectedVenueRecord && <VenueDetail kind={selectedVenue.kind} record={selectedVenueRecord} now={now} onClose={()=>setSelectedVenue(null)} onCopy={()=>void copy(selectedVenueRecord)} copied={copied} fetchedAt={selectedVenueRecord.source==="pogomap"?facilities.pogoGyms.fetchedAt:null}/>}
      </section>
      {showList && <aside className="results-panel" aria-label="当前视野结果列表">
        <div className="results-heading"><div><h2>当前视野</h2>{resultKind==="pokemon"?<p>已加载 <strong>{viewportRecords.length}</strong> 条 · 符合筛选 <strong>{counts.pokemon}</strong> 条</p>:<p>{radarMode && resultKind === "gym" ? "团体战" : radarMode && resultKind === "stop" ? "补给站任务" : LAYER_LABELS[resultKind]} <strong>{counts[resultKind]}</strong> 个地点</p>}</div><button className="icon-button" aria-label="收起结果列表" onClick={() => setShowList(false)}><X size={17}/></button></div>
        <ResultTabs kind={resultKind} counts={counts} onChange={changeResultKind} radar={radarMode}/>
        <div className="results-body" role="region" aria-label="结果内容" tabIndex={0}>
        {!radarMode&&resultKind==="gym"&&(facilityActive.includes("nyc")||facilityActive.every(s=>s==="pgc"))&&<GymDirectoryStatus directory={facilities.pogoGyms} bounds={bounds} nyc={facilityActive.includes("nyc")}/>}
        {resultKind==="pokemon"?<>
          <div className="results-toolbar"><span>{loading ? "后台更新，保留缓存" : "当前缓存的记录"}</span><label>排序<select aria-label="结果排序" value={sort} onChange={e => setSort(e.target.value)}><option value="expires">消失时间</option><option value="iv">IV 从高到低</option><option value="cp">CP 从高到低</option></select></label></div>
          <div className="result-scroll">{sorted.length ? sorted.map(s => <button key={s.id} className={`spawn-row ${selected?.id === s.id ? "selected" : ""}`} onClick={() => focusSpawn(s)}><PokemonArt pokemon={s}/><div className="spawn-info"><div className="spawn-title"><strong>{s.name ?? "未知"}</strong><span className={`source-tag ${s.source}`}>{SOURCE_TAGS[s.source]}</span></div><p><span className="dex-label">#{s.dex ?? "?"}</span> · {s.form ?? "形态未知"}</p><div className="spawn-stats"><span>IV <b>{num(s.iv, "%")}</b></span><span>CP <b>{num(s.cp)}</b></span><span>Lv <b>{num(s.level)}</b></span></div><span className="spawn-expiry"><Clock size={12}/>{expiry(s, now)}</span></div></button>) : <div className="empty-state">{loading ? <RefreshCw size={30} className="spinning"/> : successful ? <MapPin size={32}/> : <AlertCircle size={32}/>}<strong>{!started?"选择地点后开始搜索":!layers.pokemon?"宝可梦图层已隐藏":manualOutside ? "当前视野超出所选来源的已接入范围" :loading && !records.length ? "正在取得首次快照" : unavailable && !viewportRecords.length ? "此来源的数据尚不可用" : "当前视野没有符合条件的记录"}</strong><p>{!started ? "输入经纬度或点击上方纽约地点，再点击搜索。" : manualOutside ? "打开数据源设置，前往此来源范围，或选择其他来源。" : loading && !records.length ? "取得后，缩放和筛选都直接使用缓存" : unavailable && !viewportRecords.length ? "查看上方来源状态；可在来源可用后手动刷新。" : "缩放、移动或调整筛选直接更新显示，无需重新获取。"}</p>{filterCount > 0 && <button onClick={reset}>清空筛选</button>}</div>}</div><footer className="results-footer"><span>视野内 {counts.pokemon} 条</span><span>到期记录自动移除</span></footer>
        </>:<VenueListContent kind={resultKind} gyms={layers.gym?venueGyms:[]} stops={resultKind==="rocket"?layers.rocket?rocketStops:[]:layers.stop?venueStops:[]} query={venueQuery} onQuery={setVenueQuery} now={now} nyc={radarMode || facilityActive.some(s=>s!=="pgc")} status={radarMode ? (resultKind === "gym" ? radar.snapshot?.gyms.status : radar.snapshot?.quests.status) ?? "idle" : resultKind==="gym"?facilities.gyms.status:resultKind==="rocket"?facilities.activities.status:facilities.quests.status} selectedId={selectedVenue?.id??null} onSelect={record=>{setSelectedVenue({kind:resultKind,id:record.id});setSelected(null);setCopied(false);}}/>}
        </div>
      </aside>}
    </div>
  </main>;
}

