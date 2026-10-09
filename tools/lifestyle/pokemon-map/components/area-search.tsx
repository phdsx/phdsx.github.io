"use client";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { SOURCE_NAMES } from "@/lib/pokemon/model";
import { SOURCE_CHOICES, type SourceChoice } from "@/lib/pokemon/source-selection";
import { NEW_YORK_PLACES, RADAR_LAYERS, RADAR_LAYER_LABELS, radarQuery, type RadarLayer, type RadarQuery } from "@/lib/pokemon/radar-search";
import { usesBrowserRadar } from "@/lib/pokemon/radar-client";

export function AreaSearch({ source, onSource, onSearch, loading, started }: {
  source: SourceChoice; onSource: (source: SourceChoice) => void; onSearch: (query: RadarQuery) => void; loading: boolean; started: boolean;
}) {
  const [lat, setLat] = useState(""), [lng, setLng] = useState(""), [radius, setRadius] = useState("2");
  const [categories, setCategories] = useState<RadarLayer[]>([...RADAR_LAYERS]);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    try { const query = radarQuery(lat, lng, radius, categories); setError(""); onSearch(query); setExpanded(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "请检查搜索条件。"); }
  }
  return <section className={`area-search ${started && !expanded ? "collapsed" : ""}`} aria-label="按坐标搜索">
    {started && <button type="button" className="area-search-toggle" aria-expanded={expanded} aria-controls="area-search-form" onClick={() => setExpanded(value => !value)}><MapPin size={15} /><span>搜索条件 · {lat}, {lng} · {radius} km</span><strong>{expanded ? "收起" : "修改"}</strong></button>}
    <form id="area-search-form" onSubmit={submit} noValidate>
      <div className="area-search-fields">
        <label className="area-source">数据源<select aria-label="搜索数据源" value={source} onChange={event => onSource(event.target.value as SourceChoice)}>{SOURCE_CHOICES.map(choice => <option key={choice} value={choice}>{choice === "auto" ? "自动按地区选择" : SOURCE_NAMES[choice]}</option>)}</select></label>
        <label>纬度<input aria-label="搜索纬度" type="number" step="any" min={-90} max={90} placeholder="例如 40.758000" value={lat} onChange={event => setLat(event.target.value)} /></label>
        <label>经度<input aria-label="搜索经度" type="number" step="any" min={-180} max={180} placeholder="例如 -73.985500" value={lng} onChange={event => setLng(event.target.value)} /></label>
        <label className="area-radius">搜索半径<select aria-label="搜索半径" value={radius} onChange={event => setRadius(event.target.value)}>{[1, 2, 3, 5, 10, 15].map(km => <option key={km} value={km}>{km} km</option>)}</select></label>
        <fieldset className="area-categories"><legend>搜索类别</legend>{RADAR_LAYERS.map(layer => <label key={layer}><input type="checkbox" checked={categories.includes(layer)} onChange={() => setCategories(previous => previous.includes(layer) ? previous.filter(value => value !== layer) : [...previous, layer])} />{RADAR_LAYER_LABELS[layer]}</label>)}</fieldset>
        <button type="submit" className="area-search-submit" disabled={loading}><Search size={17} />{loading ? "搜索中…" : "搜索"}</button>
      </div>
      <div className="area-place-row"><span><MapPin size={14} />纽约地点</span><div className="area-places">{NEW_YORK_PLACES.map(place => <button type="button" key={place.name} title={`${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`} aria-pressed={lat === place.lat.toFixed(6) && lng === place.lng.toFixed(6)} onClick={() => { setLat(place.lat.toFixed(6)); setLng(place.lng.toFixed(6)); setError(""); }}>{place.name}<small>{place.lat.toFixed(6)}, {place.lng.toFixed(6)}</small></button>)}</div></div>
      {error && <p className="area-search-error" role="alert">{error}</p>}
      <p className="area-search-help">{!started ? "填写坐标或点击地点，再点击搜索。搜索前不获取数据。" : "修改地点、半径或类别后，点击搜索应用；自动刷新沿用上次搜索条件。"}{source === "radar" ? " 每 5 分钟刷新；筛选和移动地图使用当前结果。" : " 其他来源使用原有区域快照；半径与类别在本地筛选。"}{source === "radar" && usesBrowserRadar() && <> 查询坐标经 <a href="https://jina.ai/reader/" target="_blank" rel="noreferrer">Jina Reader</a> 转发至 iFlowGo。</>}</p>
    </form>
  </section>;
}
