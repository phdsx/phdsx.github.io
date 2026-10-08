import type { Map as GLMap } from "maplibre-gl";
import { pokemonArt, type ArtRecord } from "./artwork";

const SIDE = 96;
export const PLACEHOLDER = "pokemon-image-unavailable";
export const mapArtKey = (s: ArtRecord) => {
  const id = pokemonArt(s).assetId;
  return id === null ? PLACEHOLDER : `pokemon-art-${id}`;
};

// Images can complete after a pan; they only populate a texture cache and never
// update the spawn source. Region changes remain controlled by RequestGate.
export function createMapArtwork(map: GLMap) {
  let alive = true;
  const pending = new Set<string>();
  const images = new Set<HTMLImageElement>();
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = SIDE;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#718995"; context.font = "bold 48px sans-serif";
  context.textAlign = "center"; context.textBaseline = "middle"; context.fillText("?", SIDE / 2, SIDE / 2);
  map.addImage(PLACEHOLDER, context.getImageData(0, 0, SIDE, SIDE), { pixelRatio: 2 });
  return {
    ensure(records: ArtRecord[]) {
      for (const s of records) {
        const key = mapArtKey(s), art = pokemonArt(s);
        if (!art.url || map.hasImage(key) || pending.has(key)) continue;
        pending.add(key);
        const img = new Image(); images.add(img);
        img.onload = () => {
          images.delete(img); if (!alive || map.hasImage(key)) return;
          const surface = document.createElement("canvas"); surface.width = surface.height = SIDE;
          const ctx = surface.getContext("2d"); if (!ctx) return;
          const scale = (SIDE - 8) / Math.max(img.naturalWidth, img.naturalHeight);
          const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
          ctx.drawImage(img, (SIDE - w) / 2, (SIDE - h) / 2, w, h);
          map.addImage(key, ctx.getImageData(0, 0, SIDE, SIDE), { pixelRatio: 2 });
        };
        img.onerror = () => { images.delete(img); };
        img.src = art.url;
      }
    },
    dispose() { alive = false; for (const img of images) { img.onload = img.onerror = null; img.src = ""; } images.clear(); },
  };
}
