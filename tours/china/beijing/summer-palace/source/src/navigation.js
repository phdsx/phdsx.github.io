import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { inside, distanceToSegment } from "./geometry.js";
import { segment } from "./landscape.js";
export class Navigation {
  constructor(camera, canvas, ground, models, corridor, onMessage) {
    Object.assign(this, {
      camera,
      canvas,
      ground,
      models,
      corridor,
      onMessage,
    });
    this.mode = "orbit";
    this.yaw = 0;
    this.pitch = 0;
    this.keys = new Set();
    this.drag = false;
    this.height = 1.7;
    this.selected = null;
    this.auto = false;
    this.orbit = new OrbitControls(camera, canvas);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.09;
    this.orbit.maxPolarAngle = Math.PI / 2 - 0.035;
    this.orbit.minDistance = 5;
    this.orbit.maxDistance = 4200;
    this.grid = new Map();
    for (const c of ground.obstacles) {
      const r = c.radius + 0.45,
        xs = [c.a[0], c.b[0]],
        zs = [c.a[1], c.b[1]];
      for (
        let x = Math.floor((Math.min(...xs) - r) / 32);
        x <= Math.floor((Math.max(...xs) + r) / 32);
        x++
      )
        for (
          let z = Math.floor((Math.min(...zs) - r) / 32);
          z <= Math.floor((Math.max(...zs) + r) / 32);
          z++
        ) {
          const key = x + "," + z;
          if (!this.grid.has(key)) this.grid.set(key, []);
          this.grid.get(key).push(c);
        }
    }
    this.events = [];
    const listen = (el, type, fn) => {
      el.addEventListener(type, fn);
      this.events.push(() => el.removeEventListener(type, fn));
    };
    listen(window, "keydown", (e) => {
      if (
        /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) ||
        document.querySelector("dialog[open]")
      )
        return;
      if (
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
        this.auto = false;
        if (this.mode === "walk") e.preventDefault();
      }
      this.keys.add(e.code);
    });
    listen(window, "keyup", (e) => this.keys.delete(e.code));
    listen(window, "blur", () => {
      this.keys.clear();
      this.drag = false;
      this.auto = false;
    });
    listen(canvas, "pointerdown", (e) => {
      if (this.mode === "walk" && e.button === 0) this.drag = true;
    });
    listen(window, "pointerup", () => (this.drag = false));
    listen(document, "mousemove", (e) => {
      if (
        this.mode === "walk" &&
        (this.drag || document.pointerLockElement === canvas)
      ) {
        this.yaw -= e.movementX * 0.0025;
        this.pitch = T.MathUtils.clamp(
          this.pitch - e.movementY * 0.0025,
          -1.35,
          1.35,
        );
        this.look();
      }
    });
    listen(canvas, "dblclick", () => {
      if (this.mode === "walk")
        canvas
          .requestPointerLock?.()
          .catch?.(() => onMessage("可按住鼠标左键观察。"));
    });
    listen(document, "pointerlockerror", () =>
      onMessage("请按住鼠标左键观察。"),
    );
  }
  groundHeight(x, z) {
    return this.ground.height(x, z);
  }
  corridorAt(x, z) {
    for (let i = 1; i < this.corridor.points.length; i++)
      if (
        distanceToSegment(
          x,
          z,
          this.corridor.points[i - 1],
          this.corridor.points[i],
        ) < 1.08
      )
        return true;
    return false;
  }
  canStand(x, z, current = this.groundHeight(x, z), transit = true) {
    if (!inside(x, z, this.ground.data.boundary)) return false;
    const bridge = this.ground.bridgeAt(x, z);
    if (this.ground.waterAt(x, z) && !bridge) return false;
    const h = this.groundHeight(x, z);
    if (transit && (h - current > 0.35 || current - h > 0.48)) return false;
    for (const c of this.grid.get(
      Math.floor(x / 32) + "," + Math.floor(z / 32),
    ) || [])
      if (
        distanceToSegment(x, z, c.a, c.b) < c.radius + 0.32 &&
        h < (c.yMax ?? Infinity) + 0.08 &&
        h + 1.7 > (c.yMin ?? -Infinity)
      )
        return false;
    const onCorridor = this.corridorAt(x, z);
    for (const b of this.models) {
      if (b.holes.length || b.w > 85 || b.d > 75) continue;
      if (Math.abs(b.x - x) > b.w + b.d || Math.abs(b.z - z) > b.w + b.d)
        continue;
      const dx = x - b.x,
        dz = z - b.z,
        u = dx * Math.cos(b.yaw) - dz * Math.sin(b.yaw),
        v = dx * Math.sin(b.yaw) + dz * Math.cos(b.yaw);
      if (b.name === "佛香阁") {
        if (Math.hypot(dx, dz) < 10.2) return false;
        continue;
      }
      if (b.pavilion) continue;
      if (Math.abs(u) < b.w * 0.45 + 0.32 && Math.abs(v) < b.d * 0.4 + 0.32) {
        if (onCorridor && b.gate) continue;
        if (b.gate && Math.abs(u) < b.w * 0.23) continue;
        return false;
      }
    }
    if (!bridge && transit) {
      const slope = Math.max(
        Math.abs(
          this.ground.natural(x + 0.4, z) - this.ground.natural(x - 0.4, z),
        ),
        Math.abs(
          this.ground.natural(x, z + 0.4) - this.ground.natural(x, z - 0.4),
        ),
      );
      if (
        slope > 1.2 &&
        this.ground.pathHeight(x, z) === null &&
        !this.ground.platformAt(x, z) &&
        !this.ground.rampAt(x, z) &&
        !onCorridor
      )
        return false;
    }
    return true;
  }
  safePoint(x, z) {
    for (let r = 0; r < 110; r += 1.6)
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
        const p = [x + Math.sin(a) * r, z + Math.cos(a) * r];
        if (this.canStand(...p, 0, false)) return p;
      }
    return [-415, -701];
  }
  setMode(mode) {
    if (this.mode === mode) return;
    document.exitPointerLock?.();
    this.mode = mode;
    this.keys.clear();
    this.auto = false;
    this.orbit.enabled = mode === "orbit";
    if (mode === "walk") {
      if (this.selected) this.locate(this.selected);
      else {
        const p = this.safePoint(this.orbit.target.x, this.orbit.target.z);
        this.camera.position.set(p[0], this.groundHeight(...p) + 1.7, p[1]);
        this.yaw = 0;
        this.pitch = 0;
        this.look();
      }
      this.onMessage("WASD 步行 · 按住左键观察 · 双击锁定鼠标");
    } else {
      const p = this.camera.position.clone();
      this.orbit.target.set(p.x, p.y - 1.7, p.z - 12);
      this.camera.position.set(p.x + 90, p.y + 85, p.z + 130);
      this.orbit.update();
    }
  }
  locate(b) {
    this.selected = b;
    this.auto = false;
    if (this.mode === "walk") {
      const spawn = b.spawn || [b.x, b.z + (b.d || 20) / 2 + 16],
        p = this.safePoint(...spawn);
      this.camera.position.set(p[0], this.groundHeight(...p) + 1.7, p[1]);
      this.yaw = Math.atan2(p[0] - b.x, p[1] - b.z);
      this.pitch = b.id === "foxiang" ? 0.32 : 0;
      this.look();
    } else {
      const distance =
        b.distance ||
        Math.max(65, Math.max(Math.min(b.w || 20, 70), b.d || 20) * 2.4);
      this.orbit.target.set(b.x, b.base + (b.h || 8) * 0.4, b.z);
      this.camera.position.set(
        b.x + distance * 0.57,
        b.base + distance * 0.65,
        b.z + distance,
      );
      this.orbit.update();
    }
  }
  home() {
    this.setMode("orbit");
    this.selected = null;
    this.orbit.target.set(-600, 12, -135);
    this.camera.position.set(1170, 1280, 1710);
    this.orbit.update();
  }
  look() {
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
  startTour() {
    if (this.auto) {
      this.auto = false;
      return;
    }
    this.setMode("walk");
    this.auto = true;
    this.at = 12;
    this.onMessage("沿长廊中心游览 · 按移动键或再次点击结束");
  }
  update(dt) {
    if (this.mode === "orbit") {
      this.orbit.update();
      return;
    }
    if (this.auto) {
      this.at += dt * 1.5;
      if (this.at >= 716) {
        this.auto = false;
        this.onMessage("长廊游览结束");
        return;
      }
      const p = this.corridor.point(this.at),
        q = this.corridor.point(this.at + 2);
      if (!this.canStand(p.x, p.z, 0, false)) {
        this.auto = false;
        this.onMessage("前方路线受限，请选择鸟瞰或景点跳转。");
        return;
      }
      this.camera.position.set(p.x, this.groundHeight(p.x, p.z) + 1.7, p.z);
      this.yaw = Math.atan2(p.x - q.x, p.z - q.z);
      this.pitch = 0;
      this.look();
      return;
    }
    const f =
        (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0) -
        (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0),
      s = (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0),
      norm = Math.hypot(f, s) || 1,
      speed = (this.keys.has("ShiftLeft") ? 3 : 1.5) * dt;
    if (this.keys.has("ArrowLeft")) this.yaw += dt;
    if (this.keys.has("ArrowRight")) this.yaw -= dt;
    const dx =
        ((-Math.sin(this.yaw) * f + Math.cos(this.yaw) * s) * speed) / norm,
      dz = ((-Math.cos(this.yaw) * f - Math.sin(this.yaw) * s) * speed) / norm;
    const p = this.camera.position,
      n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.1));
    for (let i = 0; i < n; i++) {
      if (this.canStand(p.x + dx / n, p.z, this.groundHeight(p.x, p.z)))
        p.x += dx / n;
      if (this.canStand(p.x, p.z + dz / n, this.groundHeight(p.x, p.z)))
        p.z += dz / n;
    }
    p.y = this.groundHeight(p.x, p.z) + 1.7;
    this.look();
  }
  dispose() {
    this.events.forEach((fn) => fn());
    this.orbit.dispose();
    document.exitPointerLock?.();
  }
}
