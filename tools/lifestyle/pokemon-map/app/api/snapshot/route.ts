import { requestSnapshot } from "@/lib/pokemon/snapshot-provider";
import { snapshotResponse } from "@/lib/pokemon/json-response";

export async function GET(request: Request) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  console.info(`[pokemon snapshot] ${force ? "manual" : "scheduled"}`);
  return snapshotResponse(await requestSnapshot(force),request);
}
