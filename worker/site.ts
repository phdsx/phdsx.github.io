import { apiResponse, API_PREFIX } from "../tools/lifestyle/pokemon-map/deployment/api";

export default {
  async fetch(request: Request, env: { ASSETS: { fetch(request: Request): Promise<Response> } }): Promise<Response> {
    if (new URL(request.url).pathname.startsWith(API_PREFIX)) {
      try {
        return await apiResponse(request);
      } catch {
        return Response.json({ message: "数据服务暂时不可用，请稍后重试" }, { status: 502, headers: { "Cache-Control": "no-store" } });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
