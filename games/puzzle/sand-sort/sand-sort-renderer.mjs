const PALETTE = {
  pink: '#e68080', orange: '#e7a853', blue: '#47a9d7', green: '#4b9f91',
  violet: '#9271c7', yellow: '#e9c56f', cyan: '#67bfc6', red: '#ca6570',
  lime: '#a1bf69', brown: '#a97953',
};

const SHELF_ANCHORS = [0.49, 0.805];
const BOTTLE_MOUTH_SOURCE_Y = 0.09;
const SAND_INSET = { left: 0.225, right: 0.775, top: 0.34, bottom: 0.915 };

export function computeBottleSourceRect(imageWidth, imageHeight) {
  const width = imageWidth * 0.54;
  const height = Math.min(imageHeight, width * 2.45);
  return { x: (imageWidth - width) / 2, y: (imageHeight - height) / 2, width, height };
}

export function computeBottleMouthAnchor(imageWidth, imageHeight) {
  const source = computeBottleSourceRect(imageWidth, imageHeight);
  return {
    x: (imageWidth / 2 - source.x) / source.width,
    y: (imageHeight * BOTTLE_MOUTH_SOURCE_Y - source.y) / source.height,
  };
}

export function transformBottlePoint(box, point, transform = {}) {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const x = box.x + box.width * point.x;
  const y = box.y + box.height * point.y;
  const rotation = transform.rotation || 0;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return {
    x: centerX + (transform.dx || 0) + (x - centerX) * cosine - (y - centerY) * sine,
    y: centerY + (transform.dy || 0) + (x - centerX) * sine + (y - centerY) * cosine,
  };
}

export function getMotionSettings(reducedMotion) {
  return reducedMotion
    ? { pourDuration: 180, shakeDuration: 0, shakeAmplitude: 0, shakeOscillations: 0, hintDuration: 0, hintPulses: 0 }
    : { pourDuration: 1050, shakeDuration: 260, shakeAmplitude: 5, shakeOscillations: 4, hintDuration: 520, hintPulses: 2 };
}

export function tween(duration, paint, timing = {}) {
  const now = timing.now ?? (() => performance.now());
  const requestFrame = timing.requestFrame ?? ((callback) => requestAnimationFrame(callback));
  return new Promise((resolve, reject) => {
    const started = now();
    function tick(frameTime) {
      try {
        const progress = duration <= 0 ? 1 : Math.min(1, (frameTime - started) / duration);
        paint(progress);
        if (progress < 1) requestFrame(tick);
        else resolve();
      } catch (error) {
        reject(error);
      }
    }
    requestFrame(tick);
  });
}

export function computeLayout(width, height, tubeCount) {
  const sceneWidth = Math.min(width, 560);
  const scene = { x: (width - sceneWidth) / 2, y: 0, width: sceneWidth, height };
  const columns = Math.min(5, Math.ceil(tubeCount / 2));
  const gap = Math.max(8, Math.min(18, sceneWidth * 0.025));
  const shelfLimit = height * (SHELF_ANCHORS[1] - SHELF_ANCHORS[0] - 0.025) / 2.45;
  const bottleWidth = Math.max(44, Math.min(92, shelfLimit, (sceneWidth - gap * (columns + 1)) / columns));
  const bottleHeight = bottleWidth * 2.45;
  const rowTotal = columns === 0 ? 0 : Math.ceil(tubeCount / columns);
  const fallbackTop = Math.max(20, height * 0.12);
  const fallbackBottom = 20;
  const fallbackGap = rowTotal > 1
    ? Math.max(12, (height - fallbackTop - fallbackBottom - rowTotal * bottleHeight) / (rowTotal - 1))
    : 0;
  const bottles = Array.from({ length: tubeCount }, (_, index) => {
    const row = Math.floor(index / columns);
    const rowCount = Math.min(columns, tubeCount - row * columns);
    const rowGap = (sceneWidth - rowCount * bottleWidth) / (rowCount + 1);
    const column = index % columns;
    const rowTop = rowTotal <= SHELF_ANCHORS.length
      ? scene.y + scene.height * SHELF_ANCHORS[row] - bottleHeight
      : fallbackTop + row * (bottleHeight + fallbackGap);
    return {
      x: scene.x + rowGap * (column + 1) + column * bottleWidth,
      y: rowTop, width: bottleWidth, height: bottleHeight,
    };
  });
  return { scene, columns, bottles, bottleWidth, bottleHeight };
}

export function hitTestBottle(layout, x, y) {
  const index = layout.bottles.findIndex((box) => x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height);
  return index < 0 ? null : index;
}

function noise(seed) {
  const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function sandGeometry(box) {
  return {
    x: box.x + box.width * SAND_INSET.left,
    width: box.width * (SAND_INSET.right - SAND_INSET.left),
    top: box.y + box.height * SAND_INSET.top,
    bottom: box.y + box.height * SAND_INSET.bottom,
  };
}

function createSandPatterns(ctx) {
  if (typeof document === 'undefined') return {};
  return Object.fromEntries(Object.entries(PALETTE).map(([color, base]) => {
    const tile = document.createElement('canvas');
    tile.width = 48;
    tile.height = 48;
    const texture = tile.getContext('2d');
    texture.fillStyle = base;
    texture.fillRect(0, 0, 48, 48);
    for (let i = 0; i < 640; i += 1) {
      const x = Math.floor(noise(i * 3.11 + color.length) * 48);
      const y = Math.floor(noise(i * 7.37 + color.length * 9) * 48);
      texture.globalAlpha = 0.16 + noise(i * 1.73) * 0.45;
      texture.fillStyle = i % 4 === 0 ? '#fff7e8' : '#302626';
      texture.fillRect(x, y, 0.8 + noise(i * 4.71), 0.8 + noise(i * 8.13));
    }
    texture.globalAlpha = 1;
    return [color, ctx.createPattern(tile, 'repeat')];
  }));
}

function layerProfile(xRatio, top, thickness, seed, mound) {
  const slope = (noise(seed + 1) - 0.5) * Math.min(7, thickness * 0.35);
  const crest = mound * Math.exp(-(((xRatio - 0.5) / 0.31) ** 2));
  const ripple = (Math.sin(xRatio * 19 + seed) + Math.sin(xRatio * 39 + seed * 0.4) * 0.5) * 0.36;
  return top + slope * (xRatio - 0.5) - crest + ripple;
}

// Layers are fractional during a pour. The visible surface rises continuously while
// the puzzle state remains discrete and changes only after the animation completes.
export function getVisibleLayers(tube, removeUnits = 0, addColor = null, addUnits = 0) {
  const layers = tube.map((color) => ({ color, units: 1 }));
  let remaining = Math.max(0, removeUnits);
  while (remaining > 0 && layers.length) {
    const top = layers.at(-1);
    const removed = Math.min(top.units, remaining);
    top.units -= removed;
    remaining -= removed;
    if (top.units < 0.0001) layers.pop();
  }
  if (addColor && addUnits > 0) layers.push({ color: addColor, units: addUnits });
  return layers;
}

function drawSand(ctx, box, tube, patterns, effect = {}) {
  const inner = sandGeometry(box);
  const unitHeight = (inner.bottom - inner.top) / 4;
  const layers = getVisibleLayers(tube, effect.removeUnits, effect.addColor, effect.addUnits);
  if (!layers.length) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(inner.x + 2, inner.top);
  ctx.lineTo(inner.x + inner.width - 2, inner.top);
  ctx.lineTo(inner.x + inner.width, inner.bottom - 4);
  ctx.quadraticCurveTo(inner.x + inner.width, inner.bottom, inner.x + inner.width - 4, inner.bottom);
  ctx.lineTo(inner.x + 4, inner.bottom);
  ctx.quadraticCurveTo(inner.x, inner.bottom, inner.x, inner.bottom - 4);
  ctx.closePath();
  ctx.clip();

  let cumulative = 0;
  layers.forEach(({ color, units }, layerIndex) => {
    const bottom = inner.bottom - unitHeight * cumulative;
    const thickness = unitHeight * units;
    const top = bottom - thickness;
    const seed = (layerIndex + 1) * 19 + color.length * 37 + box.x * 0.01;
    const mound = layerIndex === layers.length - 1 ? Math.min(5, thickness * 0.26) : 0;
    const tiltSlope = layerIndex === layers.length - 1
      ? Math.max(-inner.width * 0.8, Math.min(inner.width * 0.8, -Math.tan(effect.tilt || 0) * inner.width * 0.42))
      : 0;
    const profile = (ratio) => layerProfile(ratio, top, thickness, seed, mound) + tiltSlope * (ratio - 0.5);
    const gradient = ctx.createLinearGradient(inner.x, top, inner.x + inner.width, bottom);
    gradient.addColorStop(0, '#574239');
    gradient.addColorStop(0.15, PALETTE[color] || '#aaa');
    gradient.addColorStop(0.76, PALETTE[color] || '#aaa');
    gradient.addColorStop(1, '#4c4544');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(inner.x, bottom + 1);
    ctx.lineTo(inner.x, profile(0));
    for (let step = 1; step <= 14; step += 1) {
      const ratio = step / 14;
      ctx.lineTo(inner.x + inner.width * ratio, profile(ratio));
    }
    ctx.lineTo(inner.x + inner.width, bottom + 1);
    ctx.closePath();
    ctx.fill();

    if (patterns[color]) {
      ctx.globalAlpha = 0.58;
      ctx.fillStyle = patterns[color];
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // A deterministic stipple makes grains readable without storing thousands of
    // independent bodies or changing the pattern on every animation frame.
    const grainCount = Math.ceil(58 * units);
    for (let grain = 0; grain < grainCount; grain += 1) {
      const nx = noise(seed * 31 + grain * 5.23);
      const ny = noise(seed * 17 + grain * 8.19);
      const y = top + thickness * ny;
      if (y < profile(nx) + 0.5) continue;
      ctx.globalAlpha = 0.16 + noise(seed + grain) * 0.42;
      ctx.fillStyle = grain % 3 === 0 ? '#fff5da' : '#4b382e';
      const size = Math.max(0.5, box.width * (0.006 + noise(grain + seed) * 0.009));
      ctx.fillRect(inner.x + nx * inner.width, y, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,248,218,.36)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let step = 0; step <= 14; step += 1) {
      const ratio = step / 14;
      if (step === 0) ctx.moveTo(inner.x, profile(ratio));
      else ctx.lineTo(inner.x + inner.width * ratio, profile(ratio));
    }
    ctx.stroke();
    cumulative += units;
  });
  ctx.restore();
}

export function createRenderer(canvas, assets) {
  const ctx = canvas.getContext('2d');
  const sandPatterns = createSandPatterns(ctx);
  const bottleImageWidth = assets.bottle.naturalWidth || assets.bottle.width;
  const bottleImageHeight = assets.bottle.naturalHeight || assets.bottle.height;
  const bottleSource = computeBottleSourceRect(bottleImageWidth, bottleImageHeight);
  const bottleMouthAnchor = computeBottleMouthAnchor(bottleImageWidth, bottleImageHeight);
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

  function drawBackdrop() {
    const { scene } = layout;
    const width = assets.background.naturalWidth || assets.background.width;
    const height = assets.background.naturalHeight || assets.background.height;
    if (width && height) {
      ctx.drawImage(assets.background, 0, 0, width, height * 0.855, scene.x, 0, scene.width, scene.height);
    } else {
      ctx.fillStyle = '#182033';
      ctx.fillRect(scene.x, 0, scene.width, scene.height);
    }
    const vignette = ctx.createLinearGradient(0, 0, 0, scene.height);
    vignette.addColorStop(0, 'rgba(6,10,20,.08)');
    vignette.addColorStop(1, 'rgba(6,8,14,.13)');
    ctx.fillStyle = vignette;
    ctx.fillRect(scene.x, 0, scene.width, scene.height);
  }

  function drawTube(tube, index, transform = {}, effect = {}) {
    const box = layout.bottles[index];
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    ctx.save();
    ctx.translate(centerX + (transform.dx || 0), centerY + (transform.dy || 0));
    ctx.rotate(transform.rotation || 0);
    ctx.translate(-centerX, -centerY);
    if (!transform.rotation) {
      ctx.fillStyle = 'rgba(5,5,9,.42)';
      ctx.beginPath();
      ctx.ellipse(centerX, box.y + box.height - 1, box.width * 0.39, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    drawSand(ctx, box, tube, sandPatterns, effect);
    ctx.drawImage(assets.bottle, bottleSource.x, bottleSource.y, bottleSource.width, bottleSource.height, box.x, box.y, box.width, box.height);
    if (transform.selected) {
      ctx.strokeStyle = 'rgba(255,218,159,.88)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(centerX, box.y + box.height * 0.52, box.width * 0.49, box.height * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(frame, options = {}) {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    drawBackdrop();
    frame.tubes.forEach((tube, index) => {
      if (index === options.hiddenIndex) return;
      const selected = frame.selected === index && !options.effects;
      drawTube(tube, index, selected ? { dy: -8, selected: true } : {}, options.effects?.[index]);
    });
  }

  function drawFallingGrains(start, end, color, pourProgress, count) {
    const flightTime = 0.34;
    const gravity = 530;
    const velocityY = (end.y - start.y - 0.5 * gravity * flightTime ** 2) / flightTime;
    const pourSeconds = 0.53;
    const particleCount = Math.min(180, 76 + count * 25);
    for (let i = 0; i < particleCount; i += 1) {
      const release = i / particleCount * pourSeconds;
      const age = pourProgress * pourSeconds - release;
      if (age < 0 || age > flightTime + 0.12) continue;
      const spread = (noise(i * 4.1) - 0.5) * 5;
      let x;
      let y;
      if (age <= flightTime) {
        x = start.x + (end.x - start.x) * age / flightTime + spread * age / flightTime;
        y = start.y + velocityY * age + 0.5 * gravity * age ** 2;
      } else {
        const bounce = age - flightTime;
        x = end.x + spread + (noise(i * 1.7) - 0.5) * bounce * 65;
        y = end.y + bounce * (noise(i * 8.3) * -35) + 200 * bounce ** 2;
      }
      ctx.globalAlpha = age > flightTime ? Math.max(0, 1 - (age - flightTime) / 0.12) : 0.92;
      ctx.fillStyle = i % 3 === 0 ? '#fff1d8' : PALETTE[color];
      const size = 0.7 + noise(i * 3.3) * 1.15;
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
  }

  async function animatePour(frame, plan) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motion = getMotionSettings(reduced);
    const source = layout.bottles[plan.from];
    const target = layout.bottles[plan.to];
    const direction = source.x < target.x ? 1 : -1;
    const pourDx = target.x + target.width / 2 - (source.x + source.width / 2) - direction * target.width * 0.58;
    const pourDy = target.y - source.y - source.height * 0.45;
    const ease = (value) => 1 - (1 - value) ** 3;
    await tween(motion.pourDuration, (progress) => {
      const moveIn = ease(Math.min(1, progress / 0.28));
      const moveOut = progress <= 0.82 ? 0 : ease((progress - 0.82) / 0.18);
      const travel = progress <= 0.82 ? moveIn : 1 - moveOut;
      const dx = pourDx * travel;
      const dy = pourDy * travel;
      const rotation = direction * 1.18 * Math.min(moveIn, 1 - moveOut);
      const pourProgress = Math.max(0, Math.min(1, (progress - 0.28) / 0.54));
      const effect = reduced ? 0 : plan.count * pourProgress;
      const effects = {
        [plan.from]: { removeUnits: effect, tilt: rotation },
        [plan.to]: { addColor: plan.color, addUnits: effect },
      };
      draw(frame, { hiddenIndex: plan.from, effects });
      drawTube(frame.tubes[plan.from], plan.from, { dx, dy, rotation }, effects[plan.from]);
      if (!reduced && pourProgress > 0 && pourProgress < 1) {
        const start = transformBottlePoint(source, bottleMouthAnchor, { dx, dy, rotation });
        const targetSand = sandGeometry(target);
        const fill = frame.tubes[plan.to].length + effect;
        const end = {
          x: target.x + target.width / 2,
          y: Math.max(targetSand.top + 3, targetSand.bottom - fill * (targetSand.bottom - targetSand.top) / 4),
        };
        drawFallingGrains(start, end, plan.color, pourProgress, plan.count);
      }
    });
  }

  async function shake(frame, index) {
    const motion = getMotionSettings(matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (motion.shakeDuration === 0) return draw(frame);
    await tween(motion.shakeDuration, (progress) => {
      draw(frame, { hiddenIndex: index });
      drawTube(frame.tubes[index], index, { dx: Math.sin(progress * Math.PI * 2 * motion.shakeOscillations) * motion.shakeAmplitude });
    });
  }

  function drawHint(frame, from, to, alpha) {
    draw(frame);
    ctx.save();
    ctx.strokeStyle = `rgba(255,216,154,${alpha})`;
    ctx.lineWidth = 3;
    for (const index of [from, to]) {
      const box = layout.bottles[index];
      ctx.beginPath();
      ctx.ellipse(box.x + box.width / 2, box.y + box.height / 2, box.width * 0.52, box.height * 0.53, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  async function flashHint(frame, from, to) {
    const motion = getMotionSettings(matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (motion.hintDuration === 0) return drawHint(frame, from, to, 0.55);
    await tween(motion.hintDuration, (progress) => {
      drawHint(frame, from, to, 0.35 + Math.sin(progress * Math.PI * 2 * motion.hintPulses) * 0.3);
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
        ctx.fillRect(piece.x + Math.sin(progress * 8 + piece.x) * 18, piece.y + progress * (layout.scene.height + 80), 4, 8);
      }
    });
  }

  return { resize, draw, animatePour, shake, flashHint, celebrate, getLayout: () => layout };
}
