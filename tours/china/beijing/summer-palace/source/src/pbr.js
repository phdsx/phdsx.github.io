import * as T from "three";
import { random, materials as baseMaterials } from "./materials.js";
async function maps(alias, period) {
  const loader = new T.TextureLoader();
  const all = await Promise.all(
    ["color", "normalgl", "roughness"].map((k) =>
      loader.loadAsync(
        import.meta.env.BASE_URL + `textures/${alias}-${k}.webp`,
      ),
    ),
  );
  all.forEach((t, i) => {
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.repeat.setScalar(1 / period);
    t.anisotropy = 8;
    if (i === 0) t.colorSpace = T.SRGBColorSpace;
  });
  return { map: all[0], normalMap: all[1], roughnessMap: all[2] };
}
function paint() {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#16473f";
  ctx.fillRect(0, 0, 1024, 1024);
  ctx.strokeStyle = "#c5b079";
  ctx.lineWidth = 4;
  ctx.strokeRect(9, 9, 1006, 1006);
  ctx.strokeRect(20, 20, 984, 984);
  for (let y = 72; y < 1024; y += 146)
    for (let x = 78; x < 1024; x += 146) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = "#93a783";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let j = 0; j < 120; j++) {
        const a = (j / 120) * Math.PI * 2,
          r = 49 + 8 * Math.sin(a * 8);
        j
          ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
          : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.rotate(Math.PI / 4);
      ctx.strokeStyle = "#d4ba75";
      ctx.strokeRect(-28, -28, 56, 56);
      ctx.fillStyle = "#42867a";
      ctx.fillRect(-12, -12, 24, 24);
      ctx.restore();
    }
  for (let i = 0; i < 16000; i++) {
    ctx.fillStyle = `rgba(10,19,8,${random() * 0.09})`;
    ctx.fillRect(random() * 1024, random() * 1024, 2, 2);
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(1, 0.5);
  t.anisotropy = 8;
  return t;
}
function wood() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#944d3d";
  ctx.fillRect(0, 0, 256, 512);
  for (let x = 0; x < 256; x++) {
    ctx.strokeStyle = `rgba(30,12,8,${random() * 0.14})`;
    ctx.beginPath();
    for (let y = 0; y < 512; y += 5)
      ctx.lineTo(x + 2 * Math.sin(y * 0.03 + x * 0.2), y);
    ctx.stroke();
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
export async function pbrMaterials() {
  const m = baseMaterials(),
    [bark, paving, forest, rock] = await Promise.all([
      maps("bark", 1.4),
      maps("paving", 2),
      maps("forest", 3.4),
      maps("rock", 2),
    ]);
  Object.assign(m.pave, paving, {
    color: new T.Color("#dad7ca"),
    normalScale: new T.Vector2(0.35, 0.35),
  });
  Object.assign(m.earth, forest, {
    color: new T.Color("#c9d0ac"),
    normalScale: new T.Vector2(0.5, 0.5),
  });
  Object.assign(m.trunk, bark, {
    color: new T.Color("#b6aa99"),
    normalScale: new T.Vector2(0.7, 0.7),
  });
  Object.assign(m.rock, rock, {
    color: new T.Color("#bcb9a5"),
    normalScale: new T.Vector2(0.75, 0.75),
  });
  const grain = wood();
  m.red.map = grain;
  m.red.bumpMap = grain;
  m.red.bumpScale = 0.018;
  m.red.color.set("#c19280");
  m.paint.map = paint();
  m.paint.color.set("#d6cc9d");
  m.tile.color.set("#f1e3b3");
  m.darkTile.color.set("#bdc6af");
  m.water.color.set("#4f7967");
  m.water.roughness = 0.42;
  m.water.envMapIntensity = 0.4;
  m.pave.bumpMap = null;
  m.trunk.color.set("#867363");
  for (const mat of Object.values(m)) mat.needsUpdate = true;
  return m;
}
