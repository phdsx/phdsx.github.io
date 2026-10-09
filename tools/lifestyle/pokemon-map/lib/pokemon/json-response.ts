// Vinext's Node/Worker response bridge strips Content-Encoding. Negotiate an
// explicit gzip representation instead, so the browser never mistakes gzip
// bytes for JSON. Ordinary API clients continue receiving standard JSON.
import { REFRESH_INTERVAL } from "./snapshot";

export const SNAPSHOT_GZIP = "application/vnd.pokemon.snapshot+gzip";
export function snapshotResponse(value:unknown,request:Request):Response {
  const json=JSON.stringify(value),headers=new Headers({"Cache-Control":"no-store","Content-Type":"application/json; charset=utf-8","Vary":"Accept"});
  const acceptsGzip=request.headers.get("Accept")?.split(",").some(option=>option.trim()===SNAPSHOT_GZIP);
  if(acceptsGzip && typeof CompressionStream!=="undefined") {
    headers.set("Content-Type",SNAPSHOT_GZIP);
    return new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("gzip")),{headers});
  }
  return new Response(json,{headers});
}
export async function readSnapshotResponse(response:Response):Promise<unknown> {
  let value: unknown;
  if(response.headers.get("Content-Type")?.split(";")[0]!==SNAPSHOT_GZIP)value=await response.json();
  else {
    if(!response.body)throw Error("压缩快照响应为空");
    const decoded=response.body.pipeThrough(new DecompressionStream("gzip"));
    value=await new Response(decoded).json();
  }
  if(response.headers.get("X-Pokemon-Transport")==="published")markPublishedAge(value,Date.now());
  return value;
}

function markPublishedAge(value:unknown,now:number):void {
  if(!value||typeof value!=="object")return;
  const feed=value as {records?:unknown[];fetchedAt?:number|null;stale?:boolean};
  if(Array.isArray(feed.records)) {
    if(feed.fetchedAt&&now-feed.fetchedAt>REFRESH_INTERVAL)feed.stale=true;
    return;
  }
  Object.values(value).forEach(child=>markPublishedAge(child,now));
}
