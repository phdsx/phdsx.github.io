import { apiResponse, API_PREFIX } from "../tools/lifestyle/pokemon-map/deployment/api";
import { videoApiResponse, VIDEO_API_PREFIX } from "./bilibili.mjs";
import { mediaGateway, MEDIA_API_PREFIX } from "./video-gateway.mjs";

export default {
  async fetch(request: Request, env: { ASSETS: { fetch(request: Request): Promise<Response> }; BILIBILI_SESSION_SECRET?: string; VIDEO_SERVICE_URL?: string; VIDEO_SERVICE_KEY?: string }): Promise<Response> {
    if (new URL(request.url).pathname.startsWith(MEDIA_API_PREFIX)) return mediaGateway(request,env);
    if (new URL(request.url).pathname.startsWith(VIDEO_API_PREFIX)) return videoApiResponse(request, fetch, env);
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
