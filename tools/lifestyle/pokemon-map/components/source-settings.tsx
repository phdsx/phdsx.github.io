"use client";
import { ExternalLink } from "lucide-react";
import { SOURCE_NAMES, SOURCE_TAGS, type Source } from "@/lib/pokemon/model";
import { SOURCE_CHOICES, SOURCE_DESTINATIONS, type SourceChoice } from "@/lib/pokemon/source-selection";
import { SOURCES, type SnapshotResults } from "@/lib/pokemon/snapshot";
import { POKEMAP_ORIGINS, OPERATING_WINDOWS, REGIONAL_SOURCES } from "@/lib/pokemon/source-registry";
import type { ExtraFacilities, RegionalGyms } from "@/lib/pokemon/extra-feeds";
import type { FeedResult, Stop } from "@/lib/pokemon/facilities";
const state:Record<string,string>={idle:"等待首次读取",loading:"读取中",success:"缓存就绪",partial:"部分快照",error:"请求失败",authorization:"访问被拒绝 / 需要授权","rate-limit":"来源限流",uncovered:"数据源未覆盖"};
const clock=(n:number|null)=>n?new Date(n).toLocaleTimeString("zh-CN",{hour12:false}):"未知";
export function SourceSettings({results,extra,gyms,stops,active,facilityActive,sourceChoice,onSourceChoice,onViewSource,outside}:{results:SnapshotResults;extra:ExtraFacilities;gyms:RegionalGyms;stops:FeedResult<Stop>;active:Source[];facilityActive:Source[];sourceChoice:SourceChoice;onSourceChoice:(v:SourceChoice)=>void;onViewSource:(source:Source)=>void;outside:boolean}) {
  return <details className="source-settings"><summary>数据源设置 <span>{sourceChoice==="auto"?`自动 · ${active.length} 个当前启用`:`手动 · ${SOURCE_TAGS[sourceChoice]}`}</span></summary><div className="source-settings-body">
    <div className="source-choice-control"><label htmlFor="pokemon-source-choice">宝可梦数据源</label><select id="pokemon-source-choice" value={sourceChoice} onChange={e=>onSourceChoice(e.target.value as SourceChoice)}>{SOURCE_CHOICES.map(s=><option key={s} value={s}>{s==="auto"?"自动按地区选择":SOURCE_NAMES[s]}</option>)}</select>{sourceChoice!=="auto"&&SOURCE_DESTINATIONS[sourceChoice]&&<button onClick={e=>{onViewSource(sourceChoice);const details=e.currentTarget.closest("details");if(details)details.open=false;}}>前往此来源范围</button>}</div>
    <p className="source-choice-help">{sourceChoice==="auto"?"自动模式根据整个地图视野按地区分配来源，纽约市默认使用 NYC。":"手动模式只使用所选宝可梦来源；移动地图保留选择，不自动换源。"}选择会记住，切换保留筛选条件。此设置仅用于宝可梦，Gym、Stop 和火箭队仍按所在地区展示。</p>
    {outside&&<p className="source-choice-outside" role="status">当前视野超出所选来源的已接入范围。可前往此来源范围，或选择其他来源。</p>}
    {sourceChoice.startsWith("radar")&&<p>iFlowGo 目前只接入所选城市的固定 2 km 试点；不代表完整城市或全球覆盖。纽约试点模式只显示 iFlowGo 宝可梦，不叠加 NYC。</p>}
    <p>伦敦、新加坡、悉尼、温哥华按固定城市请求窗口接入；旧金山为 2 km Radar 试点。窗口是本网页的请求范围，扫描覆盖尚未确认；没有记录不代表没有宝可梦。自动模式在窗口外使用 PGC 的公开数据流，锁定精确坐标时明确停用显示。</p>
    <div className="source-registry-list">{SOURCES.map(s=>{const r=results[s],regional=REGIONAL_SOURCES.includes(s as typeof REGIONAL_SOURCES[number]),b=regional?OPERATING_WINDOWS[s as typeof REGIONAL_SOURCES[number]]:null;return <section key={s} className={active.includes(s)?"source-current":""}><strong>{SOURCE_NAMES[s]}{active.includes(s)&&<small>{sourceChoice==="auto"?"当前视野":"已选择"}</small>}</strong><div><span className={`inline-state ${r.status}`}>{state[r.status]} · {r.records.length} 条缓存</span><small>来源更新 {clock(r.updatedAt)} · 取得 {clock(r.fetchedAt)}{r.stale?" · 使用上次缓存":""}</small></div>{b&&<small>请求窗口：{b.south}, {b.west} 至 {b.north}, {b.east}（非扫描边界）</small>}{r.message&&<p>{r.message}</p>}<a href={s==="pgc"?"https://pokemongocoordinates.com/pokemongomap/":s.startsWith("radar")?"https://pokecoords.iflowgo.com/":`${POKEMAP_ORIGINS[s as keyof typeof POKEMAP_ORIGINS]}/`} target="_blank" rel="noreferrer">来源网站<ExternalLink size={12}/></a></section>;})}</div>
    <h3>补充设施来源</h3><p>区域团体战和 PogoMap 静态 Stop 目录在本次打开时读取一次；区域任务、火箭队活动每五分钟更新。Radar 未核实非空团体战响应，本次不接入 Radar 团体战；也没有已核实的火箭队接口。</p>
    <div className="extra-feed-status">{REGIONAL_SOURCES.filter(s=>facilityActive.includes(s)).flatMap(s=>[[`${SOURCE_NAMES[s]} · 团体战`,gyms[s]],[`${SOURCE_NAMES[s]} · 任务`,extra[s].quests],[`${SOURCE_NAMES[s]} · 活动`,extra[s].activities]] as const).concat(facilityActive.includes("radarSF")?[["iFlowGo SF · 任务",extra.radarSF.quests]]:[]).map(([label,r])=><section key={label}><strong>{label}</strong><span className={`inline-state ${r.status}`}>{state[r.status]} · {r.records.length} 条</span><small>来源更新 {clock(r.updatedAt)} · 取得 {clock(r.fetchedAt)}{r.stale?" · 使用上次缓存":""}</small>{r.message&&<p>{r.message}</p>}</section>)}</div>
    <section className="static-stop-status"><strong>PogoMap.info · 纽约静态 Stop</strong><span className={`inline-state ${stops.status}`}>{state[stops.status]} · {stops.records.length} 条</span><small>来源更新 {clock(stops.updatedAt)} · 取得 {clock(stops.fetchedAt)}</small>{stops.message&&<p>{stops.message}</p>}</section>
  </div></details>;
}
