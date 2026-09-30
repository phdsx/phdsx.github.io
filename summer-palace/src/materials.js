import * as T from "three";
let seed = 601;
export const random = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
function texture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = {
    stone: "#c9c7b9",
    pave: "#a6a89a",
    tile: "#b89b4e",
    graytile: "#66736a",
    grass: "#788465",
    paint: "#215955",
  }[kind];
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(${random() > 0.5 ? "255,245,218" : "20,34,20"},${random() * 0.09})`;
    ctx.fillRect(
      random() * 256,
      random() * 256,
      random() * 3 + 1,
      random() * 3 + 1,
    );
  }
  if (kind.includes("tile")) {
    for (let x = 0; x < 256; x += 32) {
      const g = ctx.createLinearGradient(x, 0, x + 32, 0);
      const color =
        kind === "tile"
          ? ["#826d36", "#c9ab5c", "#a28b48"]
          : ["#3c4d46", "#788378", "#54675a"];
      g.addColorStop(0, color[0]);
      g.addColorStop(0.42, color[1]);
      g.addColorStop(1, color[2]);
      ctx.fillStyle = g;
      ctx.fillRect(x, 0, 32, 256);
    }
    ctx.strokeStyle = "#31463877";
    ctx.lineWidth = 1;
    for (let y = 0; y < 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  } else if (kind === "paint") {
    ctx.strokeStyle = "#c4ad69";
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 6, 246, 243);
    for (let y = 18; y < 256; y += 48) {
      ctx.beginPath();
      ctx.moveTo(12, y);
      for (let x = 12; x < 248; x += 4)
        ctx.lineTo(x, y + 10 * Math.sin(x * 0.045));
      ctx.stroke();
      for (let x = 30; x < 248; x += 45) {
        ctx.save();
        ctx.translate(x, y + 10);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-7, -7, 14, 14);
        ctx.restore();
      }
    }
  } else if (kind !== "grass") {
    ctx.strokeStyle = "#71796988";
    ctx.lineWidth = 1;
    for (let y = 0; y < 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
      for (let x = y % 128 === 0 ? 0 : 64; x < 256; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 64);
        ctx.stroke();
      }
    }
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
export function materials() {
  const standard = (color, roughness = 0.9, extra = {}) =>
    new T.MeshStandardMaterial({ color, roughness, ...extra });
  const stone = texture("stone"),
    tile = texture("tile"),
    gray = texture("graytile"),
    paint = texture("paint"),
    pave = texture("pave"),
    grass = texture("grass");
  return {
    stone: standard("#eceadf", 0.91, {
      map: stone,
      bumpMap: stone,
      bumpScale: 0.04,
    }),
    pave: standard("#d4d1ba", 0.96, {
      map: pave,
      bumpMap: pave,
      bumpScale: 0.025,
    }),
    earth: standard("#fff", 1, { map: grass }),
    tile: standard("#e9d48c", 0.53, {
      map: tile,
      bumpMap: tile,
      bumpScale: 0.045,
      side: T.DoubleSide,
    }),
    darkTile: standard("#b5bbad", 0.8, {
      map: gray,
      bumpMap: gray,
      bumpScale: 0.04,
      side: T.DoubleSide,
    }),
    greenTile: standard("#50734b", 0.55),
    red: standard("#894637", 0.8),
    wall: standard("#cac3b0"),
    wood: standard("#664535", 0.86),
    window: standard("#263c35", 0.55),
    blue: standard("#417571"),
    paint: standard("#d9d9ba", 0.82, { map: paint }),
    gold: standard("#c1a359", 0.6, { metalness: 0.18 }),
    gable: standard("#77765c", 0.9, { side: T.DoubleSide }),
    ridge: standard("#b49b56", 0.6),
    trunk: standard("#625543"),
    leaf: standard("#4e7041"),
    pine: standard("#315d40"),
    rock: standard("#9b9c89"),
    copper: standard("#41564c", 0.73, { metalness: 0.4 }),
    boat: standard("#e3dfcf", 0.84),
    water: standard("#66857a", 0.48, { metalness: 0.08 }),
    gray: standard("#adb8a1"),
  };
}
export function animateWater(mat) {
  mat.onBeforeCompile = (s) => {
    s.uniforms.time = { value: 0 };
    mat.userData.shader = s;
    s.vertexShader = s.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWaterWorld;",
      )
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvWaterWorld = (modelMatrix * vec4(transformed,1.0)).xyz;",
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWaterWorld;\nuniform float time;",
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
 vec2 p=vWaterWorld.xz;float t=time;vec2 wave=vec2(0.0);
 wave+=vec2(.8,.6)*sin(dot(p,vec2(.047,.038))+t*.28)*.024;
 wave+=vec2(-.6,.8)*sin(dot(p,vec2(-.14,.19))-t*.43)*.013;
 wave+=vec2(.94,-.34)*sin(dot(p,vec2(.45,-.163))+t*.55+sin(p.y*.032))*.012;
 wave+=vec2(.3,.95)*sin(dot(p,vec2(1.31,4.12))-t*.67+sin(p.x*.17))*.012;
 wave+=vec2(-.83,.55)*cos(dot(p,vec2(-6.3,4.1))+t*.93)*.009;
 float fade=1.0/(1.0+length(fwidth(p))*.7);
 normal=normalize(normal+mat3(viewMatrix)*vec3(wave.x,0.0,wave.y)*fade);`,
      );
  };
}
