import polygonClipping from "polygon-clipping";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import boundary from "./nyc-boundary.json";
import type { Bounds, Source } from "./model";

type Coordinates = polygonClipping.MultiPolygon;
// Shared borough edges contain different floating-point tails. Snap to 7 decimal
// places (about 1 cm) before boolean operations; preserve the original GeoJSON.
const boroughs = boundary.features.map(f => f.geometry.coordinates.map(poly => poly.map(ring => ring.map(p => p.map(v => Math.round(v * 1e7) / 1e7))))) as Coordinates[];
const cityCoordinates = polygonClipping.union(boroughs[0], ...boroughs.slice(1));
export const CITY: Feature<MultiPolygon> = { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: cityCoordinates } };
export const BOUNDARY_SOURCE = "https://data.cityofnewyork.us/City-Government/Borough-Boundaries/wh2p-dxnf";
export function withinCity(lng: number, lat: number) {
  return booleanPointInPolygon([lng, lat], CITY, { ignoreBoundary: false });
}
function rectangle(b: Bounds): Coordinates {
  return [[[[b.west,b.south],[b.east,b.south],[b.east,b.north],[b.west,b.north],[b.west,b.south]]]];
}
export function splitBounds(b: Bounds): Bounds[] {
  return b.west <= b.east ? [b] : [{...b,east:180},{...b,west:-180}];
}
export function geometryBounds(c: Coordinates): Bounds {
  let west=180,east=-180,south=90,north=-90;
  for (const polygon of c) for (const ring of polygon) for (const [x,y] of ring) { west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y); }
  return { west,east,south,north };
}
type CoreSource = "nyc" | "pgc";
export interface Plan { mode: "nyc" | "pgc" | "mixed"; regions: Record<CoreSource, Feature<MultiPolygon>>; queries: Record<CoreSource, Bounds[]> }
export function planViewport(b: Bounds): Plan {
  const coords: Record<CoreSource, Coordinates>={nyc:[],pgc:[]};
  const queries: Record<CoreSource,Bounds[]>={nyc:[],pgc:[]};
  for (const part of splitBounds(b)) {
    const view=rectangle(part);
    const inside=polygonClipping.intersection(view,cityCoordinates);
    const outside=polygonClipping.difference(view,cityCoordinates);
    for (const [source,region] of [["nyc",inside],["pgc",outside]] as const) {
      if (region.length) {coords[source].push(...region);queries[source].push(geometryBounds(region));}
    }
  }
  const feature=(coordinates:Coordinates):Feature<MultiPolygon>=>({type:"Feature",properties:{},geometry:{type:"MultiPolygon",coordinates}});
  return { mode:coords.nyc.length ? coords.pgc.length ? "mixed":"nyc":"pgc", regions:{nyc:feature(coords.nyc),pgc:feature(coords.pgc)},queries };
}
export function ownedBy(source: Source, lng: number, lat: number) {
  return source === "nyc" ? withinCity(lng,lat) : !withinCity(lng,lat);
}
export function intersectCoverage(region: Feature<MultiPolygon>, coverage: Feature<Polygon | MultiPolygon>) {
  const c=coverage.geometry.type === "Polygon" ? [coverage.geometry.coordinates] : coverage.geometry.coordinates;
  const covered=polygonClipping.intersection(region.geometry.coordinates as Coordinates,c as Coordinates);
  const uncovered=polygonClipping.difference(region.geometry.coordinates as Coordinates,c as Coordinates);
  return { covered, uncovered };
}
