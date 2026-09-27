/* High-resolution battlefield art. Original 16×16 tile and unit draw calls
 * determine every position; the final LCD frame proves that they are visible. */
(() => {
  'use strict';
  const data = typeof window !== 'undefined' ? window.BayeBattleData : null;

  function bytes(base64) {
    return typeof atob === 'function' ? Uint8Array.from(atob(base64), c => c.charCodeAt(0)) : Uint8Array.from(Buffer.from(base64, 'base64'));
  }
  function bit(bits, offset, x, y) { return !!(bits[offset + y * 2 + (x >> 3)] & (128 >> (x & 7))); }
  function createTracker(source, width = 160, height = 96) {
    const terrain = bytes(source.terrain.bits), units = bytes(source.units.bits), weather = bytes(source.weather.bits);
    const screens = new Map();
    let current = 0, pending = null;
    const screen = (id = current) => {
      if (!screens.has(id)) screens.set(id, { tiles: new Map(), troops: new Map(), icons: new Map() });
      return screens.get(id);
    };
    const copy = (from, to) => {
      const s = screen(from);
      screens.set(to, { tiles: new Map(s.tiles), troops: new Map(s.troops), icons: new Map(s.icons) });
    };
    function clear(x, y, right, bottom) {
      const s = screen();
      for (const [key, r] of s.tiles)
        if (x <= r.x && y <= r.y && right >= r.x + 15 && bottom >= r.y + 15) s.tiles.delete(key);
      for (const [key, r] of s.troops)
        if (x <= r.x + 15 && right >= r.x && y <= r.y + 15 && bottom >= r.y) s.troops.delete(key);
      for (const [key, r] of s.icons)
        if (x <= r.x + 11 && right >= r.x && y <= r.y + 11 && bottom >= r.y) s.icons.delete(key);
    }
    function event(kind, a, b, c, d, e, f, g, h) {
      switch (kind) {
        case 1: current = a; screen(); break;
        case 2: copy(a, 0); break;
        case 3: copy(0, -1); break;
        case 4: copy(-1, 0); break;
        case 5: clear(a, b, c, d); pending = null; break;
        case 9: {
          const r = pending; pending = null;
          if (!r || r.x !== a || r.y !== b || c !== a + (r.resource === 9 ? 11 : 15) || d !== b + (r.resource === 9 ? 11 : 15)) break;
          const key = `${a}:${b}`, s = screen();
          if (r.resource === 4) {
            s.tiles.set(key, r);
            for (const [unitKey, unit] of s.troops)
              if (a <= unit.x + 15 && a + 15 >= unit.x && b <= unit.y + 15 && b + 15 >= unit.y) s.troops.delete(unitKey);
          }
          else if (r.resource === 5) s.troops.set(key, r);
          else s.icons.set(key, r);
          break;
        }
        case 12: width = a || width; height = b || height; screens.clear(); current = 0; pending = null; break;
        case 13: if (c >= width * height) screens.delete(a); break;
        case 15:
          pending = (a === 4 || a === 5 || a === 9) && c > 0 && c <= (a === 4 ? source.terrain.count : a === 5 ? source.units.count : source.weather.count)
            ? { resource: a, index: c - 1, x: d, y: e } : null;
          break;
      }
    }
    function visible(rgba) {
      const s = screen(0), expected = new Int8Array(width * height).fill(-1);
      const tiles = [...s.tiles.values()], recordedTroops = [...s.troops.values()];
      const troops = recordedTroops.filter(r => {
        let foreground = 0, visible = 0;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const px = r.x + x, py = r.y + y;
          if (px < 0 || py < 0 || px >= width || py >= height || !bit(units, r.index * 64 + 32, x, y)) continue;
          foreground++;
          const p = (py * width + px) * 4;
          if (rgba[p + 3] > 0 && rgba[p] < 128) visible++;
        }
        return foreground >= 8 && visible / foreground >= .68;
      });
      for (const r of tiles) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const px = r.x + x, py = r.y + y;
        if (px >= 0 && py >= 0 && px < width && py < height)
          expected[py * width + px] = +bit(terrain, r.index * 32, x, y);
      }
      for (const r of troops) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const px = r.x + x, py = r.y + y;
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        const p = py * width + px;
        if (expected[p] < 0) continue;
        expected[p] = +(!!(expected[p] && bit(units, r.index * 64, x, y)) || bit(units, r.index * 64 + 32, x, y));
      }
      const matching = new Uint8Array(width * height), accepted = [];
      for (const r of tiles) {
        let correct = 0, total = 0;
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const px = r.x + x, py = r.y + y;
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const p = py * width + px, q = p * 4;
          const ink = +(rgba[q + 3] > 0 && rgba[q] < 128);
          if (expected[p] === ink) { correct++; matching[p] = 1; }
          total++;
        }
        if (total === 256 && correct >= 210) accepted.push(r);
      }
      const fort = accepted.filter(r => r.index >= 16 && r.index <= 45).length;
      if (fort < 6 && !(accepted.length >= 12 && troops.length >= 2))
        return { active: false, tiles: [], troops: [], icons: [], matching, width, height, recordedTiles: tiles.length, recordedTroops: recordedTroops.length, acceptedTiles: accepted.length, fort };
      const acceptedCells = new Set(accepted.map(r => `${r.x}:${r.y}`));
      for (let p = 0; p < matching.length; p++) {
        const x = p % width, y = Math.floor(p / width);
        if (!acceptedCells.has(`${Math.floor(x / 16) * 16}:${Math.floor(y / 16) * 16}`)) matching[p] = 0;
      }
      const icons = [...s.icons.values()].filter(r => {
        if (r.y < 80 || r.x < 0 || r.x + 12 > width || r.y + 12 > height) return false;
        let matched = 0;
        for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) {
          const p = ((r.y + y) * width + r.x + x) * 4;
          if (+(rgba[p + 3] > 0 && rgba[p] < 128) === +bit(weather, r.index * 24, x, y)) matched++;
        }
        return matched >= 128;
      });
      return { active: true, tiles: accepted, troops, icons, matching, width, height, fort, recordedTiles: tiles.length, recordedTroops: recordedTroops.length, acceptedTiles: accepted.length };
    }
    return { event, visible, terrain, units };
  }
  const api = { createTracker };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined' || !data) return;

  const tracker = createTracker(data);
  let unitAtlas = null;
  const ready = typeof Image === 'function' ? new Promise(resolve => {
    const image = new Image();
    image.onload = () => { unitAtlas = image; resolve(); };
    image.onerror = () => resolve();
    image.src = 'assets/hd/battle-woodcut-units.png?v=20260927woodcut1';
  }) : Promise.resolve();
  const trace = window.BayeVectorArt?.trace;
  if (!trace) return;
  function contours(bits, offset, inverse = false) {
    const pixels = new Uint8Array(16 * 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++)
      pixels[y * 16 + x] = +(bit(bits, offset, x, y) !== inverse);
    return trace(pixels, 16, 16, 1);
  }
  const terrainArt = Array.from({ length: data.terrain.count }, (_, i) => contours(tracker.terrain, i * 32));
  const unitArt = Array.from({ length: data.units.count }, (_, i) => ({
    clear: contours(tracker.units, i * 64, true),
    ink: contours(tracker.units, i * 64 + 32)
  }));
  function roundedContour(ctx, points, radius) {
    if (points.length < 3) return;
    const count = points.length;
    for (let i = 0; i < count; i++) {
      const previous = points[(i + count - 1) % count], current = points[i], next = points[(i + 1) % count];
      const before = Math.hypot(current[0] - previous[0], current[1] - previous[1]);
      const after = Math.hypot(next[0] - current[0], next[1] - current[1]);
      if (!before || !after) continue;
      const start = Math.min(radius, before / 2), end = Math.min(radius, after / 2);
      const ax = current[0] + (previous[0] - current[0]) * start / before;
      const ay = current[1] + (previous[1] - current[1]) * start / before;
      const bx = current[0] + (next[0] - current[0]) * end / after;
      const by = current[1] + (next[1] - current[1]) * end / after;
      if (i === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
      ctx.quadraticCurveTo(current[0], current[1], bx, by);
    }
    ctx.closePath();
  }
  function paintContours(ctx, paths, color, radius) {
    ctx.fillStyle = color; ctx.beginPath();
    for (const points of paths) roundedContour(ctx, points, radius);
    ctx.fill('evenodd');
  }
  function wallEdges(index) {
    const band = (axis, start) => {
      let ink = 0;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++)
        if ((axis === 'x' ? x : y) >= start && (axis === 'x' ? x : y) < start + 3 &&
            bit(tracker.terrain, index * 32, x, y)) ink++;
      return ink >= 18;
    };
    return { top: band('y', 0), bottom: band('y', 13), left: band('x', 0), right: band('x', 13) };
  }
  function wallBand(ctx, side, seed) {
    const horizontal = side === 'top' || side === 'bottom';
    const offset = side === 'bottom' || side === 'right' ? 13 : .35;
    ctx.strokeStyle = '#000'; ctx.lineWidth = .26;
    ctx.fillStyle = '#000';
    if (horizontal) {
      ctx.strokeRect(.25, offset, 15.5, 2.6);
      for (let i = 0; i < 8; i++) {
        const x = i * 2 + ((seed & 1) ? .4 : 0);
        ctx.fillRect(x, offset + (i % 2 ? 1.35 : .2), 1.1, .92);
        if (i % 2 === 0) ctx.fillRect(x + .3, offset - .45, 1.15, .65);
      }
      ctx.beginPath(); ctx.moveTo(0, offset + 2.2); ctx.lineTo(16, offset + 2.2); ctx.stroke();
    } else {
      ctx.strokeRect(offset, .25, 2.6, 15.5);
      for (let i = 0; i < 8; i++) {
        const y = i * 2 + ((seed & 1) ? .4 : 0);
        ctx.fillRect(offset + (i % 2 ? 1.35 : .2), y, .92, 1.1);
        if (i % 2 === 0) ctx.fillRect(offset - .45, y + .3, .65, 1.15);
      }
      ctx.beginPath(); ctx.moveTo(offset + 2.2, 0); ctx.lineTo(offset + 2.2, 16); ctx.stroke();
    }
  }
  function tower(ctx, x, y) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = .43;
    ctx.fillRect(x, y, 4.4, 4.4); ctx.strokeRect(x, y, 4.4, 4.4);
    ctx.fillStyle = '#000'; ctx.fillRect(x + .9, y + .85, 2.6, 2.6);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 1.5, y + 1.45, 1.4, 1.4);
    for (let i = 0; i < 3; i++) ctx.fillRect(x + .4 + i * 1.5, y - .45, .65, .7);
  }
  function gatehouse(ctx) {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = .48;
    ctx.fillRect(3.3, 5.6, 9.4, 8.5); ctx.strokeRect(3.3, 5.6, 9.4, 8.5);
    ctx.fillStyle = '#000'; ctx.beginPath();
    ctx.moveTo(1.8, 6); ctx.quadraticCurveTo(4, 5.4, 5.1, 2.2);
    ctx.lineTo(10.9, 2.2); ctx.quadraticCurveTo(12, 5.4, 14.2, 6);
    ctx.quadraticCurveTo(12.4, 7.1, 10.7, 5.4); ctx.lineTo(5.3, 5.4);
    ctx.quadraticCurveTo(3.6, 7.1, 1.8, 6); ctx.fill();
    ctx.fillRect(6.35, 8.5, 3.3, 5.6);
    ctx.fillStyle = '#fff'; ctx.fillRect(7.05, 9.2, 1.9, 4.9);
    ctx.strokeStyle = '#000'; ctx.lineWidth = .2;
    for (let x = 5.4; x <= 10.6; x += 1.3) {
      ctx.beginPath(); ctx.moveTo(x, 2.65); ctx.lineTo(x + .5, 5.15); ctx.stroke();
    }
  }
  function groundHatching(ctx, seed, count) {
    ctx.strokeStyle = '#000'; ctx.lineWidth = .16;
    for (let i = 0; i < count; i++) {
      const x = 2 + ((seed + i * 53) % 91) / 8;
      const y = 3 + ((seed * 3 + i * 37) % 81) / 8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + .65, y - .18); ctx.stroke();
      if (i === 0) {
        ctx.beginPath(); ctx.moveTo(x + 1.7, y + 1.1);
        ctx.lineTo(x + 1.45, y + .42); ctx.moveTo(x + 1.7, y + 1.1);
        ctx.lineTo(x + 2.05, y + .5); ctx.stroke();
      }
    }
  }
  function grove(ctx) {
    const trees = [[3.1, 10.5, 2.35], [7.7, 8.9, 2.7], [12.4, 10.9, 2.15]];
    ctx.strokeStyle = '#000'; ctx.lineWidth = .34;
    for (const [x, y, radius] of trees) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + radius + 2.1); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath();
      ctx.moveTo(x - radius, y + .1);
      ctx.quadraticCurveTo(x - radius * 1.18, y - radius * .65, x - radius * .67, y - radius * .82);
      ctx.quadraticCurveTo(x - radius * .72, y - radius * 1.5, x - radius * .12, y - radius * 1.45);
      ctx.quadraticCurveTo(x + radius * .45, y - radius * 1.72, x + radius * .58, y - radius * 1.1);
      ctx.quadraticCurveTo(x + radius * 1.17, y - radius * .95, x + radius, y - radius * .35);
      ctx.quadraticCurveTo(x + radius * 1.27, y + radius * .3, x + radius * .55, y + radius * .34);
      ctx.quadraticCurveTo(x, y + radius * .65, x - radius, y + .1);
      ctx.fill(); ctx.stroke();
      ctx.lineWidth = .18;
      for (let i = 0; i < 7; i++) {
        const hx = x - radius * .8 + i * radius * .25;
        const hy = y - radius * (i % 2 ? .55 : .95);
        ctx.beginPath(); ctx.moveTo(hx, hy);
        ctx.lineTo(hx + .55, hy - .32); ctx.stroke();
      }
      ctx.lineWidth = .34;
    }
  }
  function tile(ctx, r, scale) {
    ctx.save(); ctx.translate(r.x * scale, r.y * scale); ctx.scale(scale, scale);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 16, 16);
    if (r.index < 16 && r.index !== 5) paintContours(ctx, terrainArt[r.index], '#000', .22);
    const seed = (r.x * 73 + r.y * 131 + r.index * 17) >>> 0;
    if (r.index === 1) groundHatching(ctx, seed, 2);
    if (r.index === 5) grove(ctx);
    if (r.index >= 16) {
      groundHatching(ctx, seed, 2);
      const edges = wallEdges(r.index);
      for (const side of ['top', 'bottom', 'left', 'right']) if (edges[side]) wallBand(ctx, side, seed);
      if (edges.top && edges.left) tower(ctx, 0, 0);
      if (edges.top && edges.right) tower(ctx, 11.6, 0);
      if (edges.bottom && edges.left) tower(ctx, 0, 11.6);
      if (edges.bottom && edges.right) tower(ctx, 11.6, 11.6);
      if (r.index === 41) gatehouse(ctx);
    }
    ctx.restore();
  }
  function soldier(ctx, r, scale) {
    if (unitAtlas) {
      const slots = [0, 1, 5, 2, 0, 6, 5, 3];
      const slot = slots[Math.floor((r.index % 16) / 2)];
      ctx.save(); ctx.translate(r.x * scale, r.y * scale); ctx.scale(scale, scale);
      if (r.index & 1) { ctx.translate(16, 0); ctx.scale(-1, 1); }
      ctx.globalCompositeOperation = 'multiply';
      ctx.filter = 'grayscale(1) contrast(3)';
      ctx.drawImage(unitAtlas, (slot % 4) * 384, Math.floor(slot / 4) * 512, 384, 512, 0, 0, 16, 16);
      ctx.restore();
      return;
    }
    const art = unitArt[r.index];
    ctx.save(); ctx.translate(r.x * scale, r.y * scale); ctx.scale(scale, scale);
    paintContours(ctx, art.clear, '#fff', .28);
    paintContours(ctx, art.ink, '#000', .3);
    ctx.restore();
  }
  function helpIcon(ctx, scale) {
    ctx.save(); ctx.scale(scale, scale);
    ctx.fillStyle = '#f8f8f3'; ctx.fillRect(61.2, 81.2, 10.2, 12.4);
    ctx.strokeStyle = '#24261e'; ctx.lineWidth = .62; ctx.strokeRect(61.4, 81.4, 9.8, 12.0);
    ctx.fillStyle = '#1e211a'; ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 66.3, 87.7);
    ctx.restore();
  }
  function weatherIcon(ctx, r, scale) {
    ctx.save(); ctx.translate(r.x * scale, r.y * scale); ctx.scale(scale, scale);
    ctx.fillStyle = '#f8f8f3'; ctx.fillRect(0, 0, 12, 12);
    ctx.strokeStyle = '#20231b'; ctx.fillStyle = '#20231b'; ctx.lineWidth = .68;
    if (r.index === 0) {
      ctx.beginPath(); ctx.arc(6, 6, 2.5, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4;
        ctx.beginPath(); ctx.moveTo(6 + 3.7 * Math.cos(a), 6 + 3.7 * Math.sin(a));
        ctx.lineTo(6 + 5.2 * Math.cos(a), 6 + 5.2 * Math.sin(a)); ctx.stroke(); }
    } else if (r.index === 1 || r.index === 3) {
      ctx.beginPath(); ctx.moveTo(1.2, 7.8); ctx.bezierCurveTo(.4, 5.7, 2.3, 4.6, 4.2, 5);
      ctx.bezierCurveTo(4.8, 2, 9.2, 2.8, 9.1, 5.8); ctx.bezierCurveTo(11.4, 5.8, 11.7, 8.8, 9.4, 8.8);
      ctx.lineTo(2.4, 8.8); ctx.closePath(); ctx.stroke();
      if (r.index === 3) for (const x of [3, 6, 9]) {
        ctx.beginPath(); ctx.moveTo(x, 9.3); ctx.lineTo(x - .7, 11); ctx.stroke();
      }
    } else if (r.index === 2) {
      for (const [y, length] of [[3, 9], [6, 7], [9, 8]]) {
        ctx.beginPath(); ctx.moveTo(1, y); ctx.lineTo(length, y); ctx.quadraticCurveTo(length + 1.3, y - 1.1, length - .2, y - 1.7); ctx.stroke();
      }
    } else {
      ctx.beginPath(); ctx.moveTo(.8, 10.6); ctx.lineTo(4.4, 3.5); ctx.lineTo(6, 6); ctx.lineTo(8, 1.4);
      ctx.lineTo(11.2, 10.6); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e8e8df'; ctx.beginPath(); ctx.moveTo(8, 1.4); ctx.lineTo(8, 6); ctx.stroke();
    }
    ctx.restore();
  }
  function paint(ctx, rgba, scale) {
    const frame = tracker.visible(rgba);
    if (!frame.active) return { count: 0, troops: 0, recordedTiles: frame.recordedTiles, recordedTroops: frame.recordedTroops, acceptedTiles: frame.acceptedTiles, fort: frame.fort };
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.beginPath();
    for (let y = 0; y < frame.height; y++) {
      let start = -1;
      for (let x = 0; x <= frame.width; x++) {
        const hit = x < frame.width && frame.matching[y * frame.width + x];
        if (hit && start < 0) start = x;
        if (!hit && start >= 0) { ctx.rect(start * scale, y * scale, (x - start) * scale, scale); start = -1; }
      }
    }
    ctx.clip();
    for (const r of frame.tiles) tile(ctx, r, scale);
    for (const r of frame.troops) soldier(ctx, r, scale);
    ctx.restore();
    for (const r of frame.icons) weatherIcon(ctx, r, scale);
    helpIcon(ctx, scale);
    return { count: frame.tiles.length, fort: frame.fort, troops: frame.troops.length, weather: frame.icons.map(r => r.index), recordedTiles: frame.recordedTiles, recordedTroops: frame.recordedTroops, acceptedTiles: frame.acceptedTiles };
  }
  window.BayeBattleArt = { ...api, event: tracker.event, paint, ready };
})();
