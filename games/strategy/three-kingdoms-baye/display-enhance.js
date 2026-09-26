/* Vector artwork and verified text cells rendered at display resolution.
 * Drawing notifications only read memory. No calls back into the game engine. */
(() => {
  'use strict';
  function displayScale(cssWidth, pixelRatio, width) {
    return Math.max(4, Math.min(16, Math.ceil(cssWidth * pixelRatio / width) || 4));
  }
  function decodeCharacter(code, decoder) {
    return code < 256 ? String.fromCharCode(code) : decoder.decode(new Uint8Array([code >> 8, code & 255]));
  }
  function overlaps(g, x, y, right, bottom) {
    return g.x <= right && g.y <= bottom && g.x + g.w > x && g.y + g.h > y;
  }
  // Verify the entire cell against the final frame, including empty pixels. If another
  // drawing path changed it (clipping, mirroring, fading, etc.), retain the original.
  function matchesGlyph(g, rgba, width, height) {
    if (g.x < 0 || g.y < 0 || g.x + g.w > width || g.y + g.h > height) return false;
    const stride = Math.ceil(g.w / 8);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const bit = !!(g.bits[y * stride + (x >> 3)] & (128 >> (x & 7)));
      let black = bit !== g.inverse;
      for (const r of g.inversions || []) {
        if (g.x + x >= r.x && g.x + x <= r.right && g.y + y >= r.y && g.y + y <= r.bottom) black = !black;
      }
      const p = ((g.y + y) * width + g.x + x) * 4;
      if (black) {
        if (rgba[p] || rgba[p + 1] || rgba[p + 2] || rgba[p + 3] !== 255) return false;
      } else if (rgba[p + 3] && (rgba[p] !== 255 || rgba[p + 1] !== 255 || rgba[p + 2] !== 255)) return false;
    }
    return true;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { displayScale, decodeCharacter, matchesGlyph };
  if (typeof window === 'undefined') return;

  const canvas = document.getElementById('lcd'), ctx = canvas.getContext('2d');
  const selector = document.getElementById('display-mode'), resolution = document.getElementById('display-resolution');
  const originalSurface = document.createElement('canvas'), originalCtx = originalSurface.getContext('2d');
  const screens = new Map(), decoder = new TextDecoder('gbk');
  const stats = { events: 0, glyphs: 0, verified: 0, errors: 0 };
  let current = 0, pending = null, mode = 'hd', snapshot, sourceWidth = 160, sourceHeight = 96, originalImage;
  let textCells = [];
  let artwork = null, menu = null;
  let menuAnimation = 0;
  const preferenceKey = 'baye/display-mode';
  try { if (window.localStorage.getItem(preferenceKey) === 'original') mode = 'original'; } catch (_) {}
  function screen(id) {
    if (!screens.has(id)) screens.set(id, []);
    return screens.get(id);
  }
  function copy(from, to) { screens.set(to, screen(from).map(g => ({ ...g }))); }
  function invalidate(x, y, right, bottom) {
    screens.set(current, screen(current).filter(g => !overlaps(g, x, y, right, bottom)));
  }
  function picture(x, y, right, bottom, pointer, flag, scale, compat) {
    const character = pending;
    pending = null;
    invalidate(x, y, right, bottom);
    const w = right - x + 1, h = bottom - y + 1;
    if (!character || character.x !== x || character.y !== y || flag !== 0 || scale !== 1 || !compat || !pointer) return;
    if ((w !== 6 && w !== 12) || h !== 12) return;
    const bits = new Uint8Array(wasmMemory.buffer, pointer, Math.ceil(w / 8) * h).slice();
    const text = decodeCharacter(character.code, decoder);
    if (!text.trim() || text === '\ufffd' || character.code < 32) return;
    screen(current).push({ x, y, w, h, text, bits, inverse: false });
    stats.glyphs++;
  }
  function event(kind, a, b, c, d, e, f, g, h) {
    stats.events++;
    switch (kind) {
      case 1: current = a; screen(a); pending = null; break;
      case 2: copy(a, 0); break;
      case 3: copy(0, -1); break;
      case 4: copy(-1, 0); break;
      case 5: invalidate(a, b, c, d); pending = null; break;
      case 6:
        screens.set(current, screen(current).filter(glyph => {
          if (!overlaps(glyph, a, b, c, d)) return true;
          if (a <= glyph.x && b <= glyph.y && c >= glyph.x + glyph.w - 1 && d >= glyph.y + glyph.h - 1) {
            glyph.inverse = !glyph.inverse; return true;
          }
          // Selection rectangles can touch the first scanline of the next row.
          // Preserve that exact partial inversion instead of losing the whole glyph.
          const regions = glyph.inversions || [];
          const same = r => r.x === a && r.y === b && r.right === c && r.bottom === d;
          glyph.inversions = regions.some(same) ? regions.filter(r => !same(r)) : [...regions, { x: a, y: b, right: c, bottom: d }];
          return true;
        }));
        break;
      case 7:
        invalidate(a, b, c, b); invalidate(a, d, c, d);
        invalidate(a, b, a, d); invalidate(c, b, c, d); break;
      case 8: invalidate(a, b, a, b); break;
      case 9: picture(a, b, c, d, e, f, g, h); break;
      case 10: case 11: pending = { x: a, y: b, code: c }; break;
      case 12: screens.clear(); current = 0; pending = null; break;
      case 13: if (c >= sourceWidth * sourceHeight && screens.has(a)) screens.set(a, []); break;
      case 14: menuAnimation = a; break;
    }
  }
  function updateMode() { selector.value = mode; document.body.dataset.bayeDisplay = mode; }
  function fail(error) {
    if (stats.errors++ === 0) console.error('Monochrome display:', error);
    mode = 'original'; updateMode();
  }
  window.bayeHDDispatch = (...args) => { try { event(...args); } catch (error) { fail(error); } };
  function present() {
    if (!snapshot) return;
    const scale = displayScale(canvas.getBoundingClientRect().width, window.devicePixelRatio || 1, sourceWidth);
    const w = sourceWidth * scale, h = sourceHeight * scale;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    const enhanced = mode === 'hd' && !stats.errors;
    if (enhanced && window.BayeVectorArt) {
      menu = window.BayeMenuArt?.identify(snapshot, sourceWidth, sourceHeight, window.BayeMenuFingerprints || []);
      if (!window.BayeMenuArt?.hasIllustration(menu)) {
        if (!artwork) artwork = window.BayeVectorArt.reconstruct(snapshot, sourceWidth, sourceHeight);
        window.BayeVectorArt.paint(ctx, artwork, scale);
      }
      const selection = menu ? menuAnimation - (menu.name === 'main' ? 100 : 104) : -1;
      window.BayeMenuArt?.paint(ctx, menu, scale, selection);
    } else { ctx.drawImage(originalSurface, 0, 0, w, h); menu = null; }
    textCells = [];
    if (enhanced) {
      for (const glyph of screen(0)) {
        if (!matchesGlyph(glyph, snapshot, sourceWidth, sourceHeight)) continue;
        const { x, y, w: gw, h: gh, text, inverse } = glyph;
        ctx.save();
        ctx.beginPath(); ctx.rect(x * scale, y * scale, gw * scale, gh * scale); ctx.clip();
        ctx.fillStyle = inverse ? '#000' : '#fff';
        ctx.fillRect(x * scale, y * scale, gw * scale, gh * scale);
        ctx.fillStyle = inverse ? '#fff' : '#000';
        ctx.font = `500 ${gh * .91 * scale}px "Microsoft YaHei", "Noto Sans SC", sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, (x + gw / 2) * scale, (y + gh * .52) * scale, (gw - .4) * scale);
        ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#fff';
        for (const r of glyph.inversions || []) {
          ctx.fillRect(r.x * scale, r.y * scale, (r.right - r.x + 1) * scale, (r.bottom - r.y + 1) * scale);
        }
        ctx.restore();
        textCells.push({ x, y, w: gw, h: gh });
      }
    }
    stats.verified = textCells.length;
    // Work in black/white above so reverse selections remain exact, then restore
    // the dictionary's original LCD background, including antialiased edge shades.
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#b8c58d'; ctx.fillRect(0, 0, w, h); ctx.restore();
    if (canvas.dataset) {
      canvas.dataset.artwork = enhanced && window.BayeMenuArt?.hasIllustration(menu) ? 'illustration' : enhanced && artwork ? 'vector' : 'original';
      canvas.dataset.vectorContours = String((artwork?.refined || 0) + (artwork?.curved || 0));
      canvas.dataset.menuArtwork = menu?.name || '';
      canvas.dataset.menuSelection = menu ? String(menuAnimation - (menu.name === 'main' ? 100 : 104)) : '';
    }
    resolution.textContent = `${w} × ${h} · ${mode === 'hd' ? '绿屏 · 高清重绘' : '原始点阵'}`;
  }
  function safePresent() { try { present(); } catch (error) { fail(error); } }
  selector.addEventListener('change', () => {
    mode = selector.value === 'original' ? 'original' : 'hd';
    try { window.localStorage.setItem(preferenceKey, mode); } catch (_) {}
    updateMode(); safePresent();
  });
  updateMode();
  const originalFlush = window.bayeFlushLcdBuffer;
  window.bayeFlushLcdBuffer = buffer => {
    if (typeof wasmMemory === 'undefined' || dotSize !== 1) { originalFlush(buffer); window.bayeFrameRendered?.(); return; }
    const count = lcdWidth * lcdHeight * 4;
    if (!snapshot || sourceWidth !== lcdWidth || sourceHeight !== lcdHeight) {
      snapshot = new Uint8ClampedArray(count); sourceWidth = lcdWidth; sourceHeight = lcdHeight;
      artwork = null;
      originalSurface.width = sourceWidth; originalSurface.height = sourceHeight;
      originalImage = new ImageData(snapshot, sourceWidth, sourceHeight);
    }
    const incoming = new Uint8Array(wasmMemory.buffer, buffer, count);
    if (artwork) for (let i = 0; i < count; i++) if (snapshot[i] !== incoming[i]) { artwork = null; break; }
    snapshot.set(incoming);
    originalCtx.putImageData(originalImage, 0, 0); safePresent(); window.bayeFrameRendered?.();
  };
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(safePresent).observe(canvas);
  window.addEventListener('resize', safePresent); document.addEventListener('fullscreenchange', safePresent);
  window.BayeMenuArt?.ready.then(safePresent);
  window.bayeHDStatus = () => ({ ...stats, mode, screens: screens.size, textCells: textCells.map(g => ({ ...g })), artwork: artwork ? { sourcePoints: artwork.sourcePoints, vectorPoints: artwork.vectorPoints, refined: artwork.refined } : null, menu: menu?.name || null });
})();
