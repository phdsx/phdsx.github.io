import names from "./names.json";
import forms from "./forms.json";
import { numeric, timestamp, type PokeMapSource } from "./model";
import { placeKey, type Gym, type StopQuest, type StopActivity } from "./facilities";

type Raw = Record<string, unknown>;
const text = (v: unknown) => typeof v === "string" && v.trim() && v !== "Unknown" ? v : null;
function point(raw: Raw) {
  if (raw.lat === null || raw.lat === undefined || raw.lat === "" || raw.lng === null || raw.lng === undefined || raw.lng === "") return null;
  const lat = Number(raw.lat), lng = Number(raw.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
export function adaptGym(raw: Raw, source: PokeMapSource = "nyc"): Gym | null {
  const p = point(raw); if (!p) return null;
  const dex = numeric(raw.pokemon_id);
  return { ...p, id: `${source}:gym:${placeKey(p)}`, source, rawId: null, name: text(raw.gym_name), team: numeric(raw.team),
    raid: { dex, name: dex === 0 ? null : (names as Record<string, string>)[String(dex)] ?? null, form: (forms as Record<string, string>)[String(raw.form)] ?? null,
      cp: numeric(raw.cp), tier: numeric(raw.level), startsAt: timestamp(raw.raid_start), endsAt: timestamp(raw.raid_end) }, raw };
}
export function adaptQuest(raw: Raw, source: PokeMapSource = "nyc"): StopQuest | null {
  const p = point(raw); if (!p) return null;
  return { ...p, id: `${source}:quest:${placeKey(p)}:${String(raw.conditions_string ?? "")}:${String(raw.rewards_string ?? "")}`, source, rawId: null,
    name: text(raw.name), description: text(raw.conditions_string), reward: text(raw.rewards_string), expiresAt: timestamp(raw.expiration), raw };
}
// Character/type codes are taken from script_pokestop.js?ver870. Its ordered
// grunts array gives 48 to Ghost before Electric; preserve that precedence.
const TYPE_CODES: [number[], string][] = [
  [[4,5], "未知属性"], [[6,7], "虫"], [[47,48], "幽灵"], [[10,11], "恶"], [[12,13], "龙"], [[14,15], "妖精"],
  [[16,17], "格斗"], [[18,19], "火"], [[20,21], "飞行"], [[22,23], "草"], [[24,25], "地面"], [[26,27], "冰"],
  [[28,29], "钢"], [[30,31], "一般"], [[32,33], "毒"], [[34,35], "超能力"], [[36,37], "岩石"], [[38,39], "水"], [[49,50], "电"],
];
const MALE = [4,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,45];
const FEMALE = [5,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,46];
export function adaptActivity(raw: Raw, source: PokeMapSource = "nyc"): StopActivity | null {
  const p = point(raw); if (!p) return null;
  const code = numeric(raw.character), type = numeric(raw.type), startsAt = timestamp(raw.invasion_start), endsAt = timestamp(raw.invasion_end);
  let activity: StopActivity["activity"] = "unknown", opponent: string | null = null, typeName: string | null = null, radar: string | null = null;
  if (type === 7) activity = "gold";
  else if (type === 8) activity = "kecleon";
  else if (type === 9) activity = "showcase";
  else if (code !== null && code >= 500 && code <= 510) { activity = "npc"; opponent = "NPC"; }
  else if (code !== null) {
    typeName = TYPE_CODES.find(([ids]) => ids.includes(code))?.[1] ?? null;
    const leaders: Record<number, string> = { 41: "克里夫 Cliff", 42: "阿尔洛 Arlo", 43: "希拉 Sierra", 44: "坂木 Giovanni", 45: "诱饵手下", 46: "诱饵手下" };
    if (typeName || leaders[code]) { activity = "rocket"; opponent = leaders[code] ?? "火箭队手下"; }
    if ([41,42,43].includes(code)) radar = "火箭队雷达";
    if (code === 44) radar = "超级火箭队雷达";
  }
  return { ...p, id: `${source}:activity:${placeKey(p)}:${type}:${code}:${startsAt}:${endsAt}`, source, rawId: null, name: text(raw.name), startsAt, endsAt,
    characterCode: code, typeCode: type, activity, opponent, typeName, radar, gender: code === null ? null : MALE.includes(code) ? "男" : FEMALE.includes(code) ? "女" : null, raw };
}
export function readRows(payload: unknown, key: "raids" | "quests" | "invasions") {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("设施来源响应格式不合法");
  const data = payload as Raw;
  if (!Array.isArray(data[key])) throw new Error(`设施来源缺少 ${key} 数组`);
  const rows = data[key].filter((r): r is Raw => !!r && typeof r === "object" && !Array.isArray(r));
  if(data[key].length && !rows.length)throw new Error("设施数组全部未通过记录格式验证");
  const meta = data.meta && typeof data.meta === "object" ? data.meta as Raw : {};
  return { rows, updatedAt: timestamp(meta.time), data };
}
export function questCatalog(payload: unknown) {
  const { data } = readRows(payload, "quests");
  if (!data.filters || typeof data.filters !== "object" || Array.isArray(data.filters)) throw new Error("来源缺少任务筛选目录，无法取得完整可用任务");
  const filters = data.filters as Raw, values: string[] = [];
  let partial = false;
  for (const [key, options] of Object.entries(filters)) {
    if (!["t2","t3","t4","t7","t8","t9","t12"].includes(key) || !Array.isArray(options)) { partial = true; continue; }
    const type = key.slice(1);
    for (const v of options) {
      if (typeof v !== "string" || !/^[\w-]{1,32}$/.test(v)) { partial = true; continue; }
      values.push(["3","8"].includes(type) ? `${type},${v},0` : `${type},0,${v}`);
    }
  }
  if (values.length > 500) { values.length = 500; partial = true; }
  return { values: [...new Set(values)], partial };
}
