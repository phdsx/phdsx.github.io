const PALETTE = {
  pink: '#ff48c8', orange: '#ff8a24', blue: '#3478ff', green: '#31d36b',
  violet: '#8f52ff', yellow: '#ffd83d', cyan: '#30e5ef', red: '#f04455',
  lime: '#a9ef36', brown: '#b8612b',
};

const SHELF_ANCHORS = [0.436, 0.79];

export function computeBottleSourceRect(imageWidth, imageHeight) {
  const width = imageWidth * 0.54;
  const height = Math.min(imageHeight, width * 2.45);
  return {
    x: (imageWidth - width) / 2,
    y: (imageHeight - height) / 2,
    width,
    height,
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
    ? {
        pourDuration: 180,
        shakeDuration: 0,
        shakeAmplitude: 0,
        shakeOscillations: 0,
        hintDuration: 0,
        hintPulses: 0,
      }
    : {
        pourDuration: 620,
        shakeDuration: 260,
        shakeAmplitude: 5,
        shakeOscillations: 4,
        hintDuration: 520,
        hintPulses: 2,
      };
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
  const bottleWidth = Math.max(44, Math.min(66, (sceneWidth - gap * (columns + 1)) / columns));
  const bottleHeight = bottleWidth * 2.45;
  const bottles = Array.from({ length: tubeCount }, (_, index) => {
    const row = Math.floor(index / columns);
    const rowCount = Math.min(columns, tubeCount - row * columns);
    const rowWidth = rowCount * bottleWidth + (rowCount - 1) * gap;
    const column = index % columns;
    const shelfAnchor = SHELF_ANCHORS[row] ?? SHELF_ANCHORS.at(-1);
    return {
      x: scene.x + (sceneWidth - rowWidth) / 2 + column * (bottleWidth + gap),
      y: scene.y + scene.height * shelfAnchor - bottleHeight,
      width: bottleWidth,
      height: bottleHeight,
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
  const bottleSource = computeBottleSourceRect(
    assets.bottle.naturalWidth || assets.bottle.width,
    assets.bottle.naturalHeight || assets.bottle.height,
  );
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
    ctx.drawImage(
      assets.bottle,
      bottleSource.x,
      bottleSource.y,
      bottleSource.width,
      bottleSource.height,
      box.x,
      box.y,
      box.width,
      box.height,
    );
    ctx.restore();
  }

  function draw(frame, options = {}) {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.drawImage(assets.background, layout.scene.x, 0, layout.scene.width, layout.scene.height);
    frame.tubes.forEach((tube, index) => {
      if (index !== options.hiddenIndex) drawTube(tube, index);
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
    const motion = getMotionSettings(reduced);
    const source = layout.bottles[plan.from];
    const target = layout.bottles[plan.to];
    const direction = source.x < target.x ? 1 : -1;
    const pourDx = target.x + target.width / 2 - (source.x + source.width / 2) - direction * target.width * 0.58;
    const pourDy = target.y - source.y - source.height * 0.45;
    const ease = (value) => 1 - (1 - value) ** 3;
    await tween(motion.pourDuration, (progress) => {
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
        const start = transformBottlePoint(
          source,
          { x: 0.5, y: 0.12 },
          { dx, dy, rotation },
        );
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
    const motion = getMotionSettings(reduced);
    if (motion.shakeDuration === 0) {
      draw(frame);
      return;
    }
    await tween(motion.shakeDuration, (progress) => {
      draw(frame, { hiddenIndex: index });
      drawTube(frame.tubes[index], index, {
        dx: Math.sin(progress * Math.PI * 2 * motion.shakeOscillations) * motion.shakeAmplitude,
      });
    });
  }

  function drawHint(frame, from, to, alpha) {
    draw(frame);
    ctx.save();
    ctx.strokeStyle = `rgba(118,242,202,${alpha})`;
    ctx.lineWidth = 4;
    for (const index of [from, to]) {
      const box = layout.bottles[index];
      ctx.strokeRect(box.x - 4, box.y - 4, box.width + 8, box.height + 8);
    }
    ctx.restore();
  }

  async function flashHint(frame, from, to) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motion = getMotionSettings(reduced);
    if (motion.hintDuration === 0) {
      drawHint(frame, from, to, 0.55);
      return;
    }
    await tween(motion.hintDuration, (progress) => {
      const alpha = 0.35 + Math.sin(progress * Math.PI * 2 * motion.hintPulses) * 0.3;
      drawHint(frame, from, to, alpha);
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
}
