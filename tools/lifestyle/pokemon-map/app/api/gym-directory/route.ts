import { requestPogoGyms } from "@/lib/pokemon/pogomap-provider";

// Public hosted fallback. Local Windows previews use the same source via the
// standard Windows HTTP transport in the Vite middleware.
export async function GET() {
  return Response.json(await requestPogoGyms(), { headers: { "Cache-Control": "no-store" } });
}
