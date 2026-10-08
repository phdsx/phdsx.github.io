import type { Bounds, Source, Spawn } from "./model";
import { planSources, planSingleSource, sourceOwns, inSourceWindow } from "./source-registry";

export const SOURCE_CHOICES = ["auto","nyc","radarNYC","radarSF","london","singapore","sydney","vancouver","pgc"] as const;
export type SourceChoice = typeof SOURCE_CHOICES[number];
export const SOURCE_CHOICE_STORAGE = "pokemon-map:spawn-source";
export function validSourceChoice(value:unknown):value is SourceChoice {
  return typeof value==="string" && (SOURCE_CHOICES as readonly string[]).includes(value);
}
export function selectSourceRecords(records:Spawn[],choice:SourceChoice):Spawn[] {
  return records.filter(s=>choice==="auto"?sourceOwns(s.source,s.lng,s.lat):s.source===choice && inSourceWindow(choice,s.lng,s.lat));
}
export function selectedSourcePlan(bounds:Bounds,choice:SourceChoice) {
  if(choice==="auto")return planSources(bounds);
  const region=planSingleSource(bounds,choice);
  return region?{[choice]:region}:{};
}
export const SOURCE_DESTINATIONS:Partial<Record<Source,{lng:number;lat:number;zoom:number}>>={
  nyc:{lng:-73.979,lat:40.777,zoom:14.2},radarNYC:{lng:-73.965497,lat:40.772124,zoom:15},radarSF:{lng:-122.40935,lat:37.75694,zoom:15},
  london:{lng:-0.12,lat:51.51,zoom:14},singapore:{lng:103.85,lat:1.305,zoom:14},sydney:{lng:151.205,lat:-33.875,zoom:14},vancouver:{lng:-123.12,lat:49.28,zoom:14},
};
