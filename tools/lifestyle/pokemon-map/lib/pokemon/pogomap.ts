import { inBounds, type Bounds } from "./model";
import type { Gym, Stop } from "./facilities";

export const POGOMAP_PAGE = "https://www.pogomap.info/";
export const POGOMAP_ENDPOINT = "https://www.pogomap.info/includes/it150nmsq9.php";
export const POGOMAP_REFERENCE = "https://www.pogomap.info/location/40,772124/-73,965497/14";
export class PogoMapError extends Error {
  constructor(public status: "authorization" | "rate-limit" | "error", message: string) { super(message); }
}
export function pogoMapLink(bounds: Bounds | null, zoom = 14) {
  if (!bounds) return POGOMAP_REFERENCE;
  const lat = ((bounds.north + bounds.south) / 2).toFixed(6).replace(".", ",");
  const midpoint = bounds.west <= bounds.east ? (bounds.west + bounds.east) / 2 : (bounds.west + bounds.east + 360) / 2;
  const lng = (((midpoint + 180) % 360 + 360) % 360 - 180).toFixed(6).replace(".", ",");
  return `${POGOMAP_PAGE}location/${lat}/${lng}/${Math.max(14, Math.min(18, Math.round(zoom)))}`;
}
export function pogoMapBody(bounds: Bounds, kind: "gym" | "stop" = "gym") {
  // Actual form fields from mapsys649.js. This fixed directory request is
  // independent of the visitor's viewport, filters and enabled layers.
  return new URLSearchParams({ fromlat: String(bounds.south), tolat: String(bounds.north), fromlng: String(bounds.west), tolng: String(bounds.east),
    fpoke: kind === "stop" ? "1" : "0", fgym: kind === "gym" ? "1" : "0", farm: "0", fpstop: "0", nests: "0", priv: "0", raids: "0", sponsor: "0", usermarks: "0", ftasks: "0",
    viewdel: "0", voteonly: "0", modonly: "0", agedonly: "0", modnone: "0", showonly: "0", routesonly: "0" });
}
function decode(value: unknown): string | null {
  if (typeof value !== "string" || !value || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;
  try { return atob(value); } catch { return null; }
}
export function adaptPogoGym(raw: Record<string, unknown>): Gym | null {
  const rawId = decode(raw.zfgs62), classification = decode(raw.xgxg35);
  if (!rawId || !/^\d+$/.test(rawId) || classification !== "2" || String(raw.poke_enabled) !== "2") return null;
  const latitude = decode(raw.z3iafj), longitude = decode(raw.f24sfvs);
  if (!latitude || !longitude || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null;
  // These transport transformations are copied from the public map script;
  // extras-v3.js defines stringpad.spadding as base64 and scrollzoom=1.852.
  const lat = Number(latitude) / (10.62 / 12) * 1.91 * Number(rawId) / 1.852 / 1e6;
  const lng = Number(longitude) / 1.5935 * 1.952 * Number(rawId) / 1.852 / 1e6;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const flag = (v: unknown) => ["0", "1"].includes(String(v)) ? String(v) === "1" : null;
  const team = decode(raw.g74jsdg), slug = typeof raw.rgqaca === "string" ? raw.rgqaca : null;
  return { id: `pogomap:gym:${rawId}`, source: "pogomap", rawId, name: typeof raw.rfs21d === "string" && raw.rfs21d.trim() ? raw.rfs21d : null, lat, lng,
    team: null, raid: { dex: null, name: null, form: null, cp: null, tier: null, startsAt: null, endsAt: null },
    community: { elite: flag(raw.exraid_status), sponsored: ["0", "1", "2"].includes(String(raw.sponsor_status)) ? String(raw.sponsor_status) !== "0" : null,
      verified: flag(raw.verified), reportedTeam: ({ "1": "蓝队 Mystic", "2": "红队 Valor", "3": "黄队 Instinct", "4": "无队伍" } as Record<string, string>)[team ?? ""] ?? null,
      url: slug ? `${POGOMAP_PAGE}gym/${encodeURIComponent(slug)}/${rawId}` : pogoMapLink({ west: lng, east: lng, south: lat, north: lat }) }, raw };
}
export function adaptPogoStop(raw:Record<string,unknown>):Stop|null {
  if(decode(raw.xgxg35)!=="1")return null;
  // Both classifications use the same published coordinate transport.
  const point=adaptPogoGym({...raw,xgxg35:btoa("2")});if(!point)return null;
  return {id:`pogomap:stop:${point.rawId}`,source:"pogomap",rawId:point.rawId,name:point.name,lat:point.lat,lng:point.lng,quests:[],activities:[],
    directory:{raw,url:pogoMapLink({west:point.lng,east:point.lng,south:point.lat,north:point.lat})}};
}
export function parsePogoStops(payload:unknown,bounds:Bounds):Stop[] {
  if(!payload || typeof payload!=="object" || Array.isArray(payload))throw new PogoMapError("error","PogoMap Stop 返回格式不合法");
  const data=payload as Record<string,unknown>;
  if(String(data.spam)==="1")throw new PogoMapError(String(data.spamtype)==="2"?"authorization":"rate-limit","PogoMap Stop 匿名读取被拒绝或限流");
  const records:Stop[]=[];let invalid=0,outside=0;
  for(const [id,value] of Object.entries(data)) {
    if(["maxclusters","maxclustersclose"].includes(id))continue;
    if(!value || typeof value!=="object" || Array.isArray(value)){invalid++;continue;}
    const raw=value as Record<string,unknown>;
    if(decode(raw.xgxg35)!=="1" || String(raw.poke_enabled)!=="2")continue;
    const point=adaptPogoStop(raw);if(!point || point.rawId!==id){invalid++;continue;}
    if(!inBounds(point,bounds)){outside++;continue;}records.push(point);
  }
  if(invalid || outside>Math.max(2,records.length*0.05) || outside>0&&!records.length)throw new PogoMapError("error","PogoMap Stop 坐标或记录格式未通过核实，未绘制异常位置");
  return [...new Map(records.map(p=>[p.id,p])).values()];
}
export function parsePogoGyms(payload: unknown, bounds: Bounds) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new PogoMapError("error", "PogoMap 返回格式不合法");
  const data = payload as Record<string, unknown>;
  if (String(data.spam) === "1") throw new PogoMapError(String(data.spamtype) === "2" ? "authorization" : "rate-limit",
    String(data.spamtype) === "2" ? "PogoMap 匿名会话失效，需要重新建立会话；未取得道馆目录" : "PogoMap 请求限流，等待下一次更新或稍后手动刷新");
  const records: Gym[] = []; let invalid = 0, outside = 0;
  for (const [id, value] of Object.entries(data)) {
    if (["maxclusters", "maxclustersclose"].includes(id)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) { invalid++; continue; }
    const raw = value as Record<string, unknown>;
    if (decode(raw.xgxg35) !== "2") continue; // Stops, nests and other POIs are not gyms.
    if (String(raw.poke_enabled) !== "2") continue;
    const record = adaptPogoGym(raw);
    if (!record || record.rawId !== id) { invalid++; continue; }
    if (!inBounds(record, bounds)) { outside++; continue; }
    records.push(record);
  }
  // Previously observed incompatible responses decoded every coordinate
  // outside the requested region. Do not shift/repair them or mark success.
  if (invalid || outside > Math.max(2, records.length * 0.05) || (outside > 0 && records.length === 0)) throw new PogoMapError("error", "PogoMap 坐标或记录格式未通过核实，未绘制异常位置");
  return [...new Map(records.map(g => [g.id, g])).values()];
}
