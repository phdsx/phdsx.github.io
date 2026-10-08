import type { Map as GLMap, GeoJSONSource } from "maplibre-gl";
import type { VenueSelection } from "./facilities";

export function gymIcon(team: number | null) { return `venue-gym-${team !== null && [0,1,2,3].includes(team) ? team : "unknown"}`; }
export function addFacilityMap(map: GLMap, select: (selection: VenueSelection) => void) {
  const colors = ["#718995", "#3882d7", "#d74a58", "#c79822"];
  for (const kind of ["stop", "rocket", "gym-0", "gym-1", "gym-2", "gym-3", "gym-unknown"]) {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = kind === "rocket" ? "#c92f4b" : kind === "stop" ? "#258ece" : colors[Number(kind.slice(4))] ?? "#667fa3";
    if (kind === "rocket") { ctx.font = "bold 43px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("R",32,34); }
    else if (kind === "stop") { ctx.beginPath(); ctx.arc(32,25,14,0,Math.PI*2); ctx.fill(); ctx.fillRect(28,39,8,13); ctx.clearRect(25,18,14,14); }
    else { ctx.beginPath(); ctx.moveTo(10,23); ctx.lineTo(32,9); ctx.lineTo(54,23); ctx.closePath(); ctx.fill(); for (const x of [15,29,43]) ctx.fillRect(x,27,6,22); ctx.fillRect(10,52,44,5); }
    map.addImage(`venue-${kind}`, ctx.getImageData(0,0,64,64), { pixelRatio: 2 });
  }
  map.addSource("venues", { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterRadius: 30, clusterMaxZoom: 14 });
  map.addLayer({ id: "venue-clusters", type: "circle", source: "venues", filter: ["has","point_count"], paint: { "circle-color": "#e3eefb", "circle-radius": 17, "circle-stroke-width": 2, "circle-stroke-color": "#4c7ea9" } });
  map.addLayer({ id: "venue-cluster-count", type: "symbol", source: "venues", filter: ["has","point_count"], layout: { "text-field": ["get","point_count_abbreviated"], "text-font": ["Open Sans Semibold"], "text-size": 12 }, paint: { "text-color": "#28537c" } });
  map.addLayer({ id: "venue-points", type: "circle", source: "venues", filter: ["!",["has","point_count"]], paint: { "circle-color": "#fff", "circle-radius": 17, "circle-stroke-width": 2, "circle-stroke-color": ["match",["get","kind"],"rocket","#c92f4b","gym","#667fa3","#258ece"] } });
  map.addLayer({ id: "venue-icons", type: "symbol", source: "venues", filter: ["!",["has","point_count"]], layout: { "icon-image": ["get","icon"], "icon-size": 1, "icon-allow-overlap": true, "icon-ignore-placement": true } });
  map.on("click", "venue-points", e => {
    const props = map.queryRenderedFeatures(e.point,{layers:["venue-points"]})[0]?.properties;
    if (props && ["gym","stop","rocket"].includes(props.kind)) select({ kind: props.kind, id: props.id });
  });
  map.on("click", "venue-clusters", async e => {
    const f = map.queryRenderedFeatures(e.point,{layers:["venue-clusters"]})[0];
    if (!f || f.geometry.type !== "Point") return;
    const zoom = await (map.getSource("venues") as GeoJSONSource).getClusterExpansionZoom(Number(f.properties.cluster_id));
    map.easeTo({center:f.geometry.coordinates as [number,number],zoom});
  });
  for (const layer of ["venue-points","venue-clusters"]) {
    map.on("mouseenter",layer,()=>{map.getCanvas().style.cursor="pointer";});
    map.on("mouseleave",layer,()=>{map.getCanvas().style.cursor="";});
  }
}
