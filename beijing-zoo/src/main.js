import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createScene } from "./scene.js";
import { createNavigation } from "./navigation.js";
import { bounds, distance, geographic } from "./geo.js";
const $ = (id) => document.getElementById(id),
  abort = new AbortController();
const listen = (el, type, fn, options = {}) =>
  el.addEventListener(type, fn, { ...options, signal: abort.signal });
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
function progress(value, message) {
  $("progress").value = value;
  $("loading-text").textContent = message;
}
const warnings = [];
function failure(message) {
  warnings.push(message);
  $("resource-warning").hidden = false;
  $("resource-warning").textContent = warnings.join(" · ");
}
let world,
  controls,
  disposed = false;
async function init() {
  const fetchData = async (name) => {
    const r = await fetch("./data/" + name + ".json");
    if (!r.ok) throw Error(name + " " + r.status);
    return r.json();
  };
  const [data, venues, species, sources] = await Promise.all(
    ["map", "venues", "species", "sources"].map(fetchData),
  );
  progress(28, "核对米制坐标与场馆位置…");
  const nav = createNavigation(data);
  for (const v of venues) v.spawn = nav.spawn(v.position);
  world = createScene($("viewport"), data, venues, nav, progress, failure);
  const { camera, renderer } = world;
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.minDistance = 4;
  controls.maxDistance = 2400;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.target.set(0, 0, -280);
  controls.enablePan = true;
  let mode = "orbit",
    selected = null,
    category = "all",
    query = "",
    filtered = venues,
    tween = null,
    yaw = 0,
    pitch = 0,
    keys = new Set(),
    elapsed = 0,
    frameSamples = [],
    lastTime = performance.now(),
    lastStats = 0,
    lastLabels = 0,
    lastMap = 0,
    toastTimer;
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const featured = [
    "south-gate",
    "v-25375816",
    "v-273416876",
    "v-25375846",
    "v-25375838",
    "v-25375829",
    "v-25375863",
    "v-478457830",
    "v-25375855",
    "v-478432519",
    "v-273416828",
    "v-25375821",
  ];
  function toast(text) {
    $("toast").textContent = text;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => ($("toast").hidden = true), 3200);
  }
  function setMode(next) {
    mode = next;
    keys.clear();
    controls.enabled = mode === "orbit";
    $("orbit").setAttribute("aria-pressed", mode === "orbit");
    $("walk").setAttribute("aria-pressed", mode === "walk");
    $("walk-hint").hidden = mode !== "walk";
    $("crosshair").hidden = mode !== "walk";
    if (mode === "orbit") {
      if (document.pointerLockElement) document.exitPointerLock();
      return;
    }
    const v = selected || venues.find((v) => v.id === "south-gate");
    const p = v.spawn.position;
    tween = null;
    camera.position.set(p[0], v.spawn.height + 1.7, p[1]);
    const dx = v.position[0] - p[0],
      dz = v.position[1] - p[1];
    yaw = Math.atan2(-dx, -dz);
    pitch = 0;
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);
    $("viewport").focus({ preventScroll: true });
    $("view-title").textContent = v.name + " · 游客道路";
  }
  function fly(position, target) {
    setMode("orbit");
    tween = {
      from: camera.position.clone(),
      to: new THREE.Vector3(...position),
      targetFrom: controls.target.clone(),
      targetTo: new THREE.Vector3(...target),
      start: performance.now(),
      duration: prefersReduced ? 0 : 950,
    };
  }
  function overview() {
    selected = null;
    fly([-70, 1120, 550], [-180, 0, -320]);
    $("view-title").textContent = "全园 · 地理布局";
    $("info").hidden = true;
  }
  function entrance() {
    const v = venues.find((v) => v.id === "south-gate");
    selected = v;
    fly(
      [v.position[0] + 16, 13, v.position[1] + 35],
      [v.position[0], 5, v.position[1] - 13],
    );
    $("view-title").textContent = "南门 · 古园初见";
    $("info").hidden = true;
  }
  function observe() {
    if (!selected) return;
    const target =
      selected.id === "v-273416876" && world.animal
        ? world.animal.point
        : selected.position;
    const p = nav.spawn(target).position;
    fly(
      [p[0], selected.id === "south-gate" ? 8 : 3.1, p[1]],
      [target[0], selected.id === "south-gate" ? 5 : 1.1, target[1]],
    );
    $("view-title").textContent = selected.name + " · 近景观察";
  }
  function links(ids) {
    return ids
      .map((id) => sources.find((s) => s.id === id))
      .filter(Boolean)
      .map(
        (s) =>
          `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a>`,
      )
      .join("<br>");
  }
  function selectVenue(id, { near = false } = {}) {
    selected = venues.find((v) => v.id === id);
    if (!selected) return;
    const v = selected,
      records = species.filter((s) => s.venueIds.includes(id));
    $("info-content").innerHTML =
      `<span class="eyebrow">${esc(id)} · ${geographic(...v.position)
        .map((x) => x.toFixed(5))
        .join(
          ", ",
        )}</span><h2>${esc(v.name)}</h2><span class="status-badge">资料点位 · 今日在展未确认</span><p>${esc(v.note)}</p><h3>动物资料${records.length ? " · " + records.length + " 条" : ""}</h3>${records.length ? records.map((s) => `<div class="species-row"><strong>${esc(s.name)}</strong><small>${esc(s.verifiedStatus)} · ${esc(s.sourceDate)}</small><small>${esc(s.note)}<br>${esc(s.modelStatus)}${s.model ? "；演示数量1只，位置与动作非真实定位" : ""}</small>${links(s.sourceIds)}</div>`).join("") : "<p>未取得可靠的具体物种表。本场馆不补入推测动物。</p>"}<h3>空间精度</h3><p>${esc(v.geometryStatus)}<br>安全观察点距资料点位 ${Math.round(v.spawn.distance)} 米。室内未建模。</p><h3>位置与场馆来源</h3>${links(v.sourceIds)}`;
    $("info").hidden = false;
    $("view-title").textContent = v.name;
    if (mode === "walk") setMode("walk");
    else if (near) observe();
    else
      fly(
        [v.position[0] + 75, 90, v.position[1] + 110],
        [v.position[0], 3, v.position[1]],
      );
    if (id === "v-273416876") world.ensureAnimal();
    updateMap();
  }
  function runFilter() {
    query = $("search").value.trim().toLowerCase();
    const matches = species.filter(
      (s) =>
        (category === "all" || s.category === category) &&
        (s.name.toLowerCase().includes(query) ||
          s.venueIds.some((id) =>
            venues
              .find((v) => v.id === id)
              ?.name.toLowerCase()
              .includes(query),
          )),
    );
    const set = new Set(matches.flatMap((s) => s.venueIds));
    filtered = venues.filter(
      (v) =>
        (category === "all" || set.has(v.id)) &&
        (!query || v.name.toLowerCase().includes(query) || set.has(v.id)),
    );
    // Query results show animals first, each linked to its source-supported venue(s).
    const results = query
      ? matches.map((s) => ({
          name: s.name,
          note:
            s.venueIds
              .map((id) => venues.find((v) => v.id === id)?.name)
              .join(" / ") +
            " · " +
            s.verifiedStatus,
          id: s.venueIds[0],
          species: s.id,
        }))
      : filtered
          .sort((a, b) => {
            const ai = featured.indexOf(a.id),
              bi = featured.indexOf(b.id);
            return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
          })
          .map((v) => ({
            name: v.name,
            note: v.speciesIds.length
              ? v.speciesIds.length + " 条动物资料 · 非实时"
              : "外观 / 地图点位",
            id: v.id,
          }));
    if (query)
      for (const v of filtered)
        if (!results.some((r) => r.name === v.name))
          results.push({ name: v.name, note: "场馆资料", id: v.id });
    $("result-count").textContent = query
      ? `${results.length} 个结果 · ${filtered.length} 处地图位置`
      : `${filtered.length} 处场馆 / 资料点位`;
    $("results").innerHTML = results.length
      ? results
          .map(
            (r, i) =>
              `<button class="result" data-venue="${esc(r.id)}"${r.species ? ` data-species="${r.species}"` : ""}><span class="result-number">${String(i + 1).padStart(2, "0")}</span><span><strong>${esc(r.name)}</strong><small>${esc(r.note)}</small></span><span class="arrow">↗</span></button>`,
          )
          .join("")
      : '<p class="empty">没有找到对应资料。可尝试动物名称或场馆名称。</p>';
    updateMap();
    updateLabels(true);
  }
  const labelElements = new Map();
  for (const v of venues) {
    const b = document.createElement("button");
    b.className = "scene-label";
    b.textContent = v.name;
    b.dataset.venue = v.id;
    b.hidden = true;
    $("labels").append(b);
    labelElements.set(v.id, b);
  }
  function updateLabels(force = false) {
    if (!force && elapsed - lastLabels < 0.15) return;
    lastLabels = elapsed;
    const occupied = [];
    let count = 0;
    const w = renderer.domElement.clientWidth,
      h = renderer.domElement.clientHeight;
    const candidates = [...filtered].sort((a, b) => {
      if (a.id === selected?.id) return -1;
      if (b.id === selected?.id) return 1;
      return (
        camera.position.distanceTo(
          new THREE.Vector3(...[a.position[0], 0, a.position[1]]),
        ) -
        camera.position.distanceTo(
          new THREE.Vector3(b.position[0], 0, b.position[1]),
        )
      );
    });
    for (const b of labelElements.values()) b.hidden = true;
    for (const v of candidates) {
      const pos = new THREE.Vector3(v.position[0], 12, v.position[1]);
      const dist = camera.position.distanceTo(pos);
      if (
        (dist > 700 || !featured.includes(v.id)) &&
        camera.position.y > 220 &&
        v.id !== selected?.id
      )
        continue;
      if (mode === "walk" && dist > 150) continue;
      const p = pos.project(camera);
      if (p.z > 1 || p.z < -1 || Math.abs(p.x) > 0.94 || Math.abs(p.y) > 0.78)
        continue;
      const x = (p.x * 0.5 + 0.5) * w,
        y = (-p.y * 0.5 + 0.5) * h;
      if (x < (w <= 700 ? 245 : 340) && y < h - 140) continue;
      if (
        occupied.some(
          (a) => Math.abs(a[0] - x) < 105 && Math.abs(a[1] - y) < 40,
        )
      )
        continue;
      if (count++ >= (w < 700 ? 5 : 12)) break;
      occupied.push([x, y]);
      const b = labelElements.get(v.id);
      b.hidden = false;
      b.style.left = x + "px";
      b.style.top = y + "px";
      b.classList.toggle("selected", v.id === selected?.id);
    }
  }
  const vb = bounds(data.boundary),
    pad = 35;
  const pathString = (ps) =>
    ps
      .map((p, i) => (i ? "L" : "M") + p.map((n) => n.toFixed(1)).join(","))
      .join(" ") + "Z";
  $("minimap").setAttribute(
    "viewBox",
    `${vb[0] - pad} ${vb[1] - pad} ${vb[2] - vb[0] + pad * 2} ${vb[3] - vb[1] + pad * 2}`,
  );
  function updateMap() {
    const ids = new Set(filtered.map((v) => v.id));
    const clusters = [];
    for (const v of filtered) {
      let c = clusters.find(
        (c) =>
          distance(c.p, v.position) < 38 &&
          v.id !== selected?.id &&
          c.id !== selected?.id,
      );
      if (c) c.members.push(v);
      else clusters.push({ p: v.position, id: v.id, members: [v] });
    }
    $("minimap").innerHTML =
      `<path d="${pathString(data.boundary)}" fill="#dce5c9" stroke="#a7b891" stroke-width="4"/>${data.water.map((w) => `<path d="${pathString(w.points)}" fill="#8fb6b1"/>`).join("")}${data.paths.map((p) => `<path d="${p.points.map((p, i) => (i ? "L" : "M") + p.join(",")).join(" ")}" fill="none" stroke="#faf8e8" stroke-width="${p.width * 1.6}"/>`).join("")}${data.buildings.map((b) => `<path d="${pathString(b.points)}" fill="#bcc6aa"/>`).join("")}${clusters.map((c) => `<g class="map-mark" role="button" tabindex="0" data-venue="${c.id}" aria-label="${esc(c.members.map((v) => v.name).join("、"))}"><title>${esc(c.members.map((v) => v.name).join(" / "))}</title><circle cx="${c.p[0]}" cy="${c.p[1]}" r="${c.id === selected?.id ? 15 : 10}" fill="${c.id === selected?.id ? "#ae6b2d" : "#466b50"}"/>${c.members.length > 1 ? `<text x="${c.p[0]}" y="${c.p[1] + 5}" text-anchor="middle" font-size="17" fill="white" stroke="none">${c.members.length}</text>` : ""}</g>`).join("")}<circle id="map-camera" cx="${camera.position.x}" cy="${camera.position.z}" r="9" fill="#d09638" stroke="white" stroke-width="3"/>`;
    window.__zoo && (window.__zoo.filteredVenueIds = [...ids]);
  }
  const sourceLinks =
    '<div class="data-links"><a href="./data/map.json" target="_blank">米制布局 JSON</a><a href="./data/venues.json" target="_blank">场馆表 JSON</a><a href="./data/species.json" target="_blank">物种表 JSON</a><a href="./data/sources.json" target="_blank">来源表 JSON</a><a href="./data/species-distribution.csv">分布表 CSV</a><a href="./data/missing-models.json" target="_blank">缺失模型</a><a href="./models/ASSET-LICENSES.md" target="_blank">素材许可</a><a href="./data/osm-derived-geography.json" target="_blank">派生地理数据 ODbL</a></div>';
  $("sources-content").innerHTML =
    `<p><strong>这是基于公开资料的米制参考场景，尚未达到实景级或测绘级复原。</strong>园区外包范围 ${Math.round(vb[2] - vb[0])} × ${Math.round(vb[3] - vb[1])} 米；1世界单位=1米。WGS84原点116.332°E、39.938°N，X向东、-Z向北、Y向上。高程只用相对地面0米；坡地、桥拱和台阶未实测。</p><p>OSM园界与建筑轮廓为公开地图数据，非实测管理界线。导览图只核对空间关系，不按示意图量尺寸。没有将GCJ-02、BD-09坐标直接混入WGS84。</p><p>${esc(data.meta.areaConflict)}</p><p>2026熊猫扩建：原雉鸡苑功能已改变，因此未保留为现有鸟类展区。图中旧熊猫馆基础轮廓仍来自2023年，扩建四个主题区精确轮廓缺失；不能用旧馆外观代表完整新馆。</p><p>建筑高度、门窗、围栏类型、植被密度和未注明宽度的道路属于估算。海洋馆仅外观并单独标识；工作人员区域、建筑室内、海洋动物和没有轮廓依据的室外围场不开放步行。</p><p>动物资料不代表今日在展。${species.length}条物种及类群记录含2020历史地图点位；仅1只非洲狮GLB作为演示，其位置与动画并非真实定位。模型来自kenchoo，保留NC及SA条件；动物素材不适用本站代码的AGPL许可，商业使用需另取得作者授权。</p>${sourceLinks}<h3>来源与用途 · 访问日期 2026-10-01</h3>${sources.map((s) => `<div class="source-record"><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a><p>资料日期：${esc(s.published || "未标注")} · ${esc(s.usage)}<br>许可：${esc(s.license)}</p></div>`).join("")}<p>地图署名 © OpenStreetMap contributors · ODbL 1.0。PBR材质 ambientCG CC0。Three.js MIT。原照片、全景、视频未用作可游览内容或背景。</p>`;
  listen($("results"), "click", (e) => {
    const b = e.target.closest("[data-venue]");
    if (b) selectVenue(b.dataset.venue);
  });
  listen($("labels"), "click", (e) => {
    const b = e.target.closest("[data-venue]");
    if (b) selectVenue(b.dataset.venue);
  });
  listen($("minimap"), "click", (e) => {
    const b = e.target.closest("[data-venue]");
    if (b) selectVenue(b.dataset.venue);
  });
  listen($("minimap"), "keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const b = e.target.closest("[data-venue]");
      if (b) {
        e.preventDefault();
        selectVenue(b.dataset.venue);
      }
    }
  });
  listen($("search"), "input", runFilter);
  listen($("filters"), "click", (e) => {
    const b = e.target.closest("[data-category]");
    if (!b) return;
    category = b.dataset.category;
    for (const x of $("filters").children)
      x.setAttribute("aria-pressed", x === b);
    runFilter();
  });
  listen($("close-info"), "click", () => ($("info").hidden = true));
  listen($("near-view"), "click", observe);
  listen($("walk-here"), "click", () => {
    setMode("walk");
    $("info").hidden = true;
  });
  listen($("orbit"), "click", () => {
    setMode("orbit");
    controls.target.set(
      camera.position.x - Math.sin(yaw) * 25,
      1,
      camera.position.z - Math.cos(yaw) * 25,
    );
    camera.position.y = Math.max(15, camera.position.y);
  });
  listen($("walk"), "click", () => setMode("walk"));
  listen($("home"), "click", overview);
  listen($("entrance"), "click", entrance);
  for (const [button, panel] of [
    ["fold-map", "map-panel"],
    ["fold-list", "explorer"],
  ])
    listen($(button), "click", () => {
      const folded = $(panel).classList.toggle("folded");
      $(button).textContent = folded ? "+" : "−";
      $(button).setAttribute("aria-expanded", !folded);
    });
  if (innerWidth <= 700) {
    $("explorer").classList.add("folded");
    $("fold-list").textContent = "+";
    $("fold-list").setAttribute("aria-expanded", false);
  }
  for (const [button, dialog] of [
    ["research", "sources-dialog"],
    ["help", "help-dialog"],
  ]) {
    listen($(button), "click", () => {
      keys.clear();
      if (document.pointerLockElement) document.exitPointerLock();
      $(dialog).showModal();
    });
    listen($(dialog).querySelector(".dialog-close"), "click", () =>
      $(dialog).close(),
    );
  }
  listen($("quality"), "change", () => {
    world.setQuality($("quality").value);
    toast(
      "画质已切换为" +
        $("quality").selectedOptions[0].text +
        "；分布数据保持完整",
    );
  });
  listen(
    $("stats-toggle"),
    "click",
    () => ($("stats").hidden = !$("stats").hidden),
  );
  listen(window, "resize", () => {
    world.resize();
    updateLabels(true);
  });
  listen(window, "blur", () => keys.clear());
  listen(document, "keydown", (e) => {
    if(e.code==='Escape'&&document.pointerLockElement){document.exitPointerLock();keys.clear();return;}
    if (
      ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(e.target.tagName) ||
      document.querySelector("dialog[open]")
    )
      return;
    if (
      mode === "walk" &&
      [
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.code)
    ) {
      keys.add(e.code);
      e.preventDefault();
    }
  });
  listen(document, "keyup", (e) => keys.delete(e.code));
  listen(document, "pointerlockchange", () => {
    keys.clear();
    $("walk-hint").hidden =
      document.pointerLockElement === renderer.domElement || mode !== "walk";
  });
  listen(document, "mousemove", (e) => {
    if (
      mode === "walk" &&
      document.pointerLockElement === renderer.domElement
    ) {
      yaw -= e.movementX * 0.002;
      pitch = Math.max(-1.2, Math.min(1.2, pitch - e.movementY * 0.002));
      camera.rotation.set(pitch, yaw, 0);
    }
  });
  let press = null;
  listen(
    renderer.domElement,
    "pointerdown",
    (e) => (press = [e.clientX, e.clientY]),
  );
  listen(renderer.domElement, "pointerup", async (e) => {
    if (!press || Math.hypot(e.clientX - press[0], e.clientY - press[1]) > 5)
      return;
    press = null;
    if (mode === "walk") {
      try {
        await renderer.domElement.requestPointerLock();
      } catch {
        toast("鼠标锁定不可用；仍可使用WASD移动，鸟瞰支持拖动观察");
      }
      return;
    }
    const rect = renderer.domElement.getBoundingClientRect(),
      mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    const hit = ray
      .intersectObjects(world.pickables, false)
      .find((h) => h.object.userData.venueId);
    if (hit) selectVenue(hit.object.userData.venueId);
  });
  const perf = { samples: frameSamples, quality: "medium" };
  window.__zoo = {
    ready: false,
    data,
    venues,
    species,
    sources,
    nav,
    world,
    camera,
    renderer,
    controls,
    perf,
    selectVenue,
    setMode,
    overview,
    observe,
    entrance,
    filteredVenueIds: [],
    get mode() {
      return mode;
    },
    get selected() {
      return selected;
    },
    get yaw() {
      return yaw;
    },
    get pitch() {
      return pitch;
    },
    move: (dx, dz) => {
      const q = nav.move([camera.position.x, camera.position.z], dx, dz);
      camera.position.set(q[0], (nav.ground(q) ?? 0.12) + 1.7, q[1]);
      return q;
    },
    dispose,
  };
  function frame(now) {
    if (disposed) return;
    const raw = Math.max(0, now - lastTime),
      last = lastTime;
    lastTime = now;
    const dt = Math.min(raw / 1000, 0.05);
    elapsed += dt;
    if (raw > 0 && raw < 300 && last > 0) {
      frameSamples.push(raw);
      if (frameSamples.length > 240) frameSamples.shift();
    }
    if (tween) {
      const t = Math.min(1, (now - tween.start) / (tween.duration || 1)),
        e = t * t * (3 - 2 * t);
      camera.position.lerpVectors(tween.from, tween.to, e);
      controls.target.lerpVectors(tween.targetFrom, tween.targetTo, e);
      if (t >= 1) tween = null;
    }
    if (mode === "walk" && !document.querySelector("dialog[open]")) {
      let f =
          (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) -
          (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0),
        s =
          (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
          (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
      const n = Math.hypot(f, s) || 1;
      const speed = 1.4 * dt;
      const dx = ((-Math.sin(yaw) * f + Math.cos(yaw) * s) / n) * speed,
        dz = ((-Math.cos(yaw) * f - Math.sin(yaw) * s) / n) * speed;
      const p = nav.move([camera.position.x, camera.position.z], dx, dz);
      camera.position.set(p[0], (nav.ground(p) ?? 0.12) + 1.7, p[1]);
      camera.rotation.set(pitch, yaw, 0);
    } else controls.update();
    const target = mode === "walk" ? camera.position : controls.target;
    world.update(dt, elapsed, target);
    renderer.render(world.scene, camera);
    updateLabels();
    if (elapsed - lastMap > 0.3) {
      lastMap = elapsed;
      const marker = $("map-camera");
      if (marker) {
        marker.setAttribute("cx", camera.position.x);
        marker.setAttribute("cy", camera.position.z);
      }
    }
    if (now - lastStats > 1000 && frameSamples.length > 0) {
      lastStats = now;
      const avg = frameSamples.reduce((s, n) => s + n, 0) / frameSamples.length;
      perf.quality = $("quality").value;
      perf.frameMs = avg;
      perf.fps = 1000 / avg;
      perf.drawCalls = renderer.info.render.calls;
      perf.triangles = renderer.info.render.triangles;
      $("stats").textContent =
        `${perf.fps.toFixed(1)} fps · ${avg.toFixed(1)} ms · ${perf.drawCalls} calls · ${(perf.triangles / 1e6).toFixed(2)} M tris`;
    }
  }
  runFilter();
  entrance();
  await Promise.race([
    world.ensureAnimal(),
    new Promise((resolve) => setTimeout(resolve, 15000)),
  ]);
  if (!world.animalStatus.loaded && !world.animalStatus.error)
    failure("模型仍在加载；可先游览园区，加载完成后将自动出现");
  if (warnings.length) progress(100, "部分资源失败，场景仍可游览");
  else progress(100, "准备就绪");
  lastTime = performance.now();
  renderer.setAnimationLoop(frame);
  window.__zoo.ready = true;
  $("loading").hidden = true;
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimeout(toastTimer);
    abort.abort();
    controls.dispose();
    world.dispose();
  }
  listen(window, "pagehide", dispose, { once: true });
  window.addEventListener('pageshow',e=>{if(e.persisted&&disposed)location.reload();});
}
init().catch((e) => {
  console.error(e);
  $("loading").innerHTML =
    `<div class="loader-brand">场景暂时无法启动</div><p>${esc(e.message)}</p><p>请检查WebGL支持和资源路径；可先查看场馆与物种资料。</p><p><a href="./data/venues.json">场馆资料</a> · <a href="./data/species.json">动物资料</a></p><button onclick="location.reload()">重新加载</button>`;
  world?.dispose();
});
