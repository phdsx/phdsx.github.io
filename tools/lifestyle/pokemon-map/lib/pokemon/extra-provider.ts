import { parsePayload } from "./adapters";
import { adaptGym,adaptQuest,adaptActivity,questCatalog,readRows } from "./facility-adapters";
import { timestamp, type RegionalSource, type SourceResult } from "./model";
import type { FeedResult, Gym, StopQuest, StopActivity } from "./facilities";
import { EXTRA_SOURCES,blankFeed,emptyRegionalGyms,type ExtraSource,type ExtraFeeds,type ExtraFacilities } from "./extra-feeds";
import { REGIONAL_SOURCES,POKEMAP_ORIGINS,OPERATING_WINDOWS,radarUrl,inSourceWindow } from "./source-registry";
import { emptyResult,REFRESH_INTERVAL } from "./snapshot";
type Raw=Record<string,unknown>;
class UpstreamError extends Error {constructor(public status:"authorization"|"rate-limit"|"error",message:string){super(message);}}
const lastRequest=new Map<string,number>();
async function publicJSON(url:URL,referer:string,key:string):Promise<unknown> {
  const wait=2000-(Date.now()-(lastRequest.get(key)??0));if(wait>0)await new Promise(r=>setTimeout(r,wait));lastRequest.set(key,Date.now());
  const response=await fetch(url,{headers:{Accept:"application/json",Referer:referer},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new UpstreamError([401,403].includes(response.status)?"authorization":response.status===429?"rate-limit":"error",`来源请求失败（HTTP ${response.status}）${[401,403].includes(response.status)?"，访问被拒绝或需要授权":""}`);
  try{return await response.json();}catch{throw Error("来源返回非 JSON 页面，无法核实记录");}
}
const failure=(e:unknown)=>({status:e instanceof UpstreamError?e.status:"error" as const,message:e instanceof Error?["TimeoutError","AbortError"].includes(e.name)?"来源请求超时":e.message:"来源读取失败"});
export function regionalSpawnUrl(source:RegionalSource) {
  const b=OPERATING_WINDOWS[source],u=new URL(`${POKEMAP_ORIGINS[source]}/query2.php`);
  for(const [k,v] of Object.entries({bounds:`${b.west},${b.east},${b.south},${b.north}`,since:0,mons:"",time:Date.now()}))u.searchParams.set(k,String(v));return u;
}
export function regionalFacilityUrl(source:RegionalSource,feed:"gyms"|"quests"|"activities",quests:string[]=[]) {
  const url=new URL(`${POKEMAP_ORIGINS[source]}/${feed==="gyms"?"raids":feed==="activities"?"pokestop":"quests"}.php`);url.searchParams.set("time",String(Date.now()));
  for(const q of quests)url.searchParams.append("quests[]",q);return url;
}
export async function regionalFeed<T extends Gym|StopQuest|StopActivity>(source:RegionalSource,feed:"gyms"|"quests"|"activities"):Promise<FeedResult<T>> {
  const base=blankFeed<T>(source),key=`${source}:${feed}`,referer=`${POKEMAP_ORIGINS[source]}/${feed==="gyms"?"gym":feed==="activities"?"pokestop":"quest"}.html`;
  try{
    let payload=await publicJSON(regionalFacilityUrl(source,feed),referer,key),partial=false;
    if(feed==="quests"){const catalog=questCatalog(payload);partial=catalog.partial;if(catalog.values.length)payload=await publicJSON(regionalFacilityUrl(source,feed,catalog.values),referer,key);}
    const parsed=readRows(payload,feed==="gyms"?"raids":feed==="activities"?"invasions":"quests"),adapter=feed==="gyms"?adaptGym:feed==="quests"?adaptQuest:adaptActivity;
    const adapted=parsed.rows.map(raw=>adapter(raw,source));
    if(adapted.length&&adapted.every(r=>r===null))throw Error("设施记录全部未通过字段与坐标验证");
    const records=[...new Map(adapted.filter(r=>r && inSourceWindow(source,r.lng,r.lat)).map(r=>[r!.id,r!])).values()] as T[];
    return {...base,records,status:"partial",updatedAt:parsed.updatedAt,fetchedAt:Date.now(),message:`固定城市请求窗口内的报告，扫描覆盖与完整性未知。${feed==="gyms"?"本次打开读取一次。":""}${partial||adapted.some(r=>r===null)?"部分选项或记录未通过核实。":""}`};
  }catch(e){return {...base,...failure(e)};}
}
export function radarQuests(payload:unknown,source:"radarSF"|"radarNYC"):FeedResult<StopQuest> {
  const base=blankFeed<StopQuest>(source),data=payload as Raw;
  if(!data || !Array.isArray(data.quests))throw Error("Radar 响应缺少任务数组");
  const records:StopQuest[]=[];let rejected=0;
  for(const value of data.quests){
    if(!value || typeof value!=="object" || Array.isArray(value)){rejected++;continue;}
    const r=value as Raw,lat=r.lat==null?NaN:Number(r.lat),lng=r.lon==null?NaN:Number(r.lon),rawId=typeof r.id==="string"?r.id:typeof r.id==="number"&&Number.isSafeInteger(r.id)?String(r.id):null;
    if(!rawId || !Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){rejected++;continue;}
    if(!inSourceWindow(source,lng,lat))continue;
    records.push({id:`${source}:quest:${rawId}`,source,rawId,name:typeof r.pokestop_name==="string"?r.pokestop_name:null,lat,lng,
      description:typeof r.quest_title==="string"?r.quest_title:null,reward:Array.isArray(r.quest_rewards)?JSON.stringify(r.quest_rewards):null,expiresAt:null,raw:r});
  }
  if(data.quests.length && rejected===data.quests.length)throw Error("Radar 任务全部未通过字段与坐标验证");
  return {...base,records:[...new Map(records.map(r=>[r.id,r])).values()],status:"partial",updatedAt:null,fetchedAt:Date.now(),message:`2 km 试点，完整扫描覆盖未知；任务标题和奖励保留来源字段。${data.quests.length>=800?"任务达到 800 条上限，存在截断。":""}${rejected?`拒绝 ${rejected} 条异常任务。`:""}`};
}
interface Bundle { result:SourceResult; facilities:ExtraFeeds }
const cached=new Map<ExtraSource,{until:number;bundle:Bundle}>(),pending=new Map<ExtraSource,Promise<Bundle>>();
async function fetchBundle(source:ExtraSource):Promise<Bundle> {
  const radar=source==="radarSF"||source==="radarNYC",facilities:ExtraFeeds={quests:blankFeed(source),activities:blankFeed(source)};
  if(radar)facilities.activities={...facilities.activities,status:"uncovered",message:"Radar 未提供已核实的火箭队 / 站点活动接口"};
  const spawnTask=(async()=>{
    try{
      const payload=await publicJSON(radar?radarUrl(source):regionalSpawnUrl(source),radar?"https://pokecoords.iflowgo.com/":`${POKEMAP_ORIGINS[source]}/`,`${source}:spawns`),parsed=parsePayload(source,payload);
      if(radar){try{facilities.quests=radarQuests(payload,source);}catch(e){facilities.quests={...facilities.quests,...failure(e)};}}
      const records=[...new Map(parsed.records.filter(r=>inSourceWindow(source,r.lng,r.lat)&&(r.expiresAt===null||r.expiresAt>Date.now())).map(r=>[r.id,r])).values()];
      return {...emptyResult(source),records,status:"partial" as const,updatedAt:parsed.updatedAt,fetchedAt:Date.now(),rejected:parsed.rejected,
        message:radar?`2 km 固定试点，扫描覆盖未知。${parsed.count>=800?"已达到 800 条上限，当前快照被截断。":"未达到上限也不代表完整覆盖。"}响应生成 ${timestamp((payload as Raw).generated_at)?new Date(timestamp((payload as Raw).generated_at)!).toLocaleTimeString("zh-CN",{hour12:false}):"时间未知"}；观测更新时间未知。`:`固定城市请求窗口；扫描覆盖与完整性未知。${parsed.rejected?`拒绝 ${parsed.rejected} 条异常记录。`:""}`};
    }catch(e){if(radar)facilities.quests={...facilities.quests,...failure(e)};return {...emptyResult(source),...failure(e)};}
  })();
  if(!radar){const [quests,activities]=await Promise.all([regionalFeed<StopQuest>(source,"quests"),regionalFeed<StopActivity>(source,"activities")]);facilities.quests=quests;facilities.activities=activities;}
  return {result:await spawnTask,facilities};
}
export async function requestExtraSource(source:ExtraSource,force=false):Promise<Bundle> {
  const old=cached.get(source),now=Date.now();if(old&&((!force&&old.until>now)||now-(lastRequest.get(`${source}:spawns`)??0)<2000))return old.bundle;
  const inFlight=pending.get(source);if(inFlight)return inFlight;
  const task=fetchBundle(source);pending.set(source,task);try{const bundle=await task;cached.set(source,{until:Date.now()+REFRESH_INTERVAL,bundle});return bundle;}finally{pending.delete(source);}
}
export async function requestExtraSources(force=false) {
  const bundles=await Promise.all(EXTRA_SOURCES.map(async s=>[s,await requestExtraSource(s,force)] as const));
  return {results:Object.fromEntries(bundles.map(([s,b])=>[s,b.result])),facilities:Object.fromEntries(bundles.map(([s,b])=>[s,b.facilities])) as ExtraFacilities};
}
let gymPending:Promise<ReturnType<typeof emptyRegionalGyms>>|null=null,gymCache:ReturnType<typeof emptyRegionalGyms>|null=null,gymAt=0;
export async function requestRegionalGyms(){
  if(gymPending)return gymPending;if(gymCache&&Date.now()-gymAt<60000)return gymCache;
  gymPending=(async()=>{const entries=await Promise.all(REGIONAL_SOURCES.map(async s=>[s,await regionalFeed<Gym>(s,"gyms")] as const));gymCache=Object.fromEntries(entries) as ReturnType<typeof emptyRegionalGyms>;gymAt=Date.now();return gymCache;})();
  try{return await gymPending;}finally{gymPending=null;}
}
