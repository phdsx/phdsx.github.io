import { requestGymRaids } from "@/lib/pokemon/facility-provider";

export async function GET() {
  return Response.json(await requestGymRaids(), { headers: { "Cache-Control": "no-store" } });
}
