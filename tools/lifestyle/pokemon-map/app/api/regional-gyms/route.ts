import { requestRegionalGyms } from "@/lib/pokemon/extra-provider";
export async function GET(){return Response.json(await requestRegionalGyms(),{headers:{"Cache-Control":"no-store"}});}
