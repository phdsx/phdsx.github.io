import { apiResponse, API_PREFIX } from "./api";
import { REFRESH_INTERVAL, type Snapshot } from "../lib/pokemon/snapshot";

export const PUBLISHED_ROUTES = ["snapshot", "gym-directory", "stop-directory", "gym-raids", "regional-gyms"] as const;
type Route = typeof PUBLISHED_ROUTES[number];

function annotate(value: unknown, now: number): void {
  if (!value || typeof value !== "object") return;
  const feed = value as { records?: unknown[]; fetchedAt?: number | null; stale?: boolean; message?: string };
  if (Array.isArray(feed.records)) {
    const message = (feed.message ?? "").replaceAll("本次打开", "采集时").replaceAll("不定时重取。", "本次页面打开不重复读取。");
    feed.message = `定时采集快照；页面打开时读取最新已发布版本。${message}`;
    if (feed.fetchedAt && now - feed.fetchedAt > REFRESH_INTERVAL) feed.stale = true;
    return;
  }
  Object.values(value).forEach(child => annotate(child, now));
}

export async function collectPublishedData(
  read: (request: Request) => Promise<Response> = apiResponse,
): Promise<Record<Route, unknown>> {
  const entries = await Promise.all(PUBLISHED_ROUTES.map(async route => {
    const response = await read(new Request(`https://snapshot.local${API_PREFIX}${route}`));
    if (!response.ok) throw new Error(`${route} 采集失败（HTTP ${response.status}）`);
    return [route, await response.json()] as const;
  }));
  const data = Object.fromEntries(entries) as Record<Route, unknown>;
  const snapshot = data.snapshot as Snapshot;
  if (!snapshot.results || !Object.values(snapshot.results).some(result => ["success", "partial"].includes(result.status))) {
    throw new Error("所有宝可梦来源均读取失败，停止发布以保留上次可用快照");
  }
  snapshot.delivery = { mode: "published", generatedAt: snapshot.completedAt };
  Object.values(data).forEach(value => annotate(value, Date.now()));
  return data;
}
