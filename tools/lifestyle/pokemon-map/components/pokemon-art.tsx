"use client";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { pokemonArt, type ArtRecord } from "@/lib/pokemon/artwork";

export function PokemonArt({ pokemon, size = "list" }: { pokemon: ArtRecord; size?: "list" | "detail" | "chip" }) {
  const art = pokemonArt(pokemon);
  const [failed, setFailed] = useState<string | null>(null);
  const missing = !art.url || failed === art.url;
  const label = `${pokemon.name ?? `#${pokemon.dex ?? "?"}`} · ${art.note}`;
  return <span className={`pokemon-art ${size} ${"source" in pokemon ? pokemon.source : ""}`} title={label}>
    {missing ? <span className="art-missing" role="img" aria-label={`${pokemon.name ?? "宝可梦"}配图暂不可用`}><ImageOff size={size === "chip" ? 14 : 22} />{size !== "chip" && <small>暂无配图</small>}</span> : <img src={art.url!} alt={label} width={size === "detail" ? 112 : 64} height={size === "detail" ? 112 : 64} loading={size === "detail" ? "eager" : "lazy"} decoding="async" onError={() => setFailed(art.url)} />}
    {size !== "chip" && !missing && !art.exactForm && <small className="art-reference">图鉴配图</small>}
  </span>;
}
