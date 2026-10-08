import { requestPogoStops } from "@/lib/pokemon/pogomap-provider";
export async function GET(){return Response.json(await requestPogoStops(),{headers:{"Cache-Control":"no-store"}});}
