import { CITY, geometryBounds, withinCity } from "./spatial";
import { emptyFacilities, type FeedResult, type Gym, type Stop } from "./facilities";
import { POGOMAP_PAGE, POGOMAP_ENDPOINT, PogoMapError, pogoMapBody, parsePogoGyms, parsePogoStops } from "./pogomap";
import reference from "./pogomap-reference.json";

export const POGO_DIRECTORY_BOUNDS = geometryBounds(CITY.geometry.coordinates as Parameters<typeof geometryBounds>[0]);
// Public directory captured during source verification, explicitly labelled
// as a fixed reference. It never becomes a successful live feed or changes
// its capture timestamp on refresh. Live authorization records remain empty.
const referenceRecords = parsePogoGyms(reference.rows, POGO_DIRECTORY_BOUNDS).filter(g => withinCity(g.lng, g.lat)).map(g => ({ ...g, referenceAt: reference.capturedAt }));
export function pogoDirectoryResult(payload: unknown, fetchedAt = Date.now()): FeedResult<Gym> {
  const records = parsePogoGyms(payload, POGO_DIRECTORY_BOUNDS).filter(g => withinCity(g.lng, g.lat));
  return { ...emptyFacilities().pogoGyms, records, status: "partial", updatedAt: null, fetchedAt,
    message: "本次打开取得的纽约市社区道馆目录，不定时重取。来源未保证完整收录；社区报告队伍不是实时占领情况。" };
}
export function pogoDirectoryFailure(status: "authorization" | "rate-limit" | "error", message: string): FeedResult<Gym> {
  return { ...emptyFacilities().pogoGyms, referenceRecords, referenceAt: reference.capturedAt, status, message };
}
export const emptyStopDirectory=():FeedResult<Stop>=>({source:"pogomap",status:"idle",records:[],message:"",updatedAt:null,fetchedAt:null});
export function pogoStopResult(payload:unknown,fetchedAt=Date.now()):FeedResult<Stop> {
  return {...emptyStopDirectory(),status:"partial",records:parsePogoStops(payload,POGO_DIRECTORY_BOUNDS).filter(s=>withinCity(s.lng,s.lat)),fetchedAt,
    message:"本次打开取得的纽约市静态社区 Stop 目录，完整性未知；不代表实时任务、诱饵或火箭队。"};
}
export function pogoStopFailure(status:"authorization"|"rate-limit"|"error",message:string):FeedResult<Stop>{return {...emptyStopDirectory(),status,message};}
async function checked(response: Response) {
  if (!response.ok) {
    const challenge = response.status === 403 && /Just a moment|challenge-platform/i.test(await response.text());
    throw new PogoMapError([401,403].includes(response.status) ? "authorization" : response.status === 429 ? "rate-limit" : "error",
      challenge ? "PogoMap 需要 Cloudflare 浏览器验证（HTTP 403），网页服务无法自动更新目录" : `PogoMap 请求失败（HTTP ${response.status}）${[401,403].includes(response.status) ? "，访问被拒绝或需要授权" : ""}`);
  }
  return response;
}
async function requestPublicDirectory(kind:"gym"|"stop"): Promise<FeedResult<Gym>|FeedResult<Stop>> {
  try {
    const page = await checked(await fetch(POGOMAP_PAGE, { signal: AbortSignal.timeout(12000) }));
    // Only our freshly issued anonymous session is used. Never receive or
    // forward a visitor's cookies, account session or Cloudflare credentials.
    const cookie = page.headers.get("set-cookie")?.match(/(?:^|,\s*)PHPSESSID=([^;\s,]+)/)?.[1];
    await page.body?.cancel();
    if (!cookie) throw new PogoMapError("authorization", "PogoMap 未签发匿名会话，无法读取社区道馆目录");
    const response = await checked(await fetch(POGOMAP_ENDPOINT, { method: "POST", body: pogoMapBody(POGO_DIRECTORY_BOUNDS,kind),
      headers: { Accept: "application/json, text/javascript, */*; q=0.01", "Content-Type": "application/x-www-form-urlencoded", Referer: POGOMAP_PAGE,
        "X-Requested-With": "XMLHttpRequest", Cookie: `PHPSESSID=${cookie}` }, signal: AbortSignal.timeout(20000) }));
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new PogoMapError("error", "PogoMap 返回非 JSON 页面，无法核实道馆数据"); }
    return kind==="gym"?pogoDirectoryResult(payload):pogoStopResult(payload);
  } catch (error) {
    return (kind==="gym"?pogoDirectoryFailure:pogoStopFailure)(error instanceof PogoMapError ? error.status : "error", error instanceof Error
      ? ["TimeoutError", "AbortError"].includes(error.name) ? "PogoMap 请求超时" : error.message : "PogoMap 请求失败");
  }
}
export async function requestPogoGyms():Promise<FeedResult<Gym>>{return await requestPublicDirectory("gym") as FeedResult<Gym>;}
export async function requestPogoStops():Promise<FeedResult<Stop>>{return await requestPublicDirectory("stop") as FeedResult<Stop>;}
