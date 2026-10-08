import * as T from "three";
import { contextTerrain } from "./context.js";
import { gardenDetails } from "./heritage-details.js";
import { Sky } from "three/addons/objects/Sky.js";
import { pbrMaterials } from "./pbr.js";
import { detailedVegetation } from "./foliage.js";
import { waterReflection } from "./water-reflection.js";
import { prepareCourts, detailLandscape } from "./site-details.js";
import { Ground, landscape } from "./landscape.js";
import {
  prepareBuildings,
  architecture,
  corridor,
  bridges,
  marbleBoat,
} from "./buildings.js";
import { Navigation } from "./navigation.js";
import { landmarks, ui } from "./ui.js";
import "./style.css";
const $ = (id) => document.getElementById(id);
let quality = "medium",
  frame = 0,
  last = performance.now(),
  raf = 0;
const toast = (message) => {
  $("toast").textContent = message;
  $("toast").style.opacity = 1;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("toast").style.opacity = 0), 4200);
};
const progress = (v, message) => {
  $("progress").value = v;
  $("load-message").textContent = message;
};
const tick = () => new Promise((r) => setTimeout(r, 0));
async function load(url) {
  const r = await fetch(import.meta.env.BASE_URL + url);
  if (!r.ok) throw new Error(`资源读取失败 ${url} (${r.status})`);
  return r.json();
}
async function main() {
  const renderer = new T.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  $("scene").append(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color("#b7cfd5");
  scene.fog = new T.Fog("#c2d0ca", 3100, 7800);
  const camera = new T.PerspectiveCamera(
    52,
    innerWidth / innerHeight,
    0.15,
    12500,
  );
  const sky = new Sky();
  sky.scale.setScalar(11000);
  const u = sky.material.uniforms;
  u.turbidity.value = 2.8;
  u.rayleigh.value = 1.2;
  u.mieCoefficient.value = 0.003;
  u.mieDirectionalG.value = 0.75;
  const sunDirection = new T.Vector3(-0.35, 0.75, 0.5).normalize();
  u.sunPosition.value.copy(sunDirection);
  scene.add(sky);
  const pmrem = new T.PMREMGenerator(renderer),
    environment = pmrem.fromScene(new T.Scene().add(sky.clone()), 0.03);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();
  const hemi = new T.HemisphereLight("#d4e5ec", "#626e4d", 0.82);
  scene.add(hemi);
  const sun = new T.DirectionalLight("#fff2d8", 2.5);
  sun.position.copy(sunDirection).multiplyScalar(500);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -170;
  sun.shadow.camera.right = sun.shadow.camera.top = 170;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 1400;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.25;
  scene.add(sun, sun.target);
  const [data, dem, contextDem] = await Promise.all([
    load("data/layout.json"),
    load("data/dem.json"),
    load("data/context-dem.json"),
  ]);
  progress(23, "建立米制坐标、湖岸与建筑台基…");
  await tick();
  const mats = await pbrMaterials(),
    ground = new Ground(data, dem);
  contextTerrain(scene, data, contextDem, ground, mats);
  prepareCourts(ground);
  const models = prepareBuildings(data, ground);
  const bridgeModels = bridges(scene, data, ground, mats),
    boat = marbleBoat(scene, ground, mats),
    covered = corridor(scene, data, ground, mats);
  progress(45, "生成连续地形、园区道路与水系…");
  await tick();
  const extra = detailLandscape(scene, ground, models, mats);
  const land = landscape(scene, ground, mats);
  progress(64, "组织前后山建筑群与院落…");
  await tick();
  const buildings = architecture(scene, models, ground, mats);
  const garden = gardenDetails(scene, ground, models, mats);
  progress(79, "实例化夏季植被…");
  await tick();
  const trees = detailedVegetation(scene, ground, models, mats);
  const reflection = waterReflection(scene, renderer, camera, mats.water);
  progress(92, "建立游览控制与小地图…");
  await tick();
  const sites = landmarks(models, bridgeModels, boat, covered, ground);
  const nav = new Navigation(
    camera,
    renderer.domElement,
    ground,
    models,
    covered,
    toast,
  );
  function setQuality(q) {
    quality = q;
    renderer.setPixelRatio(
      Math.min(
        devicePixelRatio,
        q === "low" ? 0.8 : q === "medium" ? 1.25 : 1.75,
      ),
    );
    renderer.shadowMap.enabled = q !== "low";
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
    sun.shadow.mapSize.set(
      q === "high" ? 4096 : 2048,
      q === "high" ? 4096 : 2048,
    );
    toast(
      {
        low: "低画质 · 降低像素与植被远距显示",
        medium: "中画质 · 平衡细节与渲染",
        high: "高画质 · 增强近景与阴影",
      }[q],
    );
  }
  const panel = ui(nav, renderer, camera, data, sites, setQuality);
  nav.orbit.target.set(-420, 25, -780);
  camera.position.set(180, 250, 450);
  nav.orbit.update();
  const raycaster = new T.Raycaster(),
    pointer = new T.Vector2();
  let down = null;
  renderer.domElement.addEventListener(
    "pointerdown",
    (e) => (down = [e.clientX, e.clientY]),
  );
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (
      !down ||
      Math.hypot(down[0] - e.clientX, down[1] - e.clientY) > 4 ||
      e.button !== 0 ||
      nav.mode === "walk"
    )
      return;
    pointer.set(
      (e.clientX / innerWidth) * 2 - 1,
      1 - (e.clientY / innerHeight) * 2,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster
      .intersectObjects(
        [...buildings.hits, ...bridgeModels.map((b) => b.group), boat.group],
        true,
      )
      .find((h) => {
        for (let o = h.object; o; o = o.parent) if (!o.visible) return false;
        return true;
      });
    if (!hit) return;
    let obj = hit.object;
    const batchModel = obj.userData.models?.[hit.batchId];
    while (obj && !obj.userData.model) obj = obj.parent;
    const model = batchModel || obj?.userData.model;
    if (model) {
      const site = sites.find((b) => b.id === model.id);
      if (site) panel.showInfo(site);
    } else {
      const near = sites
        .filter((b) => ["boat", "bridge"].includes(b.id))
        .find(
          (b) =>
            Math.hypot(b.x - hit.point.x, b.z - hit.point.z) <
            Math.max(b.w, b.d) / 2 + 10,
        );
      if (near) panel.showInfo(near);
    }
  });
  const resize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  window.addEventListener("resize", resize);
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    toast("图形上下文中断，请重新加载页面。");
    cancelAnimationFrame(raf);
  });
  const state = (window.__summer = {
    ready: true,
    scene,
    camera,
    renderer,
    data,
    dem,
    ground,
    models,
    extra,
    garden,
    buildings,
    bridgeModels,
    corridor: covered,
    trees,
    sites,
    nav,
    panel,
    quality: () => quality,
  });
  function animate(now) {
    raf = requestAnimationFrame(animate);
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;
    nav.update(dt);
    if (frame % 12 === 0) {
      buildings.update(camera, quality, now / 1000);
      trees.update(camera, quality);
      panel.update();
      const target = nav.mode === "walk" ? camera.position : nav.orbit.target;
      sun.target.position.set(target.x, target.y, target.z);
      sun.position.copy(sun.target.position).addScaledVector(sunDirection, 550);
      sun.target.updateMatrixWorld();
      $("stats").textContent =
        `${nav.mode === "walk" ? "步行 · 视高 1.7 米" : "鸟瞰 · 米制全园"} · ${{ low: "低", medium: "中", high: "高" }[quality]}画质`;
    }
    if (mats.water.userData.shader)
      mats.water.userData.shader.uniforms.time.value = now / 1000;
    reflection.update(quality);
    renderer.render(scene, camera);
    frame++;
  }
  progress(100, "场景就绪");
  $("loading").hidden = true;
  raf = requestAnimationFrame(animate);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    nav.dispose();
    window.removeEventListener("resize", resize);
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    scene.traverse((o) => {
      if (o.isInstancedMesh || o.isBatchedMesh) o.dispose();
      if (o.geometry) geometries.add(o.geometry);
      for (const m of Array.isArray(o.material)
        ? o.material
        : o.material
          ? [o.material]
          : [])
        materials.add(m);
    });
    Object.values(mats).forEach((m) => materials.add(m));
    for (const m of materials) {
      for (const value of Object.values(m))
        if (value?.isTexture) textures.add(value);
      m.dispose();
    }
    textures.forEach((t) => t.dispose());
    geometries.forEach((g) => g.dispose());
    reflection.dispose();
    environment.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
  window.addEventListener("pagehide", dispose, { once: true });
  if (import.meta.hot) import.meta.hot.dispose(dispose);
}
main().catch((e) => {
  console.error(e);
  $("load-message").textContent =
    e.message + "。请检查资源或使用支持 WebGL2 的浏览器后重试。";
  const b = document.createElement("button");
  b.textContent = "重新加载";
  b.onclick = () => location.reload();
  $("loading").append(b);
});
