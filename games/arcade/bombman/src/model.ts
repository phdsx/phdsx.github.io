import { BRICKS, COLS, ROWS, TILE, TUNING } from './config.ts';

export type TileKind = 'floor' | 'wall' | 'stone' | 'brick';
export type ItemKind = 'bomb' | 'flame' | 'speed';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type Phase = 'ready' | 'playing' | 'paused' | 'finished' | 'reference';
export type Actor = { id: number; x: number; y: number; alive: boolean; dir: Direction; walking: boolean; bombsMax: number; power: number; speed: number; aiDir: Direction | null; thinkAt: number; deathAt: number };
export type Bomb = { id: number; x: number; y: number; owner: number; power: number; remaining: number; passOwner: boolean; passers?: Set<number> };
export type Flame = { x: number; y: number; kind: 'center' | 'horizontal' | 'vertical' | 'left' | 'right' | 'up' | 'down'; until: number };
export type Item = { x: number; y: number; kind: ItemKind };
export type Effect = { x: number; y: number; kind: 'brick' | 'pickup' | 'death'; until: number };
export type EventKind = 'place' | 'blast' | 'brick' | 'pickup' | 'death' | 'end';

const DIRS: ReadonlyArray<readonly [Direction, number, number]> = [
  ['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0],
];
const key = (x: number, y: number) => `${x},${y}`;
const col = (px: number) => Math.floor(px / TILE);
const at = (n: number) => n * TILE + TILE / 2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function createMap(): TileKind[][] {
  return Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => {
    if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) return 'wall';
    if (x % 2 === 0 && y % 2 === 0) return 'stone';
    return BRICKS[y]?.includes(x) ? 'brick' : 'floor';
  }));
}

export class Match {
  map = createMap();
  actors: Actor[] = [[3, 1], [11, 3], [3, 8], [13, 7]].map(([x, y], id) => ({
    id, x: at(x), y: at(y), alive: true, dir: id === 0 ? 'down' : 'up', walking: false,
    bombsMax: TUNING.initialBombs, power: TUNING.initialPower, speed: TUNING.movePxPerSec,
    aiDir: null, thinkAt: 0, deathAt: 0,
  }));
  bombs: Bomb[] = [];
  flames: Flame[] = [];
  items: Item[] = [];
  effects: Effect[] = [];
  events: EventKind[] = [];
  phase: Phase = 'ready';
  now = 0;
  remaining = TUNING.roundMs;
  winner: number | null = null;
  private bombId = 0;
  private randomState = 739031;

  start() { this.phase = 'playing'; }
  pause() { if (this.phase === 'playing') this.phase = 'paused'; else if (this.phase === 'paused') this.phase = 'playing'; }
  tile(x: number, y: number): TileKind { return this.map[y]?.[x] ?? 'wall'; }
  actorCell(actor: Actor) { return { x: col(actor.x), y: col(actor.y) }; }
  getBomb(x: number, y: number) { return this.bombs.find(b => b.x === x && b.y === y); }
  activeBombs(owner: number) { return this.bombs.filter(b => b.owner === owner).length; }
  private rand() { this.randomState = (1664525 * this.randomState + 1013904223) >>> 0; return this.randomState / 4294967296; }

  placeBomb(owner: number): Bomb | null {
    if (this.phase !== 'playing') return null;
    const actor = this.actors[owner];
    if (!actor?.alive || this.activeBombs(owner) >= actor.bombsMax) return null;
    const { x, y } = this.actorCell(actor);
    if (this.tile(x, y) !== 'floor' || this.getBomb(x, y)) return null;
    const left = x * TILE, top = y * TILE, r = TUNING.footRadiusPx;
    const passers = new Set(this.actors.filter(a => a.alive && a.x + r > left && a.x - r < left + TILE && a.y + r > top && a.y - r < top + TILE).map(a => a.id));
    const bomb = { id: ++this.bombId, x, y, owner, power: actor.power, remaining: TUNING.bombFuseMs, passOwner: true, passers };
    this.bombs.push(bomb);
    this.events.push('place');
    return bomb;
  }

  private blocked(x: number, y: number, actor: Actor): boolean {
    if (this.tile(x, y) !== 'floor') return true;
    const bomb = this.getBomb(x, y);
    return !!bomb && !(bomb.passers?.has(actor.id) || (bomb.owner === actor.id && bomb.passOwner));
  }
  private canStand(x: number, y: number, actor: Actor): boolean {
    const r = TUNING.footRadiusPx;
    return !this.blocked(col(x - r), col(y - r), actor)
      && !this.blocked(col(x + r), col(y - r), actor)
      && !this.blocked(col(x - r), col(y + r), actor)
      && !this.blocked(col(x + r), col(y + r), actor);
  }

  move(actor: Actor, direction: Direction | null, dt: number) {
    actor.walking = false;
    if (!actor.alive || !direction || this.phase !== 'playing') return;
    actor.dir = direction;
    const [_, dx, dy] = DIRS.find(([name]) => name === direction)!;
    const maxMove = actor.speed * Math.min(dt, 50) / 1000;
    // Small perpendicular alignment lets a corridor turn register near its center.
    const assist = actor.id === 0 ? TUNING.turnAssistPx : TUNING.turnAssistPx + 4;
    if (dx && Math.abs(actor.y - at(col(actor.y))) <= assist) {
      const target = at(col(actor.y));
      const next = actor.y + clamp(target - actor.y, -maxMove, maxMove);
      if (this.canStand(actor.x, next, actor)) actor.y = next;
    } else if (dy && Math.abs(actor.x - at(col(actor.x))) <= assist) {
      const target = at(col(actor.x));
      const next = actor.x + clamp(target - actor.x, -maxMove, maxMove);
      if (this.canStand(next, actor.y, actor)) actor.x = next;
    }
    const steps = Math.ceil(maxMove / 3);
    for (let n = 0; n < steps; n++) {
      const nx = actor.x + dx * maxMove / steps;
      const ny = actor.y + dy * maxMove / steps;
      if (!this.canStand(nx, ny, actor)) break;
      actor.x = nx; actor.y = ny; actor.walking = true;
    }
    for (const bomb of this.bombs) {
      if (!bomb.passers?.has(actor.id) && !(bomb.owner === actor.id && bomb.passOwner)) continue;
      const left = bomb.x * TILE, top = bomb.y * TILE, r = TUNING.footRadiusPx;
      // Keep the exit privilege until the entire foot collider clears the tile.
      if (actor.x + r <= left || actor.x - r >= left + TILE || actor.y + r <= top || actor.y - r >= top + TILE) {
        bomb.passers?.delete(actor.id);
        if (bomb.owner === actor.id) bomb.passOwner = false;
      }
    }
  }

  // Returns the exact occupied tiles. A brick is included, then stops that arm.
  blastCells(x: number, y: number, power: number, map = this.map): Flame[] {
    const result: Flame[] = [{ x, y, kind: 'center', until: 0 }];
    for (const [dir, dx, dy] of DIRS) {
      for (let distance = 1; distance <= power; distance++) {
        const cx = x + dx * distance, cy = y + dy * distance;
        const tile = map[cy]?.[cx] ?? 'wall';
        if (tile === 'wall' || tile === 'stone') break;
        const kind = tile === 'brick' || distance === power ? dir : dx ? 'horizontal' : 'vertical';
        result.push({ x: cx, y: cy, kind, until: 0 });
        if (tile === 'brick') break;
      }
    }
    return result;
  }

  detonate(initial: Bomb[]) {
    const queued = [...initial], detonated = new Set<number>(), destroyed = new Set<string>();
    const allFlames: Flame[] = [];
    // Use the same wall snapshot for all bombs in this simultaneous chain.
    const snapshot = this.map.map(row => [...row]);
    while (queued.length) {
      const bomb = queued.shift()!;
      if (detonated.has(bomb.id) || !this.bombs.includes(bomb)) continue;
      detonated.add(bomb.id);
      for (const flame of this.blastCells(bomb.x, bomb.y, bomb.power, snapshot)) {
        allFlames.push({ ...flame, until: this.now + TUNING.flameMs });
        if (snapshot[flame.y][flame.x] === 'brick') destroyed.add(key(flame.x, flame.y));
        const hit = this.getBomb(flame.x, flame.y);
        if (hit && !detonated.has(hit.id)) queued.push(hit);
      }
    }
    this.bombs = this.bombs.filter(b => !detonated.has(b.id));
    if (detonated.size) this.events.push('blast');
    this.flames.push(...allFlames);
    for (const location of destroyed) {
      const [x, y] = location.split(',').map(Number);
      this.map[y][x] = 'floor';
      this.effects.push({ x, y, kind: 'brick', until: this.now + 350 });
      this.events.push('brick');
      if (this.rand() < TUNING.itemDropChance) {
        const kind: ItemKind = (['bomb', 'flame', 'speed'] as const)[Math.floor(this.rand() * 3)];
        this.items.push({ x, y, kind });
      }
    }
    const burned = new Set(allFlames.map(f => key(f.x, f.y)));
    this.items = this.items.filter(item => !burned.has(key(item.x, item.y)) || destroyed.has(key(item.x, item.y)));
    this.applyFlameDamage();
  }

  private applyFlameDamage() {
    const burning = new Set(this.flames.map(f => key(f.x, f.y)));
    for (const actor of this.actors) {
      if (!actor.alive) continue;
      const { x, y } = this.actorCell(actor);
      if (burning.has(key(x, y))) {
        actor.alive = false;
        actor.deathAt = this.now;
        this.effects.push({ x, y, kind: 'death', until: this.now + 600 });
        this.events.push('death');
      }
    }
  }

  private collectItems() {
    for (const actor of this.actors) {
      if (!actor.alive) continue;
      const { x, y } = this.actorCell(actor);
      const index = this.items.findIndex(item => item.x === x && item.y === y);
      if (index < 0) continue;
      const [item] = this.items.splice(index, 1);
      if (item.kind === 'bomb') actor.bombsMax = Math.min(9, actor.bombsMax + 1);
      if (item.kind === 'flame') actor.power = Math.min(12, actor.power + 1);
      if (item.kind === 'speed') actor.speed = Math.min(TUNING.movePxPerSec * 2.5, actor.speed + TUNING.movePxPerSec * TUNING.speedPerItem);
      this.effects.push({ x, y, kind: 'pickup', until: this.now + 380 });
      this.events.push('pickup');
    }
  }

  step(dt: number, humanDir: Direction | null = null) {
    this.events = [];
    if (this.phase !== 'playing') return;
    dt = clamp(dt, 0, 50);
    this.now += dt; this.remaining -= dt;
    this.move(this.actors[0], humanDir, dt);
    for (const actor of this.actors.slice(1)) {
      if (!actor.alive) continue;
      if (this.now >= actor.thinkAt) { actor.aiDir = this.chooseAI(actor); actor.thinkAt = this.now + TUNING.aiThinkMs; }
      this.move(actor, actor.aiDir, dt);
    }
    for (const bomb of this.bombs) bomb.remaining -= dt;
    const expired = this.bombs.filter(b => b.remaining <= 0);
    if (expired.length) this.detonate(expired);
    this.flames = this.flames.filter(f => f.until > this.now);
    this.effects = this.effects.filter(e => e.until > this.now);
    this.applyFlameDamage();
    this.collectItems();
    const alive = this.actors.filter(a => a.alive);
    if (alive.length <= 1 || !this.actors[0].alive || this.remaining <= 0) {
      this.winner = alive.length === 1 ? alive[0].id : !this.actors[0].alive && alive.length > 1 ? -1 : null;
      this.phase = 'finished'; this.events.push('end');
    }
  }

  // Predict each bomb's time, including cascades caused by earlier blasts.
  forecast(extra: Bomb[] = []): Map<string, Array<[number, number]>> {
    const bombs = [...this.bombs, ...extra];
    const times = new Map(bombs.map(b => [b.id, Math.max(0, b.remaining)]));
    let changed = true;
    while (changed) {
      changed = false;
      for (const bomb of bombs) {
        const time = times.get(bomb.id)!;
        const touched = new Set(this.blastCells(bomb.x, bomb.y, bomb.power).map(f => key(f.x, f.y)));
        for (const other of bombs) if (other.id !== bomb.id && touched.has(key(other.x, other.y)) && times.get(other.id)! > time) {
          times.set(other.id, time); changed = true;
        }
      }
    }
    const danger = new Map<string, Array<[number, number]>>();
    for (const flame of this.flames) {
      const cell = key(flame.x, flame.y);
      if (!danger.has(cell)) danger.set(cell, []);
      danger.get(cell)!.push([0, flame.until - this.now]);
    }
    for (const bomb of bombs) for (const flame of this.blastCells(bomb.x, bomb.y, bomb.power)) {
      const cell = key(flame.x, flame.y);
      if (!danger.has(cell)) danger.set(cell, []);
      const time = times.get(bomb.id)!;
      danger.get(cell)!.push([time, time + TUNING.flameMs]);
    }
    return danger;
  }

  private hazardous(danger: Map<string, Array<[number, number]>>, x: number, y: number, start: number, end: number) {
    return danger.get(key(x, y))?.some(([a, b]) => start < b && end >= a) ?? false;
  }

  // Time-expanded BFS. A proposed bomb is treated as solid after the actor leaves it.
  escape(actor: Actor, extra: Bomb | null = null): { safe: boolean; first: Direction | null } {
    const danger = this.forecast(extra ? [extra] : []);
    const current = this.actorCell(actor);
    const stepMs = TUNING.aiStepMs;
    const horizon = Math.ceil(((extra?.remaining ?? Math.max(0, Math.min(...this.bombs.map(b => b.remaining), 2000))) + TUNING.flameMs + 250) / stepMs);
    const queue: Array<{ x: number; y: number; n: number; first: Direction | null }> = [{ ...current, n: 0, first: null }];
    const seen = new Set([`${current.x},${current.y},0`]);
    const solids = [...this.bombs, ...(extra ? [extra] : [])];
    for (let q = 0; q < queue.length; q++) {
      const node = queue[q];
      const time = node.n * stepMs;
      if (node.n > 0 && !this.hazardous(danger, node.x, node.y, time, horizon * stepMs)) return { safe: true, first: node.first };
      if (node.n >= horizon) return { safe: true, first: node.first };
      for (const [direction, dx, dy] of [...DIRS, [null, 0, 0] as const]) {
        const x = node.x + dx, y = node.y + dy, end = time + stepMs;
        if (this.tile(x, y) !== 'floor') continue;
        if (solids.some(b => b.x === x && b.y === y && !(node.n === 0 && x === current.x && y === current.y))) continue;
        if (this.hazardous(danger, x, y, time, end)) continue;
        const visit = `${x},${y},${node.n + 1}`;
        if (seen.has(visit)) continue;
        seen.add(visit);
        queue.push({ x, y, n: node.n + 1, first: node.first ?? direction });
      }
    }
    return { safe: false, first: null };
  }

  private pathTo(actor: Actor, goals: Set<string>, danger: Map<string, Array<[number, number]>>): Direction | null {
    const start = this.actorCell(actor);
    const queue: Array<{ x: number; y: number; first: Direction | null; distance: number }> = [{ ...start, first: null, distance: 0 }];
    const seen = new Set([key(start.x, start.y)]);
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      if (goals.has(key(node.x, node.y))) return node.first;
      for (const [direction, dx, dy] of DIRS) {
        const x = node.x + dx, y = node.y + dy, cell = key(x, y);
        if (seen.has(cell) || this.tile(x, y) !== 'floor' || this.getBomb(x, y)) continue;
        if (this.hazardous(danger, x, y, Math.max(0, node.distance * 260 - 160), node.distance * 260 + 450)) continue;
        seen.add(cell);
        queue.push({ x, y, first: node.first ?? direction, distance: node.distance + 1 });
      }
    }
    return null;
  }

  private chooseAI(actor: Actor): Direction | null {
    const cell = this.actorCell(actor);
    const centered = Math.abs(actor.x - at(cell.x)) < 6 && Math.abs(actor.y - at(cell.y)) < 6;
    if (!centered && actor.aiDir && actor.walking) return actor.aiDir;
    const danger = this.forecast();
    if (this.hazardous(danger, cell.x, cell.y, 0, 800) || this.bombs.some(b => Math.abs(b.x - cell.x) + Math.abs(b.y - cell.y) < 3)) {
      const route = this.escape(actor);
      if (route.safe && route.first) return route.first;
    }
    const itemGoals = new Set(this.items.filter(item => !this.hazardous(danger, item.x, item.y, 0, 900)).map(item => key(item.x, item.y)));
    if (itemGoals.size) {
      const route = this.pathTo(actor, itemGoals, danger);
      if (route) return route;
    }
    const enemyGoals = new Set<string>();
    for (const enemy of this.actors) {
      if (!enemy.alive || enemy.id === actor.id) continue;
      const e = this.actorCell(enemy);
      for (const [_, dx, dy] of DIRS) {
        const x = e.x + dx, y = e.y + dy;
        if (this.tile(x, y) === 'floor') enemyGoals.add(key(x, y));
      }
    }
    const brickNear = DIRS.some(([_, dx, dy]) => this.tile(cell.x + dx, cell.y + dy) === 'brick');
    const enemyNear = this.actors.some(enemy => enemy.id !== actor.id && enemy.alive && Math.abs(col(enemy.x) - cell.x) + Math.abs(col(enemy.y) - cell.y) <= actor.power + 1);
    if ((brickNear || enemyNear) && this.activeBombs(actor.id) < actor.bombsMax && !this.getBomb(cell.x, cell.y)) {
      const proposed: Bomb = { id: -actor.id - 1, x: cell.x, y: cell.y, owner: actor.id, power: actor.power, remaining: TUNING.bombFuseMs, passOwner: true };
      const route = this.escape(actor, proposed);
      if (route.safe && route.first && this.placeBomb(actor.id)) return route.first;
    }
    const enemyRoute = this.pathTo(actor, enemyGoals, danger);
    if (enemyRoute) return enemyRoute;
    const brickGoals = new Set<string>();
    for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
      if (this.tile(x, y) !== 'brick') continue;
      for (const [_, dx, dy] of DIRS) if (this.tile(x + dx, y + dy) === 'floor') brickGoals.add(key(x + dx, y + dy));
    }
    return this.pathTo(actor, brickGoals, danger);
  }
}
