import { requestSnapshot } from "../lib/pokemon/snapshot-provider";
import { requestPogoGyms, requestPogoStops } from "../lib/pokemon/pogomap-provider";
import { requestGymRaids } from "../lib/pokemon/facility-provider";
import { requestRegionalGyms } from "../lib/pokemon/extra-provider";
import { snapshotResponse } from "../lib/pokemon/json-response";

export const API_PREFIX = "/tools/lifestyle/pokemon-map/api/";
const directoryCache = new Map<string, { until: number; result: Promise<unknown> }>();
function directory(kind: "gym" | "stop") {
  const old = directoryCache.get(kind);
  if (old && old.until > Date.now()) return old.result;
  const result = kind === "gym" ? requestPogoGyms() : requestPogoStops();
  directoryCache.set(kind, { until: Date.now() + 60000, result });
  return result;
}

export async function apiResponse(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const route = url.pathname.split("/api/")[1];
  const headers = { "Cache-Control": "no-store" };
  if (request.method !== "GET") return Response.json({ message: "仅支持 GET" }, { status: 405, headers: { ...headers, Allow: "GET" } });
  switch (route) {
    case "snapshot": return snapshotResponse(await requestSnapshot(url.searchParams.get("refresh") === "1"), request);
    case "gym-directory": return Response.json(await directory("gym"), { headers });
    case "stop-directory": return Response.json(await directory("stop"), { headers });
    case "gym-raids": return Response.json(await requestGymRaids(), { headers });
    case "regional-gyms": return Response.json(await requestRegionalGyms(), { headers });
    default: return Response.json({ message: "接口不存在" }, { status: 404, headers });
  }
}
