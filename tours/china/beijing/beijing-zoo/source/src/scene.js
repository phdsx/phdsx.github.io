import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { inside, bounds, centroid, distance, segmentPoint } from "./geo.js";

function rng(seed = 71) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function shape(points, holes = []) {
  const s = new THREE.Shape(points.map((p) => new THREE.Vector2(p[0], -p[1])));
  for (const h of holes)
    s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], -p[1]))));
  return s;
}
export function createScene(
  container,
  data,
  venues,
  nav,
  onProgress,
  onFailure,
) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#bdd4df");
  scene.fog = new THREE.Fog("#bdd4df", 1500, 4500);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.15, 5500);
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.32;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight("#dceaf2", "#546448", 2.4));
  const sun = new THREE.DirectionalLight("#fff1d2", 3.25);
  sun.position.set(-300, 650, 230);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 1200;
  sun.shadow.normalBias = 0.07;
  sun.shadow.bias = -0.0003;
  scene.add(sun, sun.target);
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_, n, total) =>
    onProgress(
      Math.min(94, 35 + (n / total) * 55),
      "加载材质与模型 " + n + " / " + total,
    );
  manager.onError = (u) => onFailure("资源加载失败：" + u.split("/").at(-1));
  const loader = new THREE.TextureLoader(manager),
    modelLoader = new GLTFLoader(manager);
  let disposed = false;
  const textures = [];
  const mat = (color, roughness = 0.85) =>
    new THREE.MeshStandardMaterial({ color, roughness });
  function pbr(name, scale, color) {
    const maps = {};
    for (const [kind, prop] of [
      ["color", "map"],
      ["normalgl", "normalMap"],
      ["roughness", "roughnessMap"],
    ]) {
      const t = loader.load("./textures/" + name + "-" + kind + ".webp");
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1 / scale, 1 / scale);
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (prop === "map") t.colorSpace = THREE.SRGBColorSpace;
      textures.push(t);
      maps[prop] = t;
    }
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.92,
      normalScale: new THREE.Vector2(0.3, 0.3),
      ...maps,
    });
  }
  const groundMat = pbr("forest", 8, "#bbbea0"),
    paving = pbr("paving", 3, "#d2cebe"),
    stone = pbr("rock", 4, "#c4c0b3"),
    bark = pbr("bark", 2, "#9a9279");
  groundMat.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec3 vGroundPos;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvGroundPos=position;",
      );
    shader.fragmentShader =
      "varying vec3 vGroundPos;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat groundVariation=sin(vGroundPos.x*.026+sin(vGroundPos.y*.035))*cos(vGroundPos.y*.018+vGroundPos.x*.006); diffuseColor.rgb*=mix(vec3(.73,.81,.62),vec3(1.,1.,.96),groundVariation*.5+.5);",
      );
  };
  const concrete = mat("#b4b5a8"),
    roofMat = mat("#6b7770"),
    redBrick = mat("#967263"),
    wood = mat("#6c5945"),
    metal = new THREE.MeshStandardMaterial({
      color: "#536158",
      metalness: 0.55,
      roughness: 0.62,
    });
  const glass = new THREE.MeshPhysicalMaterial({
    color: "#bbd7d1",
    roughness: 0.12,
    metalness: 0.05,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    envMapIntensity: 1.2,
    side: THREE.DoubleSide,
  });
  const decor = {
    stone: [],
    concrete: [],
    roof: [],
    brick: [],
    wood: [],
    metal: [],
    glass: [],
  };
  function box(arr, sz, pos, angle = 0) {
    const g = new THREE.BoxGeometry(...sz);
    g.rotateY(angle);
    g.translate(...pos);
    arr.push(g);
  }
  function cylinder(arr, a, b, r1, r2) {
    const d = new THREE.Vector3().subVectors(
      new THREE.Vector3(...b),
      new THREE.Vector3(...a),
    );
    const g = new THREE.CylinderGeometry(r2, r1, d.length(), 9);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        d.normalize(),
      ),
    );
    g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    arr.push(g);
  }
  function polygon(points, material, y = 0, holes = []) {
    const g = new THREE.ShapeGeometry(shape(points, holes));
    g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, material);
    mesh.position.y = y;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  polygon(data.boundary, groundMat);
  const outside = new THREE.Mesh(
    new THREE.PlaneGeometry(7000, 7000),
    mat("#afbaa7"),
  );
  outside.rotation.x = -Math.PI / 2;
  outside.position.y = -0.08;
  scene.add(outside);
  // Geographic footways: width is recorded as estimate when OSM has no width.
  const roadGeometries = [];
  for (const path of data.paths)
    for (let i = 1; i < path.points.length; i++) {
      const a = path.points[i - 1],
        b = path.points[i],
        l = distance(a, b),
        ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
      box(
        roadGeometries,
        [path.width, 0.16, l + 0.2],
        [(a[0] + b[0]) / 2, 0.025, (a[1] + b[1]) / 2],
        ang,
      );
      if (path.bridge) {
        for (const side of [-1, 1]) {
          const dx = ((Math.cos(ang) * path.width) / 2) * side,
            dz = ((-Math.sin(ang) * path.width) / 2) * side;
          cylinder(
            decor.metal,
            [a[0] + dx, 1.05, a[1] + dz],
            [b[0] + dx, 1.05, b[1] + dz],
            0.045,
            0.045,
          );
          for (let t = 0; t < l; t += 2) {
            const x = a[0] + ((b[0] - a[0]) * t) / l + dx,
              z = a[1] + ((b[1] - a[1]) * t) / l + dz;
            cylinder(decor.metal, [x, 0.1, z], [x, 1.1, z], 0.04, 0.04);
          }
        }
      }
    }
  const roads = new THREE.Mesh(mergeGeometries(roadGeometries), paving);
  roads.receiveShadow = true;
  scene.add(roads);
  roadGeometries.forEach((g) => g.dispose());
  const waterUniforms = { time: { value: 0 } };
  const waterMaterial = new THREE.MeshPhysicalMaterial({
    color: "#477b77",
    roughness: 0.24,
    metalness: 0.2,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    envMapIntensity: 0.75,
  });
  waterMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waterUniforms.time;
    shader.vertexShader =
      "uniform float uTime; varying vec3 vWaterPos;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvWaterPos=position; transformed.z += .035*sin(position.x*.3+uTime*.7)*cos(position.y*.24-uTime*.4);",
      );
    shader.fragmentShader =
      "uniform float uTime; varying vec3 vWaterPos;\n" +
      shader.fragmentShader.replace(
        "#include <normal_fragment_begin>",
        "#include <normal_fragment_begin>\n normal=normalize(normal+vec3(.08*sin(vWaterPos.x*.9+uTime),.08*cos(vWaterPos.y*.65-uTime*.8),0.));",
      );
  };
  for (const w of data.water) {
    polygon(w.points, waterMaterial, 0.03, w.holes || []);
    for (let i = 1; i < w.points.length; i++) {
      const a = w.points[i - 1],
        b = w.points[i];
      if (distance(a, b) > 150) continue;
      box(
        decor.stone,
        [0.65, 0.55, distance(a, b)],
        [(a[0] + b[0]) / 2, -0.1, (a[1] + b[1]) / 2],
        Math.atan2(b[0] - a[0], b[1] - a[1]),
      );
    }
  }
  // Footprint-preserving buildings with facade bays, parapets, roof edges and glazing.
  const pickables = [];
  const buildingMeshes = [];
  for (const b of data.buildings) {
    const venue = venues.find((v) => v.osmId === b.id.slice(4));
    let h = b.height;
    if (b.name.includes("长颈鹿")) h = 10;
    if (b.name.includes("海洋馆")) h = 19;
    if (b.name.includes("畅观楼")) h = 14;
    if (b.name.includes("陆谟克")) h = 12;
    if (b.name.includes("科普")) h = 13;
    b.height = h;
    const ge = new THREE.ExtrudeGeometry(shape(b.points), {
      depth: h,
      bevelEnabled: false,
      steps: 1,
    });
    ge.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(
      ge,
      b.name.includes("畅观") || b.name.includes("陆谟") ? redBrick : concrete,
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.venueId = venue?.id;
    scene.add(mesh);
    buildingMeshes.push(mesh);
    if (venue) pickables.push(mesh);
    polygon(b.points, roofMat, h + 0.04);
    for (let i = 1; i < b.points.length; i++) {
      const a = b.points[i - 1],
        c = b.points[i],
        l = distance(a, c);
      if (l < 1.3) continue;
      const ang = Math.atan2(c[0] - a[0], c[1] - a[1]);
      const nx = (c[1] - a[1]) / l,
        nz = -(c[0] - a[0]) / l;
      box(
        decor.concrete,
        [0.35, 0.28, l + 0.2],
        [(a[0] + c[0]) / 2, h + 0.22, (a[1] + c[1]) / 2],
        ang,
      );
      box(
        decor.stone,
        [0.15, 0.6, l],
        [(a[0] + c[0]) / 2, 0.3, (a[1] + c[1]) / 2],
        ang,
      );
      for (let t = 2; t < l - 1.3; t += 3.6)
        for (let y = 1.8; y < h - 1; y += 3.8) {
          const x = a[0] + ((c[0] - a[0]) * t) / l,
            z = a[1] + ((c[1] - a[1]) * t) / l;
          box(decor.metal, [0.22, 1.85, 1.85], [x, y + 0.5, z], ang);
          box(decor.glass, [0.245, 1.6, 1.6], [x, y + 0.5, z], ang);
          box(decor.concrete, [0.55, 0.13, 2.1], [x, y - 0.37, z], ang);
        }
    }
    if (b.name.includes("熊猫")) {
      const [x, z] = centroid(b.points);
      const r = 8.5;
      const g = new THREE.ConeGeometry(r, 2.7, 40, 1, true);
      const roof = new THREE.Mesh(g, roofMat);
      roof.position.set(x, h + 1.35, z);
      roof.castShadow = true;
      scene.add(roof);
    }
    if (b.name.includes("畅观")) {
      const bb = bounds(b.points),
        [x, z] = centroid(b.points),
        w = bb[2] - bb[0],
        d = bb[3] - bb[1];
      box(decor.roof, [w + 1.5, 1, d + 1.5], [x, h + 0.7, z]);
      const mansard = new THREE.CylinderGeometry(0.72, 1, 3, 4);
      mansard.scale(w * 0.6, 1, d * 0.6);
      mansard.rotateY(Math.PI / 4);
      const roof = new THREE.Mesh(mansard, roofMat);
      roof.position.set(x, h + 2, z);
      scene.add(roof);
      for (const dx of [-w * 0.35, w * 0.35]) {
        cylinder(decor.brick, [x + dx, h, z], [x + dx, h + 4.3, z], 0.8, 0.8);
      }
    }
    if (b.name.includes("海洋馆")) {
      const [x, z] = centroid(b.points),
        bb = bounds(b.points),
        w = bb[2] - bb[0],
        d = bb[3] - bb[1];
      const geo = new THREE.SphereGeometry(
        1,
        48,
        16,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      );
      const canopy = new THREE.Mesh(geo, mat("#4d8b92", 0.45));
      canopy.scale.set(w * 0.42, 9, d * 0.42);
      canopy.position.set(x, h, z);
      canopy.userData.venueId = venue?.id;
      scene.add(canopy);
      pickables.push(canopy);
    }
  }
  // Three arch south gate, inspired by the official reference photo. Relief is simplified.
  const gate = venues.find((v) => v.id === "south-gate"),
    [gx, gz] = gate.position;
  const facade = new THREE.Shape();
  facade.moveTo(-10, 0);
  facade.lineTo(-10, 7.3);
  facade.lineTo(-7.5, 7.3);
  facade.quadraticCurveTo(-6, 10, -3.4, 10);
  facade.lineTo(-3.4, 10.1);
  facade.quadraticCurveTo(0, 14, 3.4, 10.1);
  facade.lineTo(3.4, 10);
  facade.quadraticCurveTo(6, 10, 7.5, 7.3);
  facade.lineTo(10, 7.3);
  facade.lineTo(10, 0);
  facade.closePath();
  for (const [cx, r, cy] of [
    [-6.4, 1.8, 2.4],
    [0, 2.4, 3],
    [6.4, 1.8, 2.4],
  ]) {
    const p = new THREE.Path();
    p.moveTo(cx - r, 0);
    p.lineTo(cx - r, cy);
    p.absarc(cx, cy, r, Math.PI, 0, true);
    p.lineTo(cx + r, 0);
    p.closePath();
    facade.holes.push(p);
    for (let a = 0; a < Math.PI; a += Math.PI / 14) {
      const x = gx + cx + Math.cos(a) * (r + 0.16),
        y = cy + Math.sin(a) * (r + 0.16);
      box(decor.concrete, [0.38, 0.28, 1.1], [x, y, gz], -a);
    }
  }
  const gg = new THREE.ExtrudeGeometry(facade, {
    depth: 0.9,
    bevelEnabled: true,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    bevelSegments: 2,
  });
  const gateMaterial = mat("#a9aaa3", 0.95);
  gateMaterial.normalMap = stone.normalMap;
  gateMaterial.normalScale = new THREE.Vector2(0.2, 0.2);
  const gm = new THREE.Mesh(gg, gateMaterial);
  gm.position.set(gx, 0, gz - 0.45);
  gm.castShadow = true;
  gm.receiveShadow = true;
  gm.userData.venueId = gate.id;
  scene.add(gm);
  pickables.push(gm);
  for (const x of [-10, -3.5, 3.5, 10]) {
    box(decor.concrete, [0.55, 8, 0.95], [gx + x, 4, gz]);
    box(decor.concrete, [0.95, 0.32, 1.35], [gx + x, 8, gz]);
  }
  box(decor.concrete, [20.4, 0.32, 1.3], [gx, 7.1, gz]);
  function sign(text, w, h) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#e8e8db";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = "#75806a";
    ctx.lineWidth = 7;
    ctx.strokeRect(16, 16, 992, 224);
    ctx.fillStyle = "#3a4d3c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "100px Microsoft YaHei";
    ctx.fillText(text, 512, 135);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t);
    return new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: t,
        roughness: 0.8,
        side: THREE.DoubleSide,
      }),
    );
  }
  const nameboard = sign("北京动物园", 5.8, 1.35);
  nameboard.position.set(gx, 7.88, gz + 0.67);
  scene.add(nameboard);
  // Geometric stone tracery; it conveys relief depth without copying protected photographs.
  const reliefMat = mat("#c1c2b8", 0.95);
  const reliefParts = [];
  for (const side of [-1, 1])
    for (let row = 0; row < 5; row++) {
      const curve = new THREE.CatmullRomCurve3(
        Array.from(
          { length: 18 },
          (_, i) =>
            new THREE.Vector3(
              gx + side * (3.9 + i * 0.31),
              6.3 + row * 0.37 + Math.sin(i * 0.6 + row) * 0.22,
              gz + 0.61,
            ),
        ),
      );
      reliefParts.push(new THREE.TubeGeometry(curve, 35, 0.035, 5, false));
    }
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3(
      Array.from({ length: 8 }, (_, j) => {
        const r = 1 + j * 0.1;
        return new THREE.Vector3(
          gx + Math.cos(a + j * 0.08) * r,
          10.5 + Math.sin(a + j * 0.08) * r,
          gz + 0.61,
        );
      }),
    );
    reliefParts.push(new THREE.TubeGeometry(curve, 10, 0.04, 5, false));
  }
  const relief = new THREE.Mesh(mergeGeometries(reliefParts), reliefMat);
  scene.add(relief);
  reliefParts.forEach((g) => g.dispose());
  // Gate approach is explicitly a photo-based estimate, not a surveyed plaza.
  polygon(
    [
      [gx - 17, gz - 8],
      [gx + 17, gz - 8],
      [gx + 17, gz + 10],
      [gx - 17, gz + 10],
      [gx - 17, gz - 8],
    ],
    paving,
    0.11,
  );
  for (const v of venues.filter((v) => v.geometry && v.speciesIds.length)) {
    const sp = nav.spawn(v.position).position;
    const dir = new THREE.Vector2(
      v.position[0] - sp[0],
      v.position[1] - sp[1],
    ).normalize();
    const x = sp[0] + dir.x * 1.8,
      z = sp[1] + dir.y * 1.8;
    const s = sign(v.name.replace("（地图猿猴馆）", ""), 3.2, 0.68);
    s.position.set(x, 1.85, z);
    s.rotation.y = Math.atan2(-dir.x, -dir.y);
    s.userData.venueId = v.id;
    scene.add(s);
    pickables.push(s);
    cylinder(decor.metal, [x, 0.12, z], [x, 1.6, z], 0.07, 0.07);
  }
  const lionEnclosure = data.enclosures.find((e) => e.name === "狮虎山");
  let lionPoint = lionEnclosure ? centroid(lionEnclosure.points) : null;
  if (lionEnclosure) {
    const bb = bounds(lionEnclosure.points);
    let score = -Infinity;
    for (let x = bb[0] + 2; x < bb[2]; x += 3)
      for (let z = bb[1] + 2; z < bb[3]; z += 3) {
        if (
          !inside([x, z], lionEnclosure.points) ||
          data.buildings.some((b) => inside([x, z], b.points))
        )
          continue;
        const nearest = Math.min(
          ...nav.segments.map((s) =>
            distance([x, z], segmentPoint([x, z], s.a, s.b)),
          ),
        );
        const s =
          -Math.abs(nearest - 7) -
          distance([x, z], centroid(lionEnclosure.points)) * 0.03;
        if (s > score) {
          score = s;
          lionPoint = [x, z];
        }
      }
  }
  // Mapped enclosure boundaries. Construction type and barrier height are explicitly estimates.
  for (const e of data.enclosures) {
    let height = e.name === "狮虎山" ? 3.7 : 2.1;
    const center = centroid(e.points);
    for (let i = 1; i < e.points.length; i++) {
      const a = e.points[i - 1],
        b = e.points[i],
        l = distance(a, b);
      for (let t = 0; t < l; t += 2.4) {
        const x = a[0] + ((b[0] - a[0]) * t) / l,
          z = a[1] + ((b[1] - a[1]) * t) / l;
        cylinder(decor.metal, [x, 0, z], [x, height, z], 0.07, 0.07);
      }
      for (const y of [0.7, height])
        cylinder(decor.metal, [a[0], y, a[1]], [b[0], y, b[1]], 0.055, 0.055);
      for (let t = 0.5; t < l; t += 0.75) {
        const x = a[0] + ((b[0] - a[0]) * t) / l,
          z = a[1] + ((b[1] - a[1]) * t) / l;
        cylinder(decor.metal, [x, 0, z], [x, height, z], 0.018, 0.018);
      }
    }
    const v = venues.find((v) => v.osmId === e.id.slice(4));
    const floor = polygon(e.points, groundMat, 0.025);
    floor.userData.venueId = v?.id;
    if (v) pickables.push(floor);
    if (e.name === "狮虎山") {
      const random = rng(352);
      for (let i = 0; i < 23; i++) {
        const x = center[0] - 25 + random() * 50,
          z = center[1] - 12 + random() * 38;
        if (!inside([x, z], e.points) || distance([x, z], lionPoint) < 9)
          continue;
        const g = new THREE.DodecahedronGeometry(1, 2);
        const rock = new THREE.Mesh(g, stone);
        rock.position.set(x, 1.8, z);
        rock.scale.set(2 + random() * 5, 2 + random() * 4, 2 + random() * 4);
        rock.rotation.set(random() * 0.3, random() * 6, random() * 0.2);
        rock.castShadow = true;
        rock.receiveShadow = true;
        rock.userData.venueId = v?.id;
        scene.add(rock);
        if (v) pickables.push(rock);
      }
    }
  }
  // Benches and lamps beside paths, never placed in the centre of the visitor corridor.
  for (let i = 0; i < nav.segments.length; i += 14) {
    const s = nav.segments[i],
      l = distance(s.a, s.b);
    if (l < 6 || s.bridge) continue;
    const p = segmentPoint(
      [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2],
      s.a,
      s.b,
    );
    const a = Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    const x = p[0] + Math.cos(a) * (s.width / 2 + 0.65),
      z = p[1] - Math.sin(a) * (s.width / 2 + 0.65);
    if (nav.blocked([x, z])) continue;
    box(decor.wood, [1.8, 0.12, 0.55], [x, 0.5, z], a);
    box(decor.wood, [1.8, 0.55, 0.1], [x, 0.9, z + 0.27], a);
    for (const dx of [-0.65, 0.65])
      box(decor.metal, [0.09, 0.5, 0.5], [x + dx, 0.25, z], a);
    cylinder(decor.metal, [x + 2.6, 0, z], [x + 2.6, 4.2, z], 0.05, 0.05);
    box(decor.concrete, [0.45, 0.2, 0.45], [x + 2.6, 4.25, z]);
  }
  for (const svc of data.services) {
    const [x, z] = svc.position;
    const s = sign("WC", 1.2, 0.7);
    s.position.set(x, 2.4, z);
    scene.add(s);
  }
  for (const [key, arr] of Object.entries(decor)) {
    if (!arr.length) continue;
    const materials = {
      stone,
      concrete,
      roof: roofMat,
      brick: redBrick,
      wood,
      metal,
      glass,
    };
    const mesh = new THREE.Mesh(mergeGeometries(arr), materials[key]);
    mesh.castShadow = key !== "glass";
    mesh.receiveShadow = true;
    scene.add(mesh);
    arr.forEach((g) => g.dispose());
  }
  // Vegetation uses layered leaf cutouts and instanced trunks / branches in spatial LOD chunks.
  const leafCanvas = document.createElement("canvas");
  leafCanvas.width = leafCanvas.height = 256;
  const ctx = leafCanvas.getContext("2d"),
    lr = rng(33);
  for (let i = 0; i < 1200; i++) {
    const a = lr() * Math.PI * 2,
      r = Math.sqrt(lr()) * 111,
      x = 128 + Math.cos(a) * r,
      y = 128 + Math.sin(a) * r * 0.86;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lr() * 6.28);
    ctx.fillStyle = ["#5c7545", "#788851", "#4d673d", "#879761", "#657f49"][
      Math.floor(lr() * 5)
    ];
    ctx.beginPath();
    ctx.ellipse(0, 0, 4 + lr() * 5, 2 + lr() * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const leafTexture = new THREE.CanvasTexture(leafCanvas);
  leafTexture.colorSpace = THREE.SRGBColorSpace;
  textures.push(leafTexture);
  const leafMaterial = new THREE.MeshStandardMaterial({
    map: leafTexture,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
    roughness: 0.93,
  });
  const treePoints = [],
    random = rng(971),
    seen = new Set();
  const forbidden = (p) =>
    !inside(p, data.boundary) ||
    nav.blocked(p, 2) ||
    data.water.some((w) => inside(p, w.points)) ||
    nav.segments.some(
      (s) => distance(p, segmentPoint(p, s.a, s.b)) < s.width / 2 + 1.5,
    );
  function addTree(p) {
    const k = Math.round(p[0] / 5) + "," + Math.round(p[1] / 5);
    if (seen.has(k) || forbidden(p)) return;
    seen.add(k);
    treePoints.push({
      p,
      h: 9 + random() * 9,
      w: 4.3 + random() * 4.5,
      a: random() * 6.28,
    });
  }
  for (const s of nav.segments) {
    const l = distance(s.a, s.b);
    if (s.bridge) continue;
    const dx = (s.b[1] - s.a[1]) / l,
      dz = -(s.b[0] - s.a[0]) / l;
    for (let t = 6; t < l; t += 11 + random() * 5)
      for (const side of [-1, 1]) {
        const offset = s.width / 2 + 4.5 + random() * 3;
        addTree([
          s.a[0] + ((s.b[0] - s.a[0]) * t) / l + dx * offset * side,
          s.a[1] + ((s.b[1] - s.a[1]) * t) / l + dz * offset * side,
        ]);
        // Additional groves follow path corridors; keep deliberate open lawns between them.
        if (random() > 0.3)
          for (const row of [18, 31]) {
            addTree([
              s.a[0] +
                ((s.b[0] - s.a[0]) * t) / l +
                dx * (row + random() * 8) * side,
              s.a[1] +
                ((s.b[1] - s.a[1]) * t) / l +
                dz * (row + random() * 8) * side,
            ]);
          }
      }
  }
  for (const f of data.forests) {
    const b = bounds(f.points);
    for (
      let i = 0;
      i < Math.min(1800, ((b[2] - b[0]) * (b[3] - b[1])) / 110);
      i++
    ) {
      const p = [
        b[0] + random() * (b[2] - b[0]),
        b[1] + random() * (b[3] - b[1]),
      ];
      if (inside(p, f.points)) addTree(p);
    }
  }
  // Gardens: clusters along water banks rather than blanket scattering across all plots.
  for (const w of data.water)
    for (let i = 1; i < w.points.length; i++) {
      const a = w.points[i - 1],
        b = w.points[i],
        l = distance(a, b);
      for (let t = 3; t < l; t += 14) {
        const p = [
          a[0] + ((b[0] - a[0]) * t) / l,
          b === a ? b[1] : a[1] + ((b[1] - a[1]) * t) / l,
        ];
        for (const side of [-1, 1])
          addTree([
            p[0] + ((b[1] - a[1]) / l) * 6 * side,
            p[1] - ((b[0] - a[0]) / l) * 6 * side,
          ]);
      }
    }
  const treeChunks = [];
  const chunks = new Map();
  for (const t of treePoints) {
    const key = Math.floor(t.p[0] / 120) + "," + Math.floor(t.p[1] / 120);
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push(t);
  }
  const tmp = new THREE.Object3D(),
    color = new THREE.Color();
  for (const ts of chunks.values()) {
    const near = new THREE.Group(),
      far = new THREE.Group(),
      lod = new THREE.LOD();
    const c = ts.reduce(
      (s, t) => [s[0] + t.p[0] / ts.length, s[1] + t.p[1] / ts.length],
      [0, 0],
    );
    lod.position.set(c[0], 0, c[1]);
    scene.add(lod);
    lod.addLevel(near, 0);
    lod.addLevel(far, 260);
    const trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.14, 0.3, 1, 9),
      bark,
      ts.length,
    );
    const leaves = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      leafMaterial,
      ts.length * 7,
    );
    const impostors = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      leafMaterial,
      ts.length * 3,
    );
    const branches = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.06, 0.12, 1, 7),
      bark,
      ts.length * 3,
    );
    for (let i = 0; i < ts.length; i++) {
      const t = ts[i],
        x = t.p[0] - c[0],
        z = t.p[1] - c[1];
      tmp.position.set(x, t.h * 0.26, z);
      tmp.scale.set(1, t.h * 0.52, 1);
      tmp.rotation.set(0, 0, 0);
      tmp.updateMatrix();
      trunks.setMatrixAt(i, tmp.matrix);
      for (let j = 0; j < 7; j++) {
        const a = j * Math.PI * 0.37 + t.a;
        tmp.position.set(
          x + Math.cos(a) * t.w * 0.14,
          t.h * 0.7 + ((j % 3) - 1) * t.h * 0.08,
          z + Math.sin(a) * t.w * 0.14,
        );
        tmp.rotation.set(j === 6 ? Math.PI / 2 : (j % 2) * 0.3, a, 0);
        tmp.scale.set(
          t.w * (1 + (j % 2) * 0.3),
          j === 6 ? t.w * 1.3 : t.h * 0.55,
          1,
        );
        tmp.updateMatrix();
        leaves.setMatrixAt(i * 7 + j, tmp.matrix);
        color.setHSL(
          0.24 + random() * 0.025,
          0.2 + random() * 0.08,
          0.55 + random() * 0.2,
        );
        leaves.setColorAt(i * 7 + j, color);
      }
      for (let j = 0; j < 3; j++) {
        tmp.position.set(x, t.h * 0.69, z);
        tmp.rotation.set(j === 2 ? Math.PI / 2 : 0, (j * Math.PI) / 2 + t.a, 0);
        tmp.scale.set(t.w * 1.5, j === 2 ? t.w * 1.5 : t.h * 0.65, 1);
        tmp.updateMatrix();
        impostors.setMatrixAt(i * 3 + j, tmp.matrix);
      }
      for (let j = 0; j < 3; j++) {
        const a = t.a + j * 2.1;
        tmp.position.set(
          x + Math.cos(a) * 0.7,
          t.h * 0.47 + j * 0.7,
          z + Math.sin(a) * 0.7,
        );
        tmp.rotation.set(0.75, a, 0);
        tmp.scale.set(1, t.h * 0.24, 1);
        tmp.updateMatrix();
        branches.setMatrixAt(i * 3 + j, tmp.matrix);
      }
    }
    trunks.castShadow = branches.castShadow = leaves.castShadow = true;
    trunks.receiveShadow = branches.receiveShadow = leaves.receiveShadow = true;
    near.add(trunks, leaves, branches);
    far.add(impostors);
    treeChunks.push(lod);
  }
  // Small shrubs, arranged at path edges; repeated hedge modules use instancing.
  const hedgeGeo = new THREE.IcosahedronGeometry(1, 2),
    hedgeMat = mat("#70815b");
  const hedgePts = treePoints.filter((_, i) => i % 3 === 0);
  const hedges = new THREE.InstancedMesh(hedgeGeo, hedgeMat, hedgePts.length);
  for (let i = 0; i < hedgePts.length; i++) {
    const t = hedgePts[i];
    tmp.position.set(t.p[0] + 1.2, 0.7, t.p[1]);
    tmp.rotation.set(0.2, t.a, 0.1);
    tmp.scale.set(1.8, 0.85, 1.3);
    tmp.updateMatrix();
    hedges.setMatrixAt(i, tmp.matrix);
  }
  hedges.receiveShadow = true;
  scene.add(hedges);
  let quality = "medium",
    animal = null,
    animalLoading = null;
  const animalStatus = { loaded: false, error: null, animation: null };
  async function ensureAnimal() {
    if (disposed || !lionPoint) return;
    if (animal) return animal;
    if (animalLoading) return animalLoading;
    animalLoading = modelLoader
      .loadAsync("./models/lion.glb")
      .then((gltf) => {
        if (disposed) {
          gltf.scene.traverse((o) => {
            o.geometry?.dispose();
            if (o.material) {
              const ms = Array.isArray(o.material) ? o.material : [o.material];
              ms.forEach((m) => {
                for (const value of Object.values(m)) if (value?.isTexture) value.dispose();
                m.dispose();
              });
            }
          });
          return;
        }
        const root = new THREE.Group();
        const model = gltf.scene;
        model.updateMatrixWorld(true);
        const bb = new THREE.Box3().setFromObject(model),
          sz = bb.getSize(new THREE.Vector3());
        const scale = 2.65 / Math.max(sz.x, sz.z);
        model.scale.multiplyScalar(scale);
        model.updateMatrixWorld(true);
        const sb = new THREE.Box3().setFromObject(model),
          cp = sb.getCenter(new THREE.Vector3());
        model.position.add(new THREE.Vector3(-cp.x, -sb.min.y, -cp.z));
        root.add(model);
        root.position.set(lionPoint[0], 0.05, lionPoint[1]);
        model.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.userData.venueId = "v-273416876";
            pickables.push(o);
            const ms = Array.isArray(o.material) ? o.material : [o.material];
            ms.forEach((m) => {
              m.roughness = Math.max(0.75, m.roughness || 0);
              m.metalness = 0;
            });
          }
        });
        scene.add(root);
        const mixer = new THREE.AnimationMixer(model);
        const clip = gltf.animations[0];
        if (clip) {
          const action = mixer.clipAction(clip);
          action.play();
          action.time = clip.duration * 0.32;
          action.paused = true;
          animalStatus.animation =
            "骨骼待机：轻微呼吸和转头；源动画移动与脚部接地需独立验证，未播放行走";
        }
        const head = model.getObjectByName("Bip01-Head_9_3");
        const chest = model.getObjectByName("Bip01-Spine1_6_16");
        animal = {
          root,
          model,
          mixer,
          scale,
          baseScale: model.scale.clone(),
          head,
          headRotation: head?.quaternion.clone(),
          chest,
          chestScale: chest?.scale.clone(),
          phase: 1.7,
          elapsed: 0,
          box: sb,
          clips: gltf.animations.map((c) => ({
            name: c.name,
            duration: c.duration,
          })),
          point: lionPoint,
        };
        animalStatus.loaded = true;
        return animal;
      })
      .catch((e) => {
        animalStatus.error = e.message;
        onFailure("狮子模型加载失败；场馆与物种资料仍可使用");
        return null;
      });
    return animalLoading;
  }
  function setQuality(q) {
    quality = q;
    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        { low: 1, medium: 1.4, high: 1.8 }[q],
      ),
    );
    renderer.shadowMap.enabled = q !== "low";
    sun.shadow.mapSize.set(
      q === "high" ? 2048 : 1024,
      q === "high" ? 2048 : 1024,
    );
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
    for (const lod of treeChunks)
      lod.levels[1].distance = { low: 130, medium: 260, high: 420 }[q];
    hedges.visible = q !== "low";
    resize();
  }
  function resize() {
    const w = container.clientWidth,
      h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  let shadowAnchor = new THREE.Vector3(Infinity, 0, 0),
    frames = 0;
  function update(dt, elapsed, target) {
    waterUniforms.time.value = elapsed;
    if (
      lionPoint &&
      camera.position.distanceTo(
        new THREE.Vector3(lionPoint[0], 0, lionPoint[1]),
      ) < 350
    )
      ensureAnimal();
    if (animal) {
      const d = camera.position.distanceTo(animal.root.position);
      animal.root.visible = d < 1000;
      if (d < 220) {
        animal.elapsed += dt;
        if (animal.elapsed > { low: 0.15, medium: 0.07, high: 0.03 }[quality]) {
          if (animal.head) {
            animal.head.quaternion
              .copy(animal.headRotation)
              .multiply(
                new THREE.Quaternion().setFromAxisAngle(
                  new THREE.Vector3(1, 0, 0),
                  Math.sin(elapsed * 0.22 + animal.phase) * 0.055,
                ),
              );
          }
          if (animal.chest) {
            animal.chest.scale.copy(animal.chestScale);
            animal.chest.scale.z *=
              1 + Math.sin(elapsed * 0.8 + animal.phase) * 0.005;
          }
          animal.elapsed = 0;
        }
      }
    }
    if (frames++ % 20 === 0 && shadowAnchor.distanceTo(target) > 8) {
      shadowAnchor.copy(target);
      sun.target.position.copy(target).setY(0);
      sun.position
        .copy(sun.target.position)
        .add(new THREE.Vector3(-300, 650, 230));
      const span = camera.position.y > 150 ? 600 : 90;
      Object.assign(sun.shadow.camera, {
        left: -span,
        right: span,
        top: span,
        bottom: -span,
      });
      sun.shadow.camera.updateProjectionMatrix();
    }
  }
  function dispose() {
    disposed = true;
    renderer.setAnimationLoop(null);
    animal?.mixer.stopAllAction();
    const geometries = new Set(),
      materials = new Set(),
      allTextures = new Set(textures);
    scene.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          materials.add(m);
          for (const v of Object.values(m))
            if (v?.isTexture) allTextures.add(v);
        }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    allTextures.forEach((t) => t.dispose());
    env.dispose();
    sun.shadow.map?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }
  setQuality("medium");
  onProgress(80, "园区场景已建立");
  return {
    scene,
    renderer,
    camera,
    pickables,
    resize,
    setQuality,
    update,
    dispose,
    ensureAnimal,
    animalStatus,
    animalMetrics() {
      if (!animal) return null;
      animal.root.updateMatrixWorld(true);
      animal.model.traverse((o) => o.skeleton?.update());
      const b = new THREE.Box3().setFromObject(animal.root, true),
        c = b.getCenter(new THREE.Vector3()),
        projected = c.clone().project(camera);
      return {
        min: b.min.toArray(),
        max: b.max.toArray(),
        size: b.getSize(new THREE.Vector3()).toArray(),
        root: animal.root.position.toArray(),
        inside: inside(animal.point, lionEnclosure.points),
        head: animal.head?.quaternion.toArray(),
        projected: [
          (projected.x * 0.5 + 0.5) * container.clientWidth,
          (-projected.y * 0.5 + 0.5) * container.clientHeight,
        ],
      };
    },
    get animal() {
      return animal;
    },
    treeCount: treePoints.length,
    buildingMeshes,
  };
}
