import type { Source } from "./model";
import type { FeedResult, Gym, StopQuest, StopActivity } from "./facilities";
import { REGIONAL_SOURCES } from "./source-registry";
export const EXTRA_SOURCES = [...REGIONAL_SOURCES,"radarSF","radarNYC"] as const;
export type ExtraSource = typeof EXTRA_SOURCES[number];
export interface ExtraFeeds { quests: FeedResult<StopQuest>; activities: FeedResult<StopActivity> }
export type ExtraFacilities = Record<ExtraSource, ExtraFeeds>;
export type RegionalGyms = Record<typeof REGIONAL_SOURCES[number], FeedResult<Gym>>;
export const blankFeed = <T>(source:Source):FeedResult<T>=>({source,status:"idle",records:[],updatedAt:null,fetchedAt:null,message:""});
export function emptyExtraFacilities():ExtraFacilities {
  return Object.fromEntries(EXTRA_SOURCES.map(s=>[s,{quests:blankFeed<StopQuest>(s),activities:blankFeed<StopActivity>(s)}])) as ExtraFacilities;
}
export const emptyRegionalGyms=():RegionalGyms=>Object.fromEntries(REGIONAL_SOURCES.map(s=>[s,blankFeed<Gym>(s)])) as RegionalGyms;
export function mergeFeed<T>(old:FeedResult<T>,next:FeedResult<T>):FeedResult<T> {
  return ["error","rate-limit"].includes(next.status)&&old.fetchedAt!==null?{...next,records:old.records,updatedAt:old.updatedAt,fetchedAt:old.fetchedAt,stale:true}:next;
}
export function mergeExtraFacilities(previous:ExtraFacilities,incoming:ExtraFacilities):ExtraFacilities {
  return Object.fromEntries(EXTRA_SOURCES.map(s=>[s,{quests:mergeFeed(previous[s].quests,incoming[s].quests),activities:mergeFeed(previous[s].activities,incoming[s].activities)}])) as ExtraFacilities;
}
