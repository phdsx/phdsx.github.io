import type {Feature,Polygon,MultiPolygon} from "geojson";
import config from "./coverage.json";
import type {Source} from "./model";
export interface VerifiedCoverage {sourceUrl:string;verifiedAt:string;feature:Feature<Polygon|MultiPolygon>}
// Populate only from a verified provider coverage publication. A city outline,
// point envelope or empty response is not proof of scanning coverage.
export function coverageFor(source:Source):VerifiedCoverage|null {
  const item=(config as Record<Source,VerifiedCoverage|null>)[source];
  if(!item)return null;
  if(!item.sourceUrl || !Number.isFinite(Date.parse(item.verifiedAt)) || !["Polygon","MultiPolygon"].includes(item.feature?.geometry?.type))throw Error("已配置的覆盖边界缺少可核实的来源或合法几何");
  return item;
}
