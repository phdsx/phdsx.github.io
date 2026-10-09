import { radarQuery } from "@/lib/pokemon/radar-search";
import { requestRadarSearch } from "@/lib/pokemon/radar-provider";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  let query;
  try {
    query = radarQuery(params.get("lat") ?? "", params.get("lon") ?? "", params.get("radius_km") ?? "", (params.get("layers") ?? "").split(",").filter(Boolean));
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "搜索参数不合法" }, { status: 400 });
  }
  return Response.json(await requestRadarSearch(query, params.get("refresh") === "1"), { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } });
}
