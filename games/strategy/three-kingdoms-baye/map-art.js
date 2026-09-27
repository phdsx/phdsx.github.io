/* Read-only artwork replacement. Resource ids, coordinates and ownership come
 * from the original engine. Per-pixel ownership of the display prevents artwork
 * from covering menus, text, selection markers or partially restored screens. */
(() => {
  'use strict';
  function relation(owner, player) { return !owner ? 'unowned' : owner === player + 1 ? 'own' : 'enemy'; }
  function portraitSource(data, resource, index) {
    const slot = data.portraitSlots[resource]?.[index];
    if (!(slot >= 0)) return null;
    const sheet = data.portraitSheets.find(s => slot >= s.start && slot < s.start + s.count);
    if (!sheet) return null;
    const cell = slot - sheet.start;
    return { file: sheet.file, columns: sheet.columns, rows: sheet.rows, column: cell % sheet.columns, row: Math.floor(cell / sheet.columns) };
  }
  function factionLabel(owner, names, owners) {
    const name = names[owner - 1] || '';
    if (!name) return '';
    const surname = /^(公孙|夏侯|诸葛|司马|太史|皇甫)/.exec(name)?.[0] || name[0];
    const same = [...new Set(owners)].filter(id => id && (names[id - 1] || '').startsWith(surname));
    // Full names disambiguate Liu Bei/Liu Biao/Liu Zhang and other shared surnames.
    return same.length > 1 ? name : surname;
  }
  function createTracker(data, getMemory, width = 160, height = 96) {
    const screens = new Map(), pictures = {};
    let current = 0, serial = 0, pending = null, map = null;
    for (const [id, p] of Object.entries(data.pictures)) {
      const bytes = typeof atob === 'function' ? Uint8Array.from(atob(p.bits), c => c.charCodeAt(0)) : Uint8Array.from(Buffer.from(p.bits, 'base64'));
      pictures[id] = { ...p, bytes, size: Math.ceil(p.w / 8) * p.h * (p.mask & 1 ? 2 : 1) };
    }
    function screen(id = current) {
      if (!screens.has(id)) screens.set(id, { pixels: new Int32Array(width * height), records: new Map() });
      return screens.get(id);
    }
    function area(x, y, right, bottom, value = 0) {
      if (right < 0 || bottom < 0 || x >= width || y >= height || right < x || bottom < y) return;
      const s = screen();
      for (let row = Math.max(0, y); row <= Math.min(height - 1, bottom); row++) s.pixels.fill(value, row * width + Math.max(0, x), row * width + Math.min(width, right + 1));
      if (!value && x <= 0 && y <= 0 && right >= width - 1 && bottom >= height - 1) s.records.clear();
    }
    function copy(from, to) {
      const s = screen(from); screens.set(to, { pixels: s.pixels.slice(), records: new Map(s.records) });
    }
    function readMap(pointer) {
      const buffer = getMemory(), m = data.memory;
      if (!buffer || pointer < 0 || pointer + 4 > buffer.byteLength || m.cities + 38 * m.cityStride > buffer.byteLength) return null;
      const bytes = new Uint8Array(buffer), v = new DataView(buffer);
      if (bytes[m.mapWidth] !== data.width || bytes[m.mapHeight] !== data.height) return null;
      const period = bytes[m.period] - 1, player = v.getUint16(m.player, true);
      if (period < 0 || period > 3 || player >= 200) return null;
      const [x, y, setx, sety] = bytes.slice(pointer, pointer + 4);
      if (x >= data.width || y >= data.height || setx >= data.width || sety >= data.height) return null;
      const owners = data.cityNames.map((_, i) => v.getUint16(m.cities + i * m.cityStride + m.ownerOffset, true));
      if (owners.some(owner => owner > 200)) return null;
      return { x, y, setx, sety, player, period, owners, originX: 0, originY: 0 };
    }
    function event(kind, a, b, c, d, e, f, g, h) {
      switch (kind) {
        case 1: current = a; screen(); break;
        case 2: copy(a, 0); break;
        case 3: copy(0, -1); break;
        case 4: copy(-1, 0); break;
        case 5: case 6: area(a, b, c, d); pending = null; break;
        case 7: area(a, b, c, b); area(a, d, c, d); area(a, b, a, d); area(c, b, c, d); break;
        case 8: area(a, b, a, b); break;
        case 10: case 11: pending = null; break;
        case 12: width = a || width; height = b || height; screens.clear(); current = 0; pending = null; map = null; break;
        case 13:
          if (c >= width * height && screens.has(a)) { const previous = current; current = a; area(0, 0, width - 1, height - 1); current = previous; }
          break;
        case 14: map = null; break;
        case 16: map = readMap(a); break;
        case 15: {
          const picture = pictures[a];
          pending = picture && !b && c > 0 && c <= picture.count ? { resource: a, index: c - 1, x: d, y: e, picture } : null;
          break;
        }
        case 9: {
          area(a, b, c, d);
          const r = pending;
          if (!r || r.x !== a || r.y !== b || r.picture.w !== c - a + 1 || r.picture.h !== d - b + 1 || f !== 0 || g !== 1 || !h || r.picture.mask & 1) return;
          const bits = r.picture.bytes.subarray(r.index * r.picture.size, (r.index + 1) * r.picture.size);
          const buffer = getMemory();
          if (!buffer || e < 0 || e + bits.length > buffer.byteLength) return;
          const actual = new Uint8Array(buffer, e, bits.length);
          if (bits.some((bit, i) => actual[i] !== bit)) return;
          if (r.resource === 54 && map) {
            map = { ...map, originX: a - (r.index % data.width - map.x) * 16, originY: b - (Math.floor(r.index / data.width) - map.y) * 16 };
          }
          const record = { ...r, bits, w: r.picture.w, h: r.picture.h, map, id: ++serial };
          if (r.resource === 55 && map) {
            const tileX = Math.floor((a - map.originX) / 16) + map.x, tileY = Math.floor((b - map.originY) / 16) + map.y;
            const city = data.grid[tileY * data.width + tileX] - 1;
            if (city >= 0) {
              const owner = map.owners[city], state = relation(owner, map.player);
              const expected = { own: 8, enemy: 7, unowned: 0 }[state];
              if (r.index === expected) record.city = { id: city, owner, state, name: data.cityNames[city], faction: data.names[map.period][owner - 1] || '', label: factionLabel(owner, data.names[map.period], map.owners) };
            }
          }
          screen().records.set(record.id, record); area(a, b, c, d, record.id);
          break;
        }
      }
    }
    function visible(rgba) {
      const s = screen(0), pixels = s.pixels.slice(), ids = new Set();
      // Final-frame proof catches drawing paths that did not issue notifications.
      for (let p = 0; p < pixels.length; p++) {
        const r = s.records.get(pixels[p]); if (!r) continue;
        const x = p % width - r.x, y = Math.floor(p / width) - r.y;
        const black = !!(r.bits[y * Math.ceil(r.w / 8) + (x >> 3)] & (128 >> (x & 7)));
        const q = p * 4, actualBlack = rgba[q + 3] > 0 && rgba[q] < 128;
        if (actualBlack !== black) pixels[p] = 0; else ids.add(r.id);
      }
      for (const id of s.records.keys()) if (!s.pixels.includes(id)) s.records.delete(id);
      return { pixels, records: [...ids].map(id => s.records.get(id)), width, height };
    }
    return { event, visible, readMap };
  }
  const api = { createTracker, relation, factionLabel, portraitSource };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined') return;
  const data = window.BayeMapData;
  if (!data) return;
  const tracker = createTracker(data, () => typeof wasmMemory === 'undefined' ? null : wasmMemory.buffer);
  const assets = {}, assetErrors = [];
  function load(key, name) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { assets[key] = img; resolve(); };
      img.onerror = () => { assetErrors.push(name); resolve(); };
      img.src = `assets/hd/${name}?v=20260926remaster1`;
    });
  }
  const ready = Promise.all([load('world', 'world-terrain.png'), load('city', 'city-gatehouse.png'),
    ...data.portraitSheets.map(sheet => load(sheet.file, sheet.file))]);
  function clipMask(ctx, visible, accept, scale) {
    ctx.beginPath();
    for (let y = 0; y < visible.height; y++) {
      let start = -1;
      for (let x = 0; x <= visible.width; x++) {
        const hit = x < visible.width && accept(visible.pixels[y * visible.width + x]);
        if (hit && start < 0) start = x;
        if (!hit && start >= 0) { ctx.rect(start * scale, y * scale, (x - start) * scale, scale); start = -1; }
      }
    }
    ctx.clip();
  }
  function flag(ctx, city, x, y, scale) {
    const s = scale;
    ctx.lineWidth = .35 * s; ctx.strokeStyle = '#000';
    if (city.state === 'unowned') {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc((x + 4) * s, (y - 1.35) * s, 1.1 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); return;
    }
    const label = city.label || '?', width = Math.max(4.7, label.length * 3.1 + .9), left = x + 4 - width / 2;
    const top = Math.max(1.25, y - 4.7), height = Math.min(4.5, y - .1 - top);
    ctx.fillStyle = city.state === 'own' ? '#000' : '#fff'; ctx.fillRect(left * s, top * s, width * s, height * s);
    ctx.strokeRect(left * s, top * s, width * s, height * s);
    ctx.fillStyle = city.state === 'own' ? '#fff' : '#000';
    ctx.font = `700 ${Math.min(3.7, height - .3) * s}px "Microsoft YaHei", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, (x + 4) * s, (top + height / 2) * s, (width - .5) * s);
  }
  function citySprite(ctx, x, y, w, h, scale) {
    ctx.drawImage(assets.city, 119, 190, 1014, 885, x * scale, y * scale, w * scale, h * scale);
  }
  function paint(ctx, rgba, scale) {
    const visible = tracker.visible(rgba), tiles = visible.records.filter(r => r.resource === 54 && r.map);
    const byId = new Map(visible.records.map(r => [r.id, r])), tileIds = new Set(tiles.map(r => r.id));
    let count = 0, portraits = 0, cities = [];
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (tiles.length && assets.world) {
      const map = tiles[0].map, worldX = map.originX - map.x * 16, worldY = map.originY - map.y * 16;
      ctx.save(); clipMask(ctx, visible, id => tileIds.has(id), scale);
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, visible.width * scale, visible.height * scale);
      ctx.globalAlpha = .82;
      ctx.drawImage(assets.world, worldX * scale, worldY * scale, data.width * 16 * scale, data.height * 16 * scale);
      ctx.globalAlpha = 1;
      // Roads use only original city-link data, not the concept artist's examples.
      const positions = new Map(data.grid.map((id, index) => [id - 1, [worldX + index % data.width * 16 + 8, worldY + Math.floor(index / data.width) * 16 + 8]]).filter(([id]) => id >= 0));
      const edges = new Set(); ctx.strokeStyle = '#222'; ctx.lineWidth = .32 * scale; ctx.setLineDash([.55 * scale, 1.05 * scale]);
      ctx.lineCap = 'round'; ctx.beginPath();
      data.links.forEach((links, i) => links.forEach(j => {
        const key = [Math.min(i, j), Math.max(i, j)].join(':'); if (edges.has(key)) return; edges.add(key);
        const a = positions.get(i), b = positions.get(j); if (!a || !b) return;
        ctx.moveTo(a[0] * scale, a[1] * scale); ctx.lineTo(b[0] * scale, b[1] * scale);
      }));
      ctx.stroke(); ctx.setLineDash([]); ctx.restore(); count += tiles.length;
    }
    for (const r of visible.records) {
      const portrait = portraitSource(data, r.resource, r.index), atlas = portrait ? assets[portrait.file] : null;
      if (r.resource === 55 && assets.city && r.city) {
        ctx.save(); clipMask(ctx, visible, id => id === r.id, scale);
        ctx.fillStyle = '#fff'; ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        citySprite(ctx, r.x, r.y, r.w, r.h, scale); ctx.restore();
        ctx.save();
        // Flags may extend into terrain, but never over a menu or another city.
        clipMask(ctx, visible, id => id === r.id || byId.get(id)?.resource === 54, scale);
        flag(ctx, r.city, r.x, r.y, scale); ctx.restore();
        cities.push({ ...r.city, x: r.x, y: r.y }); count++;
      } else if (atlas) {
        const sw = atlas.width / portrait.columns, sh = atlas.height / portrait.rows;
        ctx.save(); clipMask(ctx, visible, id => id === r.id, scale);
        ctx.fillStyle = '#fff'; ctx.fillRect(r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        ctx.drawImage(atlas, portrait.column * sw, portrait.row * sh, sw, sh, r.x * scale, r.y * scale, r.w * scale, r.h * scale);
        ctx.restore(); portraits++; count++;
      }
    }
    ctx.restore();
    const map = tiles[0]?.map, selected = map ? data.grid[map.sety * data.width + map.setx] - 1 : -1;
    const info = map && selected >= 0 ? { name: data.cityNames[selected], owner: map.owners[selected], faction: data.names[map.period][map.owners[selected] - 1] || '', state: relation(map.owners[selected], map.player) } : null;
    const panel = document.getElementById('map-ownership');
    if (panel) {
      panel.hidden = !tiles.length;
      const detail = document.getElementById('selected-city-owner');
      if (detail) detail.textContent = info ? `${info.name} · ${info.state === 'own' ? '本方' : info.state === 'unowned' ? '无主城池' : '敌方'}${info.faction ? ` · ${info.faction}势力` : ''}` : '移动光标查看城池归属';
    }
    return { count, portraits, cities, selected: info, viewport: map ? { x: map.x, y: map.y } : null, assetErrors: assetErrors.slice() };
  }
  window.BayeMapArt = { ...api, event: tracker.event, paint, ready };
})();
