// Vinext's Node/Worker response bridge strips Content-Encoding. Negotiate an
// explicit gzip representation instead, so the browser never mistakes gzip
// bytes for JSON. Ordinary API clients continue receiving standard JSON.
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
  if(response.headers.get("Content-Type")?.split(";")[0]!==SNAPSHOT_GZIP)return response.json();
  if(!response.body)throw Error("压缩快照响应为空");
  const decoded=response.body.pipeThrough(new DecompressionStream("gzip"));
  return new Response(decoded).json();
}
