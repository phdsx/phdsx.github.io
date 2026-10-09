import polygonClipping from "polygon-clipping";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { Feature, MultiPolygon } from "geojson";
import { CITY, splitBounds, geometryBounds } from "./spatial";
import { inBounds, type Bounds, type Source, type RegionalSource } from "./model";

export const REGIONAL_SOURCES: RegionalSource[] = ["london","singapore","sydney","vancouver"];
export const POKEMAP_ORIGINS = {nyc:"https://nycpokemap.com",london:"https://londonpogomap.com",singapore:"https://sgpokemap.com",sydney:"https://sydneypogomap.com",vancouver:"https://vanpokemap.com"};
// Fixed operating/request windows, not published scanning coverage or city borders.
export const OPERATING_WINDOWS: Record<RegionalSource, Bounds> = {
  london:{west:-0.52,east:0.33,south:51.28,north:51.70},
  singapore:{west:103.59,east:104.10,south:1.15,north:1.48},
  sydney:{west:150.90,east:151.40,south:-34.10,north:-33.60},
  vancouver:{west:-123.30,east:-122.95,south:49.18,north:49.38},
};
export const RADAR_API = "https://pokecoords.iflowgo.com/iflowgopokecoords/api/v1";
export const RADAR_PILOTS = {radarSF:{lat:37.75694,lng:-122.40935,radiusKm:2},radarNYC:{lat:40.772124,lng:-73.965497,radiusKm:2}};
const rectangle=(b:Bounds):polygonClipping.MultiPolygon=>[[[[b.west,b.south],[b.east,b.south],[b.east,b.north],[b.west,b.north],[b.west,b.south]]]];
function circle(p:typeof RADAR_PILOTS.radarSF):polygonClipping.MultiPolygon {
  const ring:[number,number][]=[],phi=p.lat*Math.PI/180,lambda=p.lng*Math.PI/180,angle=p.radiusKm/6371;
  for(let i=0;i<=256;i++) {const a=2*Math.PI*i/256,y=Math.asin(Math.sin(phi)*Math.cos(angle)+Math.cos(phi)*Math.sin(angle)*Math.cos(a)),x=lambda+Math.atan2(Math.sin(a)*Math.sin(angle)*Math.cos(phi),Math.cos(angle)-Math.sin(phi)*Math.sin(y));ring.push([x*180/Math.PI,y*180/Math.PI]);}
  ring[ring.length-1]=ring[0];return [[ring]];
}
const regions:Partial<Record<Source,polygonClipping.MultiPolygon>>={nyc:CITY.geometry.coordinates as polygonClipping.MultiPolygon,
  ...Object.fromEntries(REGIONAL_SOURCES.map(s=>[s,rectangle(OPERATING_WINDOWS[s])])),radarSF:circle(RADAR_PILOTS.radarSF),
  radarNYC:polygonClipping.intersection(circle(RADAR_PILOTS.radarNYC),CITY.geometry.coordinates as polygonClipping.MultiPolygon)};
const windowBounds=Object.fromEntries(Object.entries(regions).map(([s,r])=>[s,geometryBounds(r!)])) as Partial<Record<Source,Bounds>>;
const feature=(coordinates:polygonClipping.MultiPolygon):Feature<MultiPolygon>=>({type:"Feature",properties:{},geometry:{type:"MultiPolygon",coordinates}});
const priority=(radarNYC:boolean):Source[]=>[...(radarNYC?["radarNYC" as const]:[]),"nyc",...REGIONAL_SOURCES,"radarSF","pgc"];
export function sourceOwns(source:Source,lng:number,lat:number,radarNYC=false) {
  for(const s of priority(radarNYC)) {
    if(s==="pgc" || inSourceWindow(s,lng,lat))return s===source;
  }
  return false;
}
export function inSourceWindow(source:Source,lng:number,lat:number) {
  if(source==="pgc" || source==="radar")return true;
  if(!inBounds({lng,lat},windowBounds[source]!))return false;
  if(REGIONAL_SOURCES.includes(source as RegionalSource))return inBounds({lng,lat},OPERATING_WINDOWS[source as RegionalSource]);
  return booleanPointInPolygon([lng,lat],feature(regions[source]!));
}
export function planSources(bounds:Bounds,radarNYC=false) {
  const out:Partial<Record<Source,Feature<MultiPolygon>>>={};
  for(const b of splitBounds(bounds)) {
    let remaining=rectangle(b);
    for(const s of priority(radarNYC)) {
      const area=s==="pgc"?remaining:polygonClipping.intersection(remaining,regions[s]!);
      if(area.length)out[s]=feature([...(out[s]?.geometry.coordinates??[]),...area] as polygonClipping.MultiPolygon);
      if(s!=="pgc")remaining=polygonClipping.difference(remaining,regions[s]!);
    }
  }
  return out;
}
export function planSingleSource(bounds:Bounds,source:Source):Feature<MultiPolygon>|null {
  const area=splitBounds(bounds).flatMap(b=>source==="pgc" || source==="radar"?rectangle(b):polygonClipping.intersection(rectangle(b),regions[source]!));
  return area.length?feature(area as polygonClipping.MultiPolygon):null;
}
export function radarUrl(source:"radarSF"|"radarNYC") {
  const p=RADAR_PILOTS[source],url=new URL(`${RADAR_API}/nearby`);
  for(const [k,v] of Object.entries({lat:p.lat,lon:p.lng,radius_km:p.radiusKm,layers:"spawns,quests",limit:800}))url.searchParams.set(k,String(v));
  return url;
}
