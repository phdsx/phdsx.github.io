import { publicAssetUrl } from "./deployment";
import catalog from "./artwork-catalog.json";
import type { Spawn } from "./model";

export type ArtRecord = Pick<Spawn, "dex" | "name" | "form"> & Partial<Pick<Spawn, "source">>;
type SpeciesArt = { slug: string; base: number | null; forms: Record<string, number> };
const species = catalog.species as Record<string, SpeciesArt>;
export const ARTWORK_COMMIT = catalog.commit;
export const ARTWORK_IDS = new Set<number>(catalog.assets);
export const ARTWORK_SOURCE = "https://github.com/PokeAPI/sprites";

// Upstream GO form numbers are not PokéAPI IDs. Match only a named variant of
// this same species; never use raw.form directly as an artwork filename.
function formKey(form: string) {
  return form.trim().toLowerCase().replace(/^alolan\b/, "alola").replace(/^galarian\b/, "galar").replace(/^hisuian\b/, "hisui").replace(/^paldean\b/, "paldea").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
export function pokemonArt(s: ArtRecord) {
  const art = s.dex !== null && Number.isInteger(s.dex) ? species[String(s.dex)] : null;
  const form = s.form?.trim();
  const key = form ? formKey(form) : "";
  // NYC's Squawkabilly color names omit PokéAPI's verified "-plumage" suffix.
  const variant = s.dex === 931 && /^(green|blue|yellow|white)$/.test(key) ? `${key}-plumage` : key;
  const matching = art && form ? art.forms[variant] : null;
  const assetId = matching ?? art?.base ?? null;
  const exactForm = matching !== null && matching !== undefined;
  const note = assetId === null ? "暂无配图" : exactForm ? `${form} 形态配图` : form ? "该形态配图未收录 · 显示图鉴配图" : "形态未知 · 显示图鉴配图";
  return { assetId, exactForm, note, url: assetId === null ? null : publicAssetUrl(`pokemon-artwork/${assetId}.webp`) };
}
