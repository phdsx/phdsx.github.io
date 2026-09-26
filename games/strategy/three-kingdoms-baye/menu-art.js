/* Text embedded in the original menu pictures, redrawn in the same rectangles.
 * Recognition requires the original header pixels; no access to game state. */
(() => {
  'use strict';
  const pictures = {};
  let ready = Promise.resolve();
  if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
    const base = new URL('.', document.currentScript.src);
    ready = Promise.all(['main', 'period'].map(name => new Promise(resolve => {
      const picture = new Image();
      picture.onload = () => { pictures[name] = picture; resolve(); };
      picture.onerror = resolve;
      picture.src = new URL(`assets/hd/${name === 'main' ? 'main' : 'scenarios'}-monochrome.png`, base).href;
    })));
  }
  function identify(rgba, width, height, templates) {
    if (width !== 160 || height !== 96) return null;
    for (const t of templates) {
      const stride = Math.ceil(t.width / 8); let match = true;
      for (let y = 0; match && y < t.rows; y++) for (let x = 0; x < t.width; x++) {
        const index = y * stride + (x >> 3);
        const bit = !!(parseInt(t.bits.slice(index * 2, index * 2 + 2), 16) & (128 >> (x & 7)));
        const p = (y * width + x) * 4;
        const ink = Math.round((255 - rgba[p]) * rgba[p + 3] / 255);
        if (ink !== (bit ? 255 : 0)) { match = false; break; }
      }
      if (match) return t;
    }
    return null;
  }
  function label(ctx, rect, text, scale, title) {
    const [x, y, w, h] = rect, rows = text.split('|');
    ctx.save(); ctx.beginPath(); ctx.rect(x * scale, y * scale, w * scale, h * scale); ctx.clip();
    ctx.fillStyle = '#000'; ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const size = title ? h * .92 : Math.min(11.8, h / rows.length * .9, w / rows[0].length * .94);
    ctx.font = `${title ? 700 : 500} ${size * scale}px ${title ? '"STKaiti", "KaiTi", serif' : '"Microsoft YaHei", "Noto Sans SC", sans-serif'}`;
    rows.forEach((row, i) => ctx.fillText(row, (x + w / 2) * scale, (y + (i + .52) * h / rows.length) * scale, (w - 1) * scale));
    ctx.restore();
  }
  function paint(ctx, menu, scale, selection) {
    if (!menu) return;
    if (pictures[menu.name]) {
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(pictures[menu.name], 0, 0, 160 * scale, 96 * scale); ctx.restore();
    }
    label(ctx, menu.title, '三国霸业', scale, true);
    for (const rect of menu.labels) label(ctx, rect, rect[4], scale, false);
    if (pictures[menu.name] && Number.isInteger(selection) && selection >= 0 && selection < 4) {
      // Original engine menu index and original hit rectangles; presentation only.
      const rects = menu.name === 'main' ? [[6,45,73,64],[83,45,151,64],[6,70,73,89],[83,71,151,89]]
        : [[1,25,78,57],[1,62,78,94],[82,25,159,57],[82,62,159,94]];
      const [x,y,right,bottom] = rects[selection];
      ctx.save(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1.4 * scale;
      ctx.strokeRect((x+.6)*scale,(y+.6)*scale,(right-x-1.2)*scale,(bottom-y-1.2)*scale);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = .55 * scale;
      ctx.strokeRect((x+1.3)*scale,(y+1.3)*scale,(right-x-2.6)*scale,(bottom-y-2.6)*scale);
      if (menu.name === 'main') {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo((x+2.5)*scale,(y+5)*scale);
        ctx.lineTo((x+5)*scale,(y+9)*scale); ctx.lineTo((x+2.5)*scale,(y+13)*scale); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  }
  const api = { identify, paint, ready, hasIllustration: menu => !!(menu && pictures[menu.name]) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.BayeMenuArt = api;
})();
