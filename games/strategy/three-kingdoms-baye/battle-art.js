/* High-resolution battlefield art. Original 16×16 tile and unit draw calls
 * determine every position; the final LCD frame proves that they are visible. */
(() => {
  'use strict';
  const data = typeof window !== 'undefined' ? window.BayeBattleData : null;

  function bytes(base64) {
    return typeof atob === 'function' ? Uint8Array.from(atob(base64), c => c.charCodeAt(0)) : Uint8Array.from(Buffer.from(base64, 'base64'));
  }
  function bit(bits, offset, x, y) { return !!(bits[offset + y * 2 + (x >> 3)] & (128 >> (x & 7))); }
  function tileEdges(bits, index) {
    const offset = index * 32;
    const band = (axis, from) => {
      let ink = 0;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++)
        if ((axis === 'x' ? x : y) >= from && (axis === 'x' ? x : y) < from + 3 && bit(bits, offset, x, y)) ink++;
      return ink >= 18;
    };
    return { top: band('y', 0), bottom: band('y', 13), left: band('x', 0), right: band('x', 13) };
  }
  function unitKind(index) {
    const shape = index % 16;
    if ([4, 5, 8, 9, 12, 13].includes(shape)) return 'cavalry';
    if ([2, 3, 10, 11].includes(shape)) return 'commander';
    return [14, 15].includes(shape) ? 'archer' : 'infantry';
  }
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
  const api = { createTracker, tileEdges, unitKind };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined' || !data) return;

  const tracker = createTracker(data), assets = {}, assetErrors = [];
  const names = ['infantry', 'cavalry', 'archer', 'commander'];
  const ready = Promise.all(names.map(name => new Promise(resolve => {
    const image = new Image();
    image.onload = () => { assets[name] = image; resolve(); };
    image.onerror = () => { assetErrors.push(name); resolve(); };
    image.src = `assets/hd/battle-${name}.png?v=20260927battle1`;
  })));
  function pebble(ctx, x, y, radius, shade) {
    ctx.fillStyle = shade; ctx.beginPath(); ctx.ellipse(x, y, radius, radius * .44, -.25, 0, Math.PI * 2); ctx.fill();
  }
  function stoneWall(ctx, side, seed) {
    ctx.fillStyle = '#74756d'; ctx.strokeStyle = '#303129'; ctx.lineWidth = .22;
    const horizontal = side === 'top' || side === 'bottom';
    const offset = side === 'bottom' || side === 'right' ? 12.2 : 0;
    ctx.fillRect(horizontal ? 0 : offset, horizontal ? offset : 0, horizontal ? 16 : 3.8, horizontal ? 3.8 : 16);
    ctx.strokeRect(horizontal ? 0 : offset, horizontal ? offset : 0, horizontal ? 16 : 3.8, horizontal ? 3.8 : 16);
    ctx.strokeStyle = '#d5d5c9'; ctx.lineWidth = .32;
    if (horizontal) {
      ctx.beginPath(); ctx.moveTo(0, offset + 1.1); ctx.lineTo(16, offset + 1.1);
      ctx.moveTo(0, offset + 2.75); ctx.lineTo(16, offset + 2.75); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const x = i * 3 + (seed % 2 ? .6 : 0);
        ctx.strokeStyle = '#303129'; ctx.beginPath(); ctx.moveTo(x, offset + (i % 2 ? 1.1 : 0));
        ctx.lineTo(x, offset + (i % 2 ? 2.75 : 1.1)); ctx.stroke();
      }
    } else {
      ctx.beginPath(); ctx.moveTo(offset + 1.1, 0); ctx.lineTo(offset + 1.1, 16);
      ctx.moveTo(offset + 2.75, 0); ctx.lineTo(offset + 2.75, 16); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const y = i * 3 + (seed % 2 ? .6 : 0);
        ctx.strokeStyle = '#303129'; ctx.beginPath(); ctx.moveTo(offset + (i % 2 ? 1.1 : 0), y);
        ctx.lineTo(offset + (i % 2 ? 2.75 : 1.1), y); ctx.stroke();
      }
    }
  }
  function tile(ctx, r, scale) {
    ctx.save(); ctx.translate(r.x * scale, r.y * scale); ctx.scale(scale, scale);
    const index = r.index, seed = (r.x * 73 + r.y * 131 + index * 17) >>> 0;
    ctx.fillStyle = '#f8f8f3'; ctx.fillRect(0, 0, 16, 16);
    if (index === 0) {
      ctx.strokeStyle = '#34352d'; ctx.lineWidth = .65; ctx.strokeRect(.35, .35, 15.3, 15.3);
    } else if (index >= 16) {
      ctx.fillStyle = '#efefe7'; ctx.fillRect(0, 0, 16, 16);
      for (let i = 0; i < 10; i++) {
        const x = ((seed + i * 47) % 127) / 8, y = ((seed * 3 + i * 31) % 127) / 8;
        pebble(ctx, x, y, .5 + (i % 3) * .1, i % 2 ? '#aaaba2' : '#c2c3b8');
      }
      const edges = tileEdges(tracker.terrain, index);
      for (const side of ['top', 'bottom', 'left', 'right']) if (edges[side]) stoneWall(ctx, side, seed);
      if (index === 41) {
        ctx.fillStyle = '#74756d'; ctx.beginPath(); ctx.arc(8, 8, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#292a25'; ctx.lineWidth = .6; ctx.stroke();
        ctx.fillStyle = '#e1e1d6'; ctx.beginPath(); ctx.arc(8, 8, 3.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#4b4c43'; for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4; ctx.fillRect(7.5 + 4.6 * Math.cos(a), 7.5 + 4.6 * Math.sin(a), 1, 1);
        }
      }
    } else if (index === 2 || index === 5) {
      for (let i = 0; i < 4; i++) {
        const x = 2 + (i * 5 + seed) % 12, y = 4 + (i * 7 + seed) % 10;
        ctx.strokeStyle = '#30372c'; ctx.fillStyle = '#596450'; ctx.lineWidth = .28;
        ctx.beginPath(); ctx.moveTo(x, y - 3.5);
        ctx.quadraticCurveTo(x - .8, y - 1.8, x - 1.4, y - 1.4);
        ctx.lineTo(x - .75, y - 1.4); ctx.lineTo(x - 2.3, y + .5);
        ctx.lineTo(x - 1.25, y + .15); ctx.lineTo(x - 2.6, y + 2);
        ctx.quadraticCurveTo(x, y + 1.1, x + 2.6, y + 2);
        ctx.lineTo(x + 1.25, y + .15); ctx.lineTo(x + 2.3, y + .5);
        ctx.lineTo(x + .75, y - 1.4); ctx.lineTo(x + 1.4, y - 1.4);
        ctx.quadraticCurveTo(x + .8, y - 1.8, x, y - 3.5); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#d9ddd0'; ctx.beginPath(); ctx.moveTo(x - .3, y - 2.2);
        ctx.lineTo(x - 1.2, y + .8); ctx.moveTo(x + .15, y - 1.1);
        ctx.lineTo(x + 1, y + 1.2); ctx.stroke();
        ctx.strokeStyle = '#30372c'; ctx.beginPath(); ctx.moveTo(x, y + 1.5);
        ctx.lineTo(x, y + 3); ctx.stroke();
      }
    } else if (index === 3 || index === 4) {
      ctx.fillStyle = '#79796d'; ctx.fillRect(3, 4, 10, 10);
      ctx.strokeStyle = '#2e3029'; ctx.lineWidth = .5; ctx.strokeRect(3, 4, 10, 10);
      ctx.fillStyle = '#34352d'; ctx.beginPath(); ctx.moveTo(1.5, 5); ctx.lineTo(8, 1); ctx.lineTo(14.5, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e7e7dc'; ctx.fillRect(6.1, 9, 3.8, 5);
    } else if (index >= 6 && index <= 10) {
      ctx.fillStyle = '#a0a298'; ctx.strokeStyle = '#50534a'; ctx.lineWidth = .5;
      ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(5, 5); ctx.lineTo(8, 9); ctx.lineTo(12, 3); ctx.lineTo(16, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#e5e5db'; ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(4, 9); ctx.moveTo(12, 3); ctx.lineTo(10.5, 8); ctx.stroke();
    } else if (index >= 11 && index <= 15) {
      ctx.strokeStyle = '#9a9a8e'; ctx.lineWidth = 2.1; ctx.beginPath();
      ctx.moveTo(index % 2 ? 0 : 16, 2); ctx.quadraticCurveTo(8, 8, index % 2 ? 16 : 0, 14); ctx.stroke();
      ctx.strokeStyle = '#4e5147'; ctx.lineWidth = .38; ctx.stroke();
    }
    if (index < 16) for (let i = 0; i < 4; i++) {
      const x = ((seed + i * 41) % 123) / 8, y = ((seed * 5 + i * 29) % 123) / 8;
      pebble(ctx, x, y, .34, '#a9ab9d');
    }
    if (index < 16) for (let i = 0; i < 3; i++) {
      const x = 1.5 + ((seed * 7 + i * 43) % 102) / 8;
      const y = 1.8 + ((seed * 11 + i * 67) % 100) / 8;
      ctx.strokeStyle = i === 0 ? '#a3aa90' : '#b3b8a0'; ctx.lineWidth = .2;
      ctx.beginPath(); ctx.moveTo(x, y + .9); ctx.quadraticCurveTo(x - .7, y + .3, x - .9, y - .2);
      ctx.moveTo(x, y + .9); ctx.quadraticCurveTo(x + .4, y + .15, x + .8, y - .5); ctx.stroke();
    }
    ctx.restore();
  }
  function soldier(ctx, r, scale) {
    const image = assets[unitKind(r.index)]; if (!image) return false;
    ctx.save(); ctx.translate(r.x * scale, r.y * scale); ctx.scale(scale, scale);
    ctx.fillStyle = '#e8e8df'; ctx.strokeStyle = '#262820'; ctx.lineWidth = .47;
    ctx.beginPath(); ctx.ellipse(8, 8.7, 6.4, 5.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#777a6b'; ctx.beginPath(); ctx.ellipse(8, 12.2, 5.1, .8, 0, 0, Math.PI * 2); ctx.fill();
    if (r.index % 2) { ctx.translate(16, 0); ctx.scale(-1, 1); }
    ctx.drawImage(image, 1.15, .35, 13.7, 14.7);
    ctx.restore(); return true;
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
    if (!frame.active) return { count: 0, troops: 0, recordedTiles: frame.recordedTiles, recordedTroops: frame.recordedTroops, acceptedTiles: frame.acceptedTiles, fort: frame.fort, assetErrors: assetErrors.slice() };
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
    let troops = 0;
    for (const r of frame.troops) if (soldier(ctx, r, scale)) troops++;
    ctx.restore();
    for (const r of frame.icons) weatherIcon(ctx, r, scale);
    helpIcon(ctx, scale);
    return { count: frame.tiles.length, fort: frame.fort, troops, weather: frame.icons.map(r => r.index), recordedTiles: frame.recordedTiles, recordedTroops: frame.recordedTroops, acceptedTiles: frame.acceptedTiles, assetErrors: assetErrors.slice() };
  }
  window.BayeBattleArt = { ...api, event: tracker.event, paint, ready };
})();
