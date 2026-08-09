# 沙子分类网页游戏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 PHDSX 静态站点中新增一款高度还原原作、30 关、完全离线且所有原广告能力免费开放的沙子分类 Canvas 网页游戏。

**Architecture:** 使用无 DOM 依赖的 ES modules 实现倒沙规则与确定性关卡生成，再由独立 Canvas 渲染器和会话控制器驱动画面、动画、工具与存档。HTML 只承担页面外壳和可访问控件；位图全部保存在本地，站点入口只修改 `games.html` 的一张卡片。

**Tech Stack:** HTML5、CSS、Canvas 2D、原生 ES modules、Node.js 内置测试运行器、Web Audio、localStorage、Python 静态服务器。

## Global Constraints

- 仅实现游戏本体，不复制 Y8 导航、推荐、登录、隐私弹窗或广告系统。
- 撤销、提示、重排、增加空瓶和重开全部免费，不消耗广告次数、体力、金币或真实货币。
- 提供 30 个确定性递进关卡；每个发布关卡必须携带可执行的逆序解法证明。
- Canvas 2D 负责场景与沙粒动画；HTML 按钮负责工具栏和无障碍名称。
- 不热链原站素材，不添加远程脚本、分析、广告、商城、登录或运行时网络请求。
- 桌面端居中显示，`390 × 844` 视口无横向溢出，触摸目标不小于 `44 × 44` CSS 像素。
- 动画期间锁定会改变游戏状态的输入；`prefers-reduced-motion` 下关闭大范围粒子并缩短移动。
- 存档只保存当前关卡、最高解锁关卡、金币展示值和静音偏好，不保存关卡中途布局。

---

## File Map

- `Games/sand-sort.html`：游戏页面外壳、Canvas、状态栏、工具栏和对话框。
- `Games/sand-sort.css`：响应式布局、按钮状态、覆盖层和减少动态效果样式。
- `Games/sand-sort-rules.mjs`：纯函数倒沙规则、合法移动枚举、提示评分和胜利判断。
- `Games/sand-sort-levels.mjs`：种子随机数、可逆打散器、30 个关卡蓝图与解法证明。
- `Games/sand-sort-renderer.mjs`：响应式布局计算、Canvas 绘制、选中/倾倒/粒子动画。
- `Games/sand-sort-session.mjs`：纯数据会话、选择、提交移动、撤销、重排和额外瓶逻辑。
- `Games/sand-sort-game.mjs`：DOM 绑定、输入坐标映射、动画编排、存档、声音和页面状态。
- `Games/sand-sort-assets/background.png`：原作风格的深蓝紫游戏背景。
- `Games/sand-sort-assets/bottle-glass.png`：透明背景空玻璃瓶叠加素材。
- `Games/sand-sort-assets/game-cover.png`：站点游戏卡片封面。
- `Games/sand-sort-rules.test.mjs`：规则边界与提示测试。
- `Games/sand-sort-levels.test.mjs`：30 关确定性、颜色计数和解法证明测试。
- `Games/sand-sort-renderer.test.mjs`：布局尺寸和命中测试。
- `Games/sand-sort-session.test.mjs`：会话、撤销和免费工具测试。
- `games.html`：新增沙子分类入口，不改其他卡片。
- `design-qa.md`：源站与本地实现的视觉、交互及网络检查记录。

---

### Task 1: 倒沙规则引擎

**Files:**
- Create: `Games/sand-sort-rules.test.mjs`
- Create: `Games/sand-sort-rules.mjs`

**Interfaces:**
- Consumes: `tubes: string[][]`，每个内层数组按“瓶底到瓶口”排序；默认容量 `4`。
- Produces: `getTopRun(tube)`, `planPour(tubes, from, to, capacity)`, `applyPour(tubes, plan)`, `listLegalMoves(tubes, capacity)`, `suggestMove(tubes, capacity)`, `isSolved(tubes, capacity)`。

- [ ] **Step 1: 写规则边界的失败测试**

```js
// Games/sand-sort-rules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPour,
  getTopRun,
  isSolved,
  listLegalMoves,
  planPour,
  suggestMove,
} from './sand-sort-rules.mjs';

test('getTopRun counts adjacent colors at the mouth', () => {
  assert.deepEqual(getTopRun(['red', 'blue', 'blue']), { color: 'blue', count: 2 });
  assert.deepEqual(getTopRun([]), { color: null, count: 0 });
});

test('planPour moves the largest legal top run that fits', () => {
  const tubes = [['red', 'blue', 'blue'], ['blue', 'blue'], []];
  assert.deepEqual(planPour(tubes, 0, 1), { from: 0, to: 1, color: 'blue', count: 2 });
  assert.deepEqual(planPour(tubes, 0, 2), { from: 0, to: 2, color: 'blue', count: 2 });
});

test('planPour rejects same bottle, empty source, mismatched top and full target', () => {
  const tubes = [['red'], [], ['blue'], ['red', 'red', 'red', 'red']];
  assert.equal(planPour(tubes, 0, 0), null);
  assert.equal(planPour(tubes, 1, 2), null);
  assert.equal(planPour(tubes, 0, 2), null);
  assert.equal(planPour(tubes, 0, 3), null);
});

test('applyPour is immutable and isSolved ignores empty bottles', () => {
  const tubes = [['red', 'blue'], ['blue'], []];
  const next = applyPour(tubes, planPour(tubes, 0, 1));
  assert.deepEqual(tubes, [['red', 'blue'], ['blue'], []]);
  assert.deepEqual(next, [['red'], ['blue', 'blue'], []]);
  assert.equal(isSolved([['red', 'red', 'red', 'red'], [], ['blue', 'blue', 'blue', 'blue']]), true);
  assert.equal(isSolved([['red', 'blue'], [], ['blue', 'red']]), false);
});

test('legal moves and hint never return an illegal action', () => {
  const tubes = [['red', 'blue'], ['blue'], []];
  const moves = listLegalMoves(tubes);
  assert.ok(moves.length > 0);
  assert.ok(moves.every((move) => planPour(tubes, move.from, move.to)));
  const hint = suggestMove(tubes);
  assert.ok(hint);
  assert.deepEqual(hint, planPour(tubes, hint.from, hint.to));
});
```

- [ ] **Step 2: 运行测试并确认因模块缺失而失败**

Run: `node --test Games/sand-sort-rules.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `sand-sort-rules.mjs`.

- [ ] **Step 3: 实现最小规则模块**

```js
// Games/sand-sort-rules.mjs
export const DEFAULT_CAPACITY = 4;

export function getTopRun(tube) {
  if (!tube.length) return { color: null, count: 0 };
  const color = tube.at(-1);
  let count = 1;
  for (let index = tube.length - 2; index >= 0 && tube[index] === color; index -= 1) count += 1;
  return { color, count };
}

export function planPour(tubes, from, to, capacity = DEFAULT_CAPACITY) {
  if (from === to || !tubes[from]?.length || !tubes[to] || tubes[to].length >= capacity) return null;
  const source = getTopRun(tubes[from]);
  const targetColor = tubes[to].at(-1) ?? null;
  if (targetColor !== null && targetColor !== source.color) return null;
  return { from, to, color: source.color, count: Math.min(source.count, capacity - tubes[to].length) };
}

export function applyPour(tubes, plan) {
  if (!plan) return tubes.map((tube) => [...tube]);
  const next = tubes.map((tube) => [...tube]);
  next[plan.from].splice(-plan.count, plan.count);
  next[plan.to].push(...Array(plan.count).fill(plan.color));
  return next;
}

export function listLegalMoves(tubes, capacity = DEFAULT_CAPACITY) {
  const moves = [];
  for (let from = 0; from < tubes.length; from += 1) {
    for (let to = 0; to < tubes.length; to += 1) {
      const move = planPour(tubes, from, to, capacity);
      if (move) moves.push(move);
    }
  }
  return moves;
}

function moveScore(tubes, move, capacity) {
  const sourceAfter = tubes[move.from].length - move.count;
  const targetAfter = tubes[move.to].length + move.count;
  const joinsColor = tubes[move.to].length > 0 ? 20 : 0;
  const completesTube = targetAfter === capacity ? 40 : 0;
  const emptiesSource = sourceAfter === 0 ? 12 : 0;
  const emptyToEmptyPenalty = tubes[move.to].length === 0 && getTopRun(tubes[move.from]).count === tubes[move.from].length ? -30 : 0;
  return joinsColor + completesTube + emptiesSource + move.count + emptyToEmptyPenalty;
}

export function suggestMove(tubes, capacity = DEFAULT_CAPACITY) {
  return listLegalMoves(tubes, capacity)
    .map((move) => ({ move, score: moveScore(tubes, move, capacity) }))
    .sort((a, b) => b.score - a.score)[0]?.move ?? null;
}

export function isSolved(tubes, capacity = DEFAULT_CAPACITY) {
  return tubes.every((tube) => tube.length === 0 || (tube.length === capacity && tube.every((color) => color === tube[0])));
}
```

- [ ] **Step 4: 运行规则测试并确认通过**

Run: `node --test Games/sand-sort-rules.test.mjs`

Expected: PASS, 5 tests.

- [ ] **Step 5: 提交规则引擎**

```bash
git add Games/sand-sort-rules.mjs Games/sand-sort-rules.test.mjs
git commit -m "feat: add sand sort rules engine"
```

---

### Task 2: 30 个确定性可解关卡

**Files:**
- Create: `Games/sand-sort-levels.test.mjs`
- Create: `Games/sand-sort-levels.mjs`

**Interfaces:**
- Consumes: `applyPour()` 与 `planPour()` from `sand-sort-rules.mjs`。
- Produces: `LEVEL_BLUEPRINTS`, `createLevel(index, variation) -> { id, tubes, solution, colors, capacity }`, `verifySolution(level) -> boolean`。

- [ ] **Step 1: 写关卡数量、确定性和解法证明的失败测试**

```js
// Games/sand-sort-levels.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_BLUEPRINTS, createLevel, verifySolution } from './sand-sort-levels.mjs';
import { isSolved } from './sand-sort-rules.mjs';

test('catalog contains 30 progressively sized levels', () => {
  assert.equal(LEVEL_BLUEPRINTS.length, 30);
  assert.equal(LEVEL_BLUEPRINTS[0].colors, 2);
  assert.ok(LEVEL_BLUEPRINTS.at(-1).colors >= 8);
});

test('same level and variation always produce the same tubes', () => {
  assert.deepEqual(createLevel(12, 0), createLevel(12, 0));
  assert.notDeepEqual(createLevel(12, 0).tubes, createLevel(12, 1).tubes);
});

test('every level preserves four layers of each color and has a valid inverse solution', () => {
  for (let index = 0; index < LEVEL_BLUEPRINTS.length; index += 1) {
    const level = createLevel(index, 0);
    const counts = new Map();
    for (const color of level.tubes.flat()) counts.set(color, (counts.get(color) || 0) + 1);
    assert.ok([...counts.values()].every((count) => count === 4), `level ${index + 1} color count`);
    assert.equal(isSolved(level.tubes), false, `level ${index + 1} begins unsolved`);
    assert.equal(verifySolution(level), true, `level ${index + 1} solution`);
  }
});
```

- [ ] **Step 2: 运行测试并确认关卡模块缺失**

Run: `node --test Games/sand-sort-levels.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `sand-sort-levels.mjs`.

- [ ] **Step 3: 实现种子随机数、可逆打散和完整蓝图表**

```js
// Games/sand-sort-levels.mjs
import { applyPour, isSolved, planPour } from './sand-sort-rules.mjs';

export const COLOR_IDS = ['pink', 'orange', 'blue', 'green', 'violet', 'yellow', 'cyan', 'red', 'lime', 'brown'];

export const LEVEL_BLUEPRINTS = [
  { seed: 1101, colors: 2, empties: 2, steps: 6 },
  { seed: 1109, colors: 2, empties: 2, steps: 8 },
  { seed: 1123, colors: 3, empties: 2, steps: 10 },
  { seed: 1151, colors: 3, empties: 2, steps: 12 },
  { seed: 1181, colors: 3, empties: 2, steps: 14 },
  { seed: 1201, colors: 4, empties: 2, steps: 15 },
  { seed: 1217, colors: 4, empties: 2, steps: 17 },
  { seed: 1237, colors: 4, empties: 2, steps: 19 },
  { seed: 1277, colors: 4, empties: 2, steps: 21 },
  { seed: 1301, colors: 5, empties: 2, steps: 22 },
  { seed: 1321, colors: 5, empties: 2, steps: 24 },
  { seed: 1361, colors: 5, empties: 2, steps: 26 },
  { seed: 1381, colors: 5, empties: 2, steps: 28 },
  { seed: 1423, colors: 6, empties: 2, steps: 28 },
  { seed: 1451, colors: 6, empties: 2, steps: 30 },
  { seed: 1481, colors: 6, empties: 2, steps: 32 },
  { seed: 1523, colors: 6, empties: 2, steps: 34 },
  { seed: 1559, colors: 6, empties: 2, steps: 36 },
  { seed: 1601, colors: 7, empties: 2, steps: 34 },
  { seed: 1621, colors: 7, empties: 2, steps: 36 },
  { seed: 1657, colors: 7, empties: 2, steps: 38 },
  { seed: 1693, colors: 7, empties: 2, steps: 40 },
  { seed: 1721, colors: 7, empties: 2, steps: 42 },
  { seed: 1753, colors: 7, empties: 2, steps: 44 },
  { seed: 1801, colors: 8, empties: 2, steps: 40 },
  { seed: 1831, colors: 8, empties: 2, steps: 42 },
  { seed: 1861, colors: 8, empties: 2, steps: 44 },
  { seed: 1901, colors: 8, empties: 2, steps: 46 },
  { seed: 1931, colors: 8, empties: 2, steps: 48 },
  { seed: 1973, colors: 8, empties: 2, steps: 50 },
];

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6d2b79f5 | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function reverseCandidates(tubes, capacity) {
  const candidates = [];
  for (let from = 0; from < tubes.length; from += 1) {
    if (!tubes[from].length) continue;
    const color = tubes[from].at(-1);
    let run = 1;
    while (run < tubes[from].length && tubes[from].at(-1 - run) === color) run += 1;
    const mayExposeDifferent = run < tubes[from].length;
    const maxAmount = mayExposeDifferent ? run - 1 : run;
    for (let to = 0; to < tubes.length; to += 1) {
      if (to === from || tubes[to].length >= capacity) continue;
      if (tubes[to].at(-1) === color) continue;
      for (let count = 1; count <= Math.min(maxAmount, capacity - tubes[to].length); count += 1) {
        candidates.push({ from, to, color, count });
      }
    }
  }
  return candidates;
}

function scramble(blueprint, variation) {
  const capacity = 4;
  const colors = COLOR_IDS.slice(0, blueprint.colors);
  let tubes = [...colors.map((color) => Array(capacity).fill(color)), ...Array.from({ length: blueprint.empties }, () => [])];
  const random = mulberry32(blueprint.seed + variation * 10007);
  const inverse = [];
  for (let step = 0; step < blueprint.steps; step += 1) {
    const candidates = reverseCandidates(tubes, capacity);
    const move = candidates[Math.floor(random() * candidates.length)];
    if (!move) break;
    const next = tubes.map((tube) => [...tube]);
    next[move.from].splice(-move.count, move.count);
    next[move.to].push(...Array(move.count).fill(move.color));
    tubes = next;
    inverse.unshift({ from: move.to, to: move.from });
  }
  return { tubes, inverse, colors, capacity };
}

export function createLevel(index, variation = 0) {
  const blueprint = LEVEL_BLUEPRINTS[index];
  if (!blueprint) throw new RangeError(`Unknown level index: ${index}`);
  const generated = scramble(blueprint, variation);
  return { id: index + 1, ...generated, solution: generated.inverse };
}

export function verifySolution(level) {
  let tubes = level.tubes.map((tube) => [...tube]);
  for (const step of level.solution) {
    const move = planPour(tubes, step.from, step.to, level.capacity);
    if (!move) return false;
    tubes = applyPour(tubes, move);
  }
  return isSolved(tubes, level.capacity);
}
```

- [ ] **Step 4: 运行关卡测试；若某个蓝图没有产生混色，调高该蓝图 `steps`，不得绕过解法验证**

Run: `node --test Games/sand-sort-levels.test.mjs`

Expected: PASS, 3 tests; all 30 `verifySolution(level)` assertions are true.

- [ ] **Step 5: 同时运行规则和关卡测试**

Run: `node --test Games/sand-sort-rules.test.mjs Games/sand-sort-levels.test.mjs`

Expected: PASS, 8 tests.

- [ ] **Step 6: 提交关卡系统**

```bash
git add Games/sand-sort-levels.mjs Games/sand-sort-levels.test.mjs
git commit -m "feat: add solvable sand sort levels"
```

---

### Task 3: 视觉素材与 Canvas 布局

**Files:**
- Create: `Games/sand-sort-assets/background.png`
- Create: `Games/sand-sort-assets/bottle-glass.png`
- Create: `Games/sand-sort-assets/game-cover.png`
- Create: `Games/sand-sort-renderer.test.mjs`
- Create: `Games/sand-sort-renderer.mjs`

**Interfaces:**
- Consumes: local `HTMLImageElement` assets and `tubes: string[][]`.
- Produces: `computeLayout(width, height, tubeCount)`, `hitTestBottle(layout, x, y)`, `createRenderer(canvas, assets)`, and renderer methods `resize()`, `draw(frame)`, `animatePour(frame, plan)`, `shake(frame, index)`, `flashHint(frame, from, to)`, `celebrate(frame)`.

- [ ] **Step 1: 使用 imagegen skill 生成三张本地位图**

Generate `background.png` with this prompt:

```text
Vertical mobile puzzle-game background, 9:16, deep midnight navy fading into royal purple, subtle soft spotlight in the center, two understated dark wooden shelves, polished casual-game rendering, no words, no logo, no characters, no bottles, no UI, no watermark. Leave generous clean negative space for game pieces.
```

Generate `bottle-glass.png` with this prompt:

```text
Single empty transparent glass sorting bottle, front view, tall narrow rounded body with a short flared lip, bright cyan and lavender rim highlights, subtle glossy reflections, casual mobile puzzle-game style, isolated on fully transparent background, no liquid, no sand, no label, no shadow, centered with generous transparent padding.
```

Generate `game-cover.png` with this prompt:

```text
Colorful casual puzzle game cover, 16:9. Three glowing transparent glass bottles filled with layered granular sand in pink, orange, blue, lime and violet. One bottle tilts and pours a sparkling arc of pink sand into another bottle. Deep navy-to-purple background, warm orange shelf, polished mobile game key art, strong readable silhouettes, no words, no logos, no watermark.
```

Save the generated outputs at the exact paths above. Inspect all three with `view_image`; reject outputs with text, watermark, opaque bottle background, cropped bottle lip, or missing 16:9 cover composition.

- [ ] **Step 2: 写响应式布局和命中区域的失败测试**

```js
// Games/sand-sort-renderer.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayout, hitTestBottle } from './sand-sort-renderer.mjs';

test('mobile layout fits ten bottles in two rows inside the scene', () => {
  const layout = computeLayout(390, 844, 10);
  assert.equal(layout.bottles.length, 10);
  assert.equal(layout.columns, 5);
  assert.ok(layout.bottles.every((box) => box.x >= 0 && box.x + box.width <= 390));
  assert.ok(layout.bottles.every((box) => box.width >= 44 && box.height >= 120));
});

test('desktop layout keeps the portrait board centered', () => {
  const layout = computeLayout(1440, 900, 8);
  assert.ok(layout.scene.width <= 560);
  assert.equal(Math.round(layout.scene.x * 2 + layout.scene.width), 1440);
});

test('hitTestBottle returns the visible bottle index only', () => {
  const layout = computeLayout(390, 844, 6);
  const first = layout.bottles[0];
  assert.equal(hitTestBottle(layout, first.x + first.width / 2, first.y + first.height / 2), 0);
  assert.equal(hitTestBottle(layout, -10, -10), null);
});
```

- [ ] **Step 3: 运行布局测试并确认模块缺失**

Run: `node --test Games/sand-sort-renderer.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `sand-sort-renderer.mjs`.

- [ ] **Step 4: 实现布局、命中和渲染器骨架**

```js
// Games/sand-sort-renderer.mjs
const PALETTE = {
  pink: '#ff48c8', orange: '#ff8a24', blue: '#3478ff', green: '#31d36b',
  violet: '#8f52ff', yellow: '#ffd83d', cyan: '#30e5ef', red: '#f04455',
  lime: '#a9ef36', brown: '#b8612b',
};

export function computeLayout(width, height, tubeCount) {
  const sceneWidth = Math.min(width, 560);
  const scene = { x: (width - sceneWidth) / 2, y: 0, width: sceneWidth, height };
  const columns = Math.min(5, Math.ceil(tubeCount / 2));
  const gap = Math.max(8, Math.min(18, sceneWidth * 0.025));
  const bottleWidth = Math.max(44, Math.min(66, (sceneWidth - gap * (columns + 1)) / columns));
  const bottleHeight = bottleWidth * 2.45;
  const rowGap = Math.max(30, height * 0.045);
  const boardTop = Math.max(180, height * 0.25);
  const bottles = Array.from({ length: tubeCount }, (_, index) => {
    const row = Math.floor(index / columns);
    const rowCount = Math.min(columns, tubeCount - row * columns);
    const rowWidth = rowCount * bottleWidth + (rowCount - 1) * gap;
    const column = index % columns;
    return {
      x: scene.x + (sceneWidth - rowWidth) / 2 + column * (bottleWidth + gap),
      y: boardTop + row * (bottleHeight + rowGap), width: bottleWidth, height: bottleHeight,
    };
  });
  return { scene, columns, bottles, bottleWidth, bottleHeight };
}

export function hitTestBottle(layout, x, y) {
  const index = layout.bottles.findIndex((box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height);
  return index < 0 ? null : index;
}

function drawSand(ctx, box, tube) {
  const inner = { x: box.x + box.width * 0.23, y: box.y + box.height * 0.19, width: box.width * 0.54, height: box.height * 0.70 };
  const layerHeight = inner.height / 4;
  tube.forEach((color, index) => {
    ctx.fillStyle = PALETTE[color];
    ctx.fillRect(inner.x, inner.y + inner.height - layerHeight * (index + 1), inner.width, layerHeight + 1);
  });
}

export function createRenderer(canvas, assets) {
  const ctx = canvas.getContext('2d');
  let layout = computeLayout(canvas.clientWidth || 390, canvas.clientHeight || 844, 0);
  function resize(tubeCount) {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    layout = computeLayout(rect.width, rect.height, tubeCount);
    return layout;
  }
  function drawTube(tube, index, transform = {}) {
    const box = layout.bottles[index];
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    ctx.save();
    ctx.translate(centerX + (transform.dx || 0), centerY + (transform.dy || 0));
    ctx.rotate(transform.rotation || 0);
    ctx.translate(-centerX, -centerY);
    drawSand(ctx, box, tube);
    ctx.drawImage(assets.bottle, box.x, box.y, box.width, box.height);
    ctx.restore();
  }
  function draw(frame, options = {}) {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.drawImage(assets.background, layout.scene.x, 0, layout.scene.width, layout.scene.height);
    frame.tubes.forEach((tube, index) => {
      if (index !== options.hiddenIndex) drawTube(tube, index);
    });
  }
  return { resize, draw, getLayout: () => layout };
}
```

- [ ] **Step 5: 补充选中上浮、瓶子倾斜、弧线沙粒、非法摇晃和彩纸动画**

Add this timing helper and public animation methods inside `createRenderer`; keep all animation state inside the renderer and always resolve the Promise:

```js
function tween(duration, paint) {
  return new Promise((resolve) => {
    const started = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - started) / duration);
      paint(progress);
      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
}

function quadraticPoint(start, control, end, t) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

async function animatePour(frame, plan) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const source = layout.bottles[plan.from];
  const target = layout.bottles[plan.to];
  const direction = source.x < target.x ? 1 : -1;
  const pourDx = target.x + target.width / 2 - (source.x + source.width / 2) - direction * target.width * 0.58;
  const pourDy = target.y - source.y - source.height * 0.45;
  const ease = (value) => 1 - (1 - value) ** 3;
  await tween(reduced ? 180 : 620, (progress) => {
    const moveIn = ease(Math.min(1, progress / 0.35));
    const moveOut = progress <= 0.78 ? 0 : ease((progress - 0.78) / 0.22);
    const travel = progress <= 0.78 ? moveIn : 1 - moveOut;
    const dx = pourDx * travel;
    const dy = pourDy * travel;
    const rotation = direction * 1.18 * Math.min(moveIn, 1 - moveOut);
    draw(frame, { hiddenIndex: plan.from });
    drawTube(frame.tubes[plan.from], plan.from, { dx, dy, rotation });
    if (!reduced && progress >= 0.35 && progress <= 0.78) {
      const stream = (progress - 0.35) / 0.43;
      const start = { x: source.x + source.width / 2 + dx + direction * source.height * 0.34, y: source.y + source.height * 0.18 + dy };
      const end = { x: target.x + target.width / 2, y: target.y + target.height * 0.16 };
      const control = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - 54 };
      ctx.fillStyle = PALETTE[plan.color];
      for (let index = 0; index < 28; index += 1) {
        const point = quadraticPoint(start, control, end, Math.max(0, stream - index / 44));
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.7 + index % 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

async function shake(frame, index) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  await tween(reduced ? 80 : 260, (progress) => {
    draw(frame, { hiddenIndex: index });
    drawTube(frame.tubes[index], index, { dx: Math.sin(progress * Math.PI * 8) * 5 });
  });
}

async function flashHint(frame, from, to) {
  await tween(520, (progress) => {
    draw(frame);
    ctx.save();
    ctx.strokeStyle = `rgba(118,242,202,${0.35 + Math.sin(progress * Math.PI * 4) * 0.3})`;
    ctx.lineWidth = 4;
    for (const index of [from, to]) {
      const box = layout.bottles[index];
      ctx.strokeRect(box.x - 4, box.y - 4, box.width + 8, box.height + 8);
    }
    ctx.restore();
  });
}

async function celebrate(frame) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pieces = Array.from({ length: 80 }, (_, index) => ({
    x: layout.scene.x + (index * 73 % Math.max(1, layout.scene.width)),
    y: -20 - (index % 8) * 12,
    color: Object.values(PALETTE)[index % Object.keys(PALETTE).length],
  }));
  await tween(1100, (progress) => {
    draw(frame);
    for (const piece of pieces) {
      ctx.fillStyle = piece.color;
      ctx.fillRect(piece.x + Math.sin(progress * 8 + piece.x) * 18, piece.y + progress * (layout.scene.height + 80), 6, 10);
    }
  });
}

return { resize, draw, animatePour, shake, flashHint, celebrate, getLayout: () => layout };
```

- [ ] **Step 6: 运行渲染器测试并提交**

Run: `node --test Games/sand-sort-renderer.test.mjs`

Expected: PASS, 3 tests.

```bash
git add Games/sand-sort-assets Games/sand-sort-renderer.mjs Games/sand-sort-renderer.test.mjs
git commit -m "feat: add sand sort canvas renderer"
```

---

### Task 4: 会话状态与免费工具

**Files:**
- Create: `Games/sand-sort-session.test.mjs`
- Create: `Games/sand-sort-session.mjs`

**Interfaces:**
- Consumes: `createLevel()`, `planPour()`, `applyPour()`, `suggestMove()`, `isSolved()`。
- Produces: `createSession(levelIndex, variation)`, `selectTube(session, index)`, `commitPendingMove(session)`, `undo(session)`, `restart(session)`, `reshuffle(session)`, `addExtraTube(session)`, `getHint(session)`。

- [ ] **Step 1: 写会话和免费工具的失败测试**

```js
// Games/sand-sort-session.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addExtraTube, commitPendingMove, createSession, restart, reshuffle, selectTube, undo,
} from './sand-sort-session.mjs';

test('two selections stage and commit one legal move with history', () => {
  let session = createSession(0, 0);
  const solution = session.level.solution[0];
  session = selectTube(session, solution.from);
  session = selectTube(session, solution.to);
  assert.ok(session.pendingMove);
  session = commitPendingMove(session);
  assert.equal(session.history.length, 1);
  assert.equal(session.selected, null);
});

test('undo restores the previous immutable tubes', () => {
  let session = createSession(0, 0);
  const before = session.tubes;
  const solution = session.level.solution[0];
  session = commitPendingMove(selectTube(selectTube(session, solution.from), solution.to));
  session = undo(session);
  assert.deepEqual(session.tubes, before);
});

test('extra bottle is free but only one can be active at a time', () => {
  let session = createSession(0, 0);
  const baseCount = session.tubes.length;
  session = addExtraTube(session);
  session = addExtraTube(session);
  assert.equal(session.tubes.length, baseCount + 1);
  assert.equal(session.extraTube, true);
});

test('restart removes extra bottle and reshuffle changes variation', () => {
  let session = addExtraTube(createSession(4, 0));
  session = restart(session);
  assert.equal(session.extraTube, false);
  const next = reshuffle(session);
  assert.equal(next.variation, 1);
  assert.notDeepEqual(next.tubes, session.tubes);
});
```

- [ ] **Step 2: 运行测试并确认会话模块缺失**

Run: `node --test Games/sand-sort-session.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `sand-sort-session.mjs`.

- [ ] **Step 3: 实现不可变会话 reducer 函数**

```js
// Games/sand-sort-session.mjs
import { createLevel } from './sand-sort-levels.mjs';
import { applyPour, isSolved, planPour, suggestMove } from './sand-sort-rules.mjs';

function cloneTubes(tubes) { return tubes.map((tube) => [...tube]); }

export function createSession(levelIndex = 0, variation = 0) {
  const level = createLevel(levelIndex, variation);
  return { levelIndex, variation, level, tubes: cloneTubes(level.tubes), selected: null, pendingMove: null, history: [], extraTube: false, solved: false, message: '选择一个瓶子' };
}

export function selectTube(session, index) {
  if (!session.tubes[index] || session.pendingMove || session.solved) return session;
  if (session.selected === null) {
    if (!session.tubes[index].length) return { ...session, message: '这个瓶子是空的' };
    return { ...session, selected: index, message: '选择目标瓶子' };
  }
  if (session.selected === index) return { ...session, selected: null, message: '已取消选择' };
  const pendingMove = planPour(session.tubes, session.selected, index, session.level.capacity);
  return pendingMove
    ? { ...session, pendingMove, message: '正在倒沙' }
    : { ...session, selected: null, message: '只能倒入空瓶或同色沙层' };
}

export function commitPendingMove(session) {
  if (!session.pendingMove) return session;
  const previous = cloneTubes(session.tubes);
  const tubes = applyPour(session.tubes, session.pendingMove);
  return { ...session, tubes, history: [...session.history, previous], selected: null, pendingMove: null, solved: isSolved(tubes), message: isSolved(tubes) ? '分类完成' : '继续整理沙子' };
}

export function undo(session) {
  if (!session.history.length) return { ...session, message: '还没有可以撤销的步骤' };
  const tubes = cloneTubes(session.history.at(-1));
  return { ...session, tubes, history: session.history.slice(0, -1), selected: null, pendingMove: null, solved: false, message: '已撤销一步' };
}

export function restart(session) { return createSession(session.levelIndex, session.variation); }
export function reshuffle(session) { return createSession(session.levelIndex, session.variation + 1); }
export function addExtraTube(session) {
  if (session.extraTube) return { ...session, message: '已经增加了一个空瓶' };
  return { ...session, tubes: [...cloneTubes(session.tubes), []], extraTube: true, message: '已免费增加空瓶' };
}
export function getHint(session) { return suggestMove(session.tubes, session.level.capacity); }
```

- [ ] **Step 4: 运行四组模块测试**

Run: `node --test Games/sand-sort-rules.test.mjs Games/sand-sort-levels.test.mjs Games/sand-sort-renderer.test.mjs Games/sand-sort-session.test.mjs`

Expected: PASS, 15 tests.

- [ ] **Step 5: 提交会话状态模块**

```bash
git add Games/sand-sort-session.mjs Games/sand-sort-session.test.mjs
git commit -m "feat: add sand sort session tools"
```

---

### Task 5: 完整页面、输入、声音与存档

**Files:**
- Create: `Games/sand-sort.html`
- Create: `Games/sand-sort.css`
- Create: `Games/sand-sort-game.mjs`

**Interfaces:**
- Consumes: renderer and session APIs from Tasks 3–4.
- Produces: a directly runnable page at `/Games/sand-sort.html`; localStorage key `phdsx-sand-sort-v1` with `{ currentLevel, unlockedLevel, coins, muted }`.

- [ ] **Step 1: 创建具有完整无障碍名称的页面外壳**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#090f2f">
  <title>沙子分类 · PHDSX</title>
  <link rel="stylesheet" href="sand-sort.css">
</head>
<body>
  <main class="game-shell" data-game-state="loading">
    <header class="status-bar">
      <a class="back-button" href="../games.html" aria-label="返回游戏列表">返回</a>
      <div class="level-pill">第 <strong id="level-number">1</strong> 关</div>
      <div class="resource-pill" aria-label="体力充足">体力 <strong>充足</strong></div>
      <div class="resource-pill" aria-label="金币"><span id="coin-count">200</span></div>
      <button id="sound-button" type="button" aria-pressed="false">声音</button>
    </header>
    <canvas id="game-canvas" tabindex="0" aria-label="沙子分类游戏区域"></canvas>
    <p id="game-status" class="game-status" aria-live="polite">正在载入游戏</p>
    <nav class="tool-dock" aria-label="免费游戏工具">
      <button type="button" data-tool="undo">撤销<small>免费</small></button>
      <button type="button" data-tool="hint">提示<small>免费</small></button>
      <button type="button" data-tool="shuffle">重排<small>免费</small></button>
      <button type="button" data-tool="extra">加空瓶<small>免费</small></button>
      <button type="button" data-tool="restart">重开<small>免费</small></button>
    </nav>
    <section id="tutorial" class="overlay-card" role="dialog" aria-labelledby="tutorial-title">
      <h1 id="tutorial-title">点击瓶子开始分类</h1>
      <p>先选择装有沙子的瓶子，再选择空瓶或顶部同色的瓶子。</p>
      <button type="button" data-action="start">开始游戏</button>
    </section>
    <section id="win-dialog" class="overlay-card" role="dialog" aria-modal="true" aria-labelledby="win-title" hidden>
      <h2 id="win-title">分类完成！</h2>
      <p>所有颜色都回到了自己的瓶子。</p>
      <button type="button" data-action="next">下一关</button>
    </section>
  </main>
  <script type="module" src="sand-sort-game.mjs"></script>
</body>
</html>
```

- [ ] **Step 2: 实现固定工具栏和响应式游戏画布样式**

Create `sand-sort.css` with these exact layout constraints:

```css
:root { color-scheme: dark; font-family: Inter, "Microsoft YaHei", system-ui, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; overflow: hidden; background: #050a22; color: #fff; }
button, a { font: inherit; -webkit-tap-highlight-color: transparent; }
button { min-width: 44px; min-height: 44px; }
.game-shell { position: relative; min-height: 100svh; max-width: 560px; margin: auto; overflow: hidden; background: #090f2f; }
.status-bar { position: absolute; inset: 0 0 auto; z-index: 5; display: flex; align-items: center; gap: 8px; min-height: 72px; padding: max(10px, env(safe-area-inset-top)) 12px 8px; }
.status-bar > * { border: 1px solid rgba(255,255,255,.2); border-radius: 999px; background: rgba(7,10,34,.72); color: #fff; }
.back-button, .status-bar button { display: grid; place-items: center; padding: 0 12px; text-decoration: none; }
.level-pill, .resource-pill { padding: 9px 11px; font-size: 12px; }
#game-canvas { display: block; width: 100%; height: calc(100svh - 82px); touch-action: manipulation; }
.game-status { position: absolute; right: 16px; bottom: 92px; left: 16px; z-index: 4; margin: 0; text-align: center; font-size: 13px; text-shadow: 0 2px 8px #000; pointer-events: none; }
.tool-dock { position: absolute; inset: auto 0 0; z-index: 6; display: grid; grid-template-columns: repeat(5, 1fr); min-height: 82px; padding: 8px max(8px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left)); background: rgba(4,7,25,.88); backdrop-filter: blur(14px); }
.tool-dock button { display: grid; place-items: center; gap: 2px; border: 0; border-right: 1px solid rgba(255,255,255,.1); background: transparent; color: #fff; font-weight: 800; }
.tool-dock button:last-child { border-right: 0; }
.tool-dock small { color: #76f2ca; font-size: 10px; }
.overlay-card { position: absolute; top: 50%; left: 50%; z-index: 10; width: min(calc(100% - 36px), 430px); padding: 28px; border: 1px solid rgba(255,255,255,.32); border-radius: 28px; background: rgba(250,247,248,.96); color: #532a4e; text-align: center; box-shadow: 0 24px 80px rgba(0,0,0,.42); transform: translate(-50%,-50%); }
.overlay-card button { padding: 0 22px; border: 0; border-radius: 999px; background: #7a3cff; color: #fff; font-weight: 900; }
@media (max-width: 430px) { .tool-dock button { font-size: 11px; } .status-bar { gap: 4px; padding-inline: 7px; } .level-pill, .resource-pill { padding-inline: 8px; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
```

- [ ] **Step 3: 实现素材载入、存档降级和输入坐标映射**

```js
// Games/sand-sort-game.mjs (core wiring)
import { createRenderer, hitTestBottle } from './sand-sort-renderer.mjs';
import { addExtraTube, commitPendingMove, createSession, getHint, restart, reshuffle, selectTube, undo } from './sand-sort-session.mjs';

const STORAGE_KEY = 'phdsx-sand-sort-v1';
const canvas = document.querySelector('#game-canvas');
const status = document.querySelector('#game-status');
const shell = document.querySelector('.game-shell');
let locked = false;

function loadProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { currentLevel: Math.max(0, Math.min(29, Number(value.currentLevel) || 0)), unlockedLevel: Math.max(0, Math.min(29, Number(value.unlockedLevel) || 0)), coins: Number(value.coins) || 200, muted: Boolean(value.muted) };
  } catch { return { currentLevel: 0, unlockedLevel: 0, coins: 200, muted: false }; }
}

function saveProgress(progress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* continue without persistence */ }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

const [background, bottle] = await Promise.all([
  loadImage('./sand-sort-assets/background.png'),
  loadImage('./sand-sort-assets/bottle-glass.png'),
]);
const progress = loadProgress();
let session = createSession(progress.currentLevel, 0);
const renderer = createRenderer(canvas, { background, bottle });

function render() {
  renderer.resize(session.tubes.length);
  renderer.draw(session);
  status.textContent = session.message;
  document.querySelector('#level-number').textContent = String(session.levelIndex + 1);
  document.querySelector('#coin-count').textContent = String(progress.coins);
  shell.dataset.gameState = session.solved ? 'solved' : 'playing';
}

canvas.addEventListener('pointerup', async (event) => {
  if (locked) return;
  const rect = canvas.getBoundingClientRect();
  const index = hitTestBottle(renderer.getLayout(), event.clientX - rect.left, event.clientY - rect.top);
  if (index === null) return;
  const previousSelected = session.selected;
  session = selectTube(session, index);
  render();
  if (!session.pendingMove) {
    if (previousSelected !== null && previousSelected !== index) {
      locked = true;
      await renderer.shake(session, index);
      locked = false;
      playTone(150, 0.09);
    }
    return;
  }
  locked = true;
  await renderer.animatePour(session, session.pendingMove);
  session = commitPendingMove(session);
  playTone(430, 0.07);
  locked = false;
  render();
  if (session.solved) await completeLevel();
});
```

- [ ] **Step 4: 绑定五个免费工具、教学、下一关和声音**

Add the complete tool and completion bindings below. Implement `playTone(frequency, duration)` with an `AudioContext`, immediately return when `progress.muted` is true, and wrap context creation/playback in `try/catch` so audio failure never blocks the game.

```js
document.querySelector('.tool-dock').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-tool]');
  if (!button || locked) return;
  const tool = button.dataset.tool;
  if (tool === 'undo') session = undo(session);
  if (tool === 'shuffle') session = reshuffle(session);
  if (tool === 'extra') session = addExtraTube(session);
  if (tool === 'restart') session = restart(session);
  if (tool === 'hint') {
    const hint = getHint(session);
    if (hint) await renderer.flashHint(session, hint.from, hint.to);
    else session = { ...session, message: '可以重排或增加空瓶' };
  }
  render();
});

document.querySelector('[data-action="start"]').addEventListener('click', () => {
  document.querySelector('#tutorial').hidden = true;
  canvas.focus();
});

document.querySelector('[data-action="next"]').addEventListener('click', () => {
  const nextIndex = (session.levelIndex + 1) % 30;
  progress.currentLevel = nextIndex;
  progress.unlockedLevel = Math.max(progress.unlockedLevel, nextIndex);
  progress.coins += 50;
  saveProgress(progress);
  session = createSession(nextIndex, 0);
  document.querySelector('#win-dialog').hidden = true;
  render();
});

document.querySelector('#sound-button').addEventListener('click', (event) => {
  progress.muted = !progress.muted;
  event.currentTarget.setAttribute('aria-pressed', String(progress.muted));
  event.currentTarget.textContent = progress.muted ? '静音' : '声音';
  saveProgress(progress);
});

let audioContext;
function playTone(frequency, duration) {
  if (progress.muted) return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch { /* continue silently */ }
}

async function completeLevel() {
  locked = true;
  playTone(660, 0.18);
  await renderer.celebrate(session);
  document.querySelector('#win-dialog').hidden = false;
  locked = false;
}
```

- [ ] **Step 5: 检查三个页面文件的语法与静态引用**

Run: `node --check Games/sand-sort-game.mjs`

Expected: no output, exit code 0.

Run: `rg -n "https?://|ads|advert|watch ad|商城|购买|登录" Games/sand-sort.html Games/sand-sort.css Games/sand-sort-game.mjs`

Expected: no matches.

- [ ] **Step 6: 启动本地预览并完成核心交互冒烟测试**

Run from repository root:

```powershell
$previewPython='C:\Users\YUE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
Start-Process -FilePath $previewPython -ArgumentList '-m','http.server','8766','--bind','127.0.0.1' -WorkingDirectory 'D:\code\html\phdsx.github.io' -WindowStyle Hidden -PassThru
```

Open `http://127.0.0.1:8766/Games/sand-sort.html` in the in-app browser. Verify the tutorial closes, two bottle selections produce one animated pour, input is locked during the animation, invalid moves shake, and the status text updates.

- [ ] **Step 7: 提交可运行页面**

```bash
git add Games/sand-sort.html Games/sand-sort.css Games/sand-sort-game.mjs
git commit -m "feat: build playable sand sort game"
```

---

### Task 6: 站点入口、完整验收和设计 QA

**Files:**
- Modify: `games.html` inside `.card-grid`, after the Parking Pulse card.
- Create: `design-qa.md`

**Interfaces:**
- Consumes: `Games/sand-sort-assets/game-cover.png` and the runnable page from Task 5.
- Produces: a discoverable game card and a passing QA report with `final result: passed`.

- [ ] **Step 1: 在游戏列表添加唯一入口**

```html
<article class="link-card">
  <img class="card-media" src="Games/sand-sort-assets/game-cover.png" alt="彩色沙子在玻璃瓶之间倾倒">
  <div><span class="tag">Puzzle</span><h3>沙子分类</h3><p>把同色沙粒整理进同一个瓶子，所有辅助功能免费使用。</p></div>
  <a class="card-action" href="Games/sand-sort.html">开始</a>
</article>
```

- [ ] **Step 2: 运行全部自动测试与静态检查**

Run: `node --test Games/sand-sort-rules.test.mjs Games/sand-sort-levels.test.mjs Games/sand-sort-renderer.test.mjs Games/sand-sort-session.test.mjs`

Expected: PASS, 15 tests.

Run each command separately:

```powershell
node --check Games/sand-sort-rules.mjs
node --check Games/sand-sort-levels.mjs
node --check Games/sand-sort-renderer.mjs
node --check Games/sand-sort-session.mjs
node --check Games/sand-sort-game.mjs
```

Expected: no output and exit code 0 from every command.

Run: `rg -n "https?://|googletag|gamedistribution|clarity|watch.?ad|广告解锁|购买" Games/sand-sort*`

Expected: no matches in the new game files.

- [ ] **Step 3: 在桌面视口完成浏览器验收**

At `1440 × 900`, capture the start/tutorial state, active gameplay state, mid-pour animation and win dialog. Verify no horizontal overflow, Canvas stays centered, all five tools are visible, the browser console has no errors, and no network requests occur after local assets finish loading.

- [ ] **Step 4: 在移动视口完成浏览器验收**

At `390 × 844`, repeat selection, valid pour, invalid pour, undo, hint, shuffle, add extra bottle, restart, win and next-level flows. Verify all bottle and tool hit targets remain at least `44 × 44`, the fifth tool is not clipped, and the win dialog fits without scrolling.

- [ ] **Step 5: 验证存档、免费能力和降级行为**

Complete level 1, reload, and verify level 2 remains current and unlocked. Use every tool repeatedly and confirm no ad prompt, currency deduction, cooldown or external navigation appears. Corrupt `phdsx-sand-sort-v1` in localStorage, reload, and verify the game starts from safe defaults. Enable reduced motion and verify pour duration is shortened and celebration particles are suppressed.

- [ ] **Step 6: 运行 Product Design design-qa 阻塞门禁**

Read and follow the Product Design `design-qa` skill. Compare source and local screenshots at the same viewport/state in one combined comparison. Fix all P0/P1/P2 findings, recapture, and repeat until the report contains:

```markdown
# Sand Sort Design QA

## Source comparison
- Reference: https://zh.y8.com/games/sand_sort_color_puzzle
- Scope: game-only recreation; Y8 shell and monetization intentionally omitted.

## Automated checks
- Rules, levels, renderer and session tests: passed.
- Runtime network dependencies: none.

## Browser checks
- Desktop 1440 × 900: passed.
- Mobile 390 × 844: passed.
- Free tools and progress restore: passed.

## Result
final result: passed
```

- [ ] **Step 7: 提交入口与通过的 QA 报告**

```bash
git add games.html design-qa.md
git commit -m "chore: link and verify sand sort game"
```

- [ ] **Step 8: 最终验证工作区中的成品**

Run: `git diff --check HEAD~6..HEAD`

Expected: no output.

Run: `git log -6 --oneline`

Expected: six scoped commits ending with `chore: link and verify sand sort game`.
