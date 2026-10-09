import names from "./names.json";
import forms from "./forms.json";
import { numeric, timestamp, type Source, type Spawn, type PokeMapSource } from "./model";
type Raw = Record<string, unknown>;
const nameLookup=names as Record<string,string>;
const formLookup=forms as Record<string,string>;
function str(v: unknown) { return v === undefined || v === null || v === "" ? null : String(v); }
function coord(v: unknown) {if(v===undefined || v===null || v==="")return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function point(lat: unknown,lng: unknown) {
  const y=coord(lat),x=coord(lng); return y!==null && x!==null && y>=-90 && y<=90 && x>=-180 && x<=180 ? {lat:y,lng:x}:null;
}
function recordId(source: Source, rawId: string | null, dex: number | null, form: string | null, lat: number, lng: number, expiresAt: number | null) {
  return `${source}:${rawId ?? `derived:${dex ?? "unknown"}:${form ?? "unknown"}:${lat.toFixed(8)}:${lng.toFixed(8)}:${expiresAt ?? "unknown"}`}`;
}
export function adaptNYC(raw: Raw, source: PokeMapSource = "nyc"): Spawn | null {
  const p=point(raw.lat,raw.lng); if(!p)return null;
  const dex=numeric(raw.pokemon_id);
  const rawId=str(raw.encounter_id ?? raw.id ?? raw.unique_id);
  // `m` changed between identical requests during verification; it is not a stable encounter ID.
  const stats=[numeric(raw.attack),numeric(raw.defence),numeric(raw.stamina)];
  const iv=stats.every(x=>x!==null && x<=15) ? Number(((stats.reduce<number>((a,x)=>a+(x??0),0)/45)*100).toFixed(2)) : null;
  const form=formLookup[String(raw.form)] ?? null;
  const expiresAt=timestamp(raw.despawn);
  return {id:recordId(source,rawId,dex,form,p.lat,p.lng,expiresAt),source,rawId,name:str(raw.name)??nameLookup[String(dex)]??null,dex,form,...p,iv,cp:numeric(raw.cp),level:numeric(raw.level),expiresAt,expiryVerified:null,raw};
}
export function adaptRadar(raw: Raw, source: "radarSF" | "radarNYC" | "radar"): Spawn | null {
  const p=point(raw.lat,raw.lon),dex=numeric(raw.pokemon_id);
  // Preserve long provider IDs as strings; reject numbers that already lost precision.
  const rawId=typeof raw.id==="string" && raw.id.trim()?raw.id:typeof raw.id==="number" && Number.isSafeInteger(raw.id)?String(raw.id):null;
  if(!p || dex===null || !rawId)return null;
  const expiresAt=timestamp(raw.expires_at),iv=numeric(raw.percent_iv);
  return {...p,id:recordId(source,rawId,dex,null,p.lat,p.lng,expiresAt),source,rawId,dex,name:nameLookup[String(dex)]??null,form:null,
    cp:numeric(raw.cp),iv:iv!==null&&iv<=100?iv:null,level:numeric(raw.level),expiresAt,expiryVerified:null,raw};
}
export function adaptPGC(raw: Raw): Spawn | null {
  if(raw.coordinates_locked===true || raw.coordinates_locked===1 || raw.coordinates_locked==="true")return null;
  const p=point(raw.lat ?? raw.latitude,raw.lon ?? raw.lng ?? raw.longitude);if(!p)return null;
  const dex=numeric(raw.pokemon_id ?? raw.Pokedex ?? raw.Dex);
  const rawId=str(raw.provider_unique_id ?? raw.encounter_id ?? raw.id);
  const form=str(raw.form ?? raw.Form) ?? formLookup[String(raw.form_id)] ?? null;
  const expiresAt=timestamp(raw.expires_at_utc ?? raw.expire_at_utc ?? raw.despawn_at_utc);
  return {id:recordId("pgc",rawId,dex,form,p.lat,p.lng,expiresAt),source:"pgc",rawId,name:str(raw.pokemon_name ?? raw["Pokemon Name"])??nameLookup[String(dex)]??null,dex,form,...p,iv:numeric(raw.iv ?? raw.IV),cp:numeric(raw.cp ?? raw.CP),level:numeric(raw.lvl ?? raw.level ?? raw.LVL),expiresAt,expiryVerified:typeof raw.disappear_time_verified === "boolean"?raw.disappear_time_verified:null,raw};
}
export function parsePayload(source: Source, payload: unknown) {
  if(!payload || typeof payload!=="object" || Array.isArray(payload))throw Error("响应格式不符合已核实的数据结构");
  const data=payload as Raw;
  const radar=source==="radarSF"||source==="radarNYC"||source==="radar";
  const rows=source==="pgc"?data.rows:radar?data.spawns:data.pokemons;
  if(!Array.isArray(rows))throw Error("响应缺少出现记录数组");
  const locked=source==="pgc" && data.coordinates_locked===true;
  let rejected=0;
  const records: Spawn[]=[];
  for(const row of rows){
    if(!row || typeof row!=="object" || Array.isArray(row)){rejected++;continue;}
    const s=locked?null:source==="pgc"?adaptPGC(row):radar?adaptRadar(row,source):adaptNYC(row,source as PokeMapSource);
    if(s)records.push(s);else rejected++;
  }
  if(!locked && rows.length && !records.length)throw Error("出现记录全部未通过字段与坐标验证");
  const meta=data.meta as Raw|undefined;
  // Radar generated_at is a response timestamp, not the scanner's observation time.
  return {records,locked,rejected,updatedAt:radar?null:timestamp(source==="pgc"?data.generated_at:meta?.time),partial:rejected>0 || rows.length>=500 && source==="pgc" || radar && rows.length>=800 || !!data.next_cursor, count:rows.length};
}
