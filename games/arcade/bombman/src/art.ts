import Phaser from 'phaser';

type Painter = (g: CanvasRenderingContext2D) => void;
function texture(scene: Phaser.Scene, name: string, width: number, height: number, painter: Painter) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const g = canvas.getContext('2d')!; g.imageSmoothingEnabled = false;
  painter(g); scene.textures.addCanvas(name, canvas);
}
const rect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
const poly = (g: CanvasRenderingContext2D, points: number[], color: string) => {
  g.fillStyle = color; g.beginPath(); g.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1]);
  g.closePath(); g.fill();
};
const ellipse = (g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string) => {
  g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
};
function rnd(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function grass(g: CanvasRenderingContext2D, variant: number) {
  rect(g, 0, 0, 40, 40, '#057803');
  const random = rnd(840 + variant * 41);
  for (let n = 0; n < 380; n++) {
    const x = Math.floor(random() * 40), y = Math.floor(random() * 40);
    rect(g, x, y, random() < .8 ? 1 : 2, 1, ['#108608', '#006d00', '#208d0f', '#4a9b20', '#086604'][Math.floor(random() * 5)]);
  }
  for (let n = 0; n < 23; n++) {
    const x = Math.floor(random() * 39), y = Math.floor(random() * 39);
    rect(g, x, y, 2, 1, '#65a624');
  }
}
function wall(g: CanvasRenderingContext2D) {
  rect(g, 0, 1, 40, 39, '#081e05');
  rect(g, 2, 1, 36, 32, '#668b28'); rect(g, 3, 2, 34, 29, '#a6cc59');
  rect(g, 4, 3, 32, 2, '#d6ee88'); rect(g, 4, 4, 2, 25, '#e8ffb5');
  rect(g, 7, 7, 24, 20, '#658e32'); rect(g, 9, 8, 21, 17, '#eaf7ca');
  poly(g, [9, 8, 30, 8, 20, 17, 9, 17], '#f3ffd1');
  rect(g, 29, 8, 3, 15, '#80a94a'); rect(g, 10, 25, 21, 2, '#567526');
  rect(g, 5, 29, 31, 3, '#597929'); rect(g, 4, 32, 33, 4, '#243f0b');
  rect(g, 3, 36, 35, 2, '#0a1805'); rect(g, 7, 33, 27, 1, '#9bbf52');
  rect(g, 26, 7, 4, 3, '#ffffff'); rect(g, 32, 4, 3, 5, '#e0f5ae');
  rect(g, 4, 7, 2, 3, '#ffffff'); rect(g, 15, 28, 12, 1, '#b5cf6b');
  for (const [x, y] of [[7, 3], [36, 10], [3, 23], [35, 27]]) rect(g, x, y, 2, 2, '#40601b');
}
function stone(g: CanvasRenderingContext2D) {
  rect(g, 2, 34, 37, 5, '#101d22'); rect(g, 3, 31, 34, 5, '#546874');
  rect(g, 2, 6, 35, 28, '#172c34'); rect(g, 4, 3, 31, 28, '#698698');
  rect(g, 5, 2, 29, 25, '#bed4dd'); rect(g, 7, 4, 25, 22, '#d6e8e8');
  rect(g, 8, 5, 22, 19, '#b2c7cd'); rect(g, 11, 7, 18, 17, '#d1dfe2');
  rect(g, 11, 7, 15, 2, '#ecf7f3'); rect(g, 10, 9, 2, 12, '#f3ffff');
  rect(g, 8, 26, 24, 2, '#7795a2'); rect(g, 5, 29, 31, 2, '#b8c9cd');
  rect(g, 6, 34, 28, 1, '#819aa3'); rect(g, 6, 37, 29, 1, '#94aeb1');
  rect(g, 29, 8, 2, 16, '#819daa'); rect(g, 15, 11, 2, 1, '#8aa4ae');
  rect(g, 25, 17, 2, 1, '#90a9af'); rect(g, 12, 19, 3, 1, '#a7bcc1');
}
function brick(g: CanvasRenderingContext2D) {
  rect(g, 0, 0, 40, 40, '#594b37');
  rect(g, 0, 1, 40, 36, '#76614a');
  const random = rnd(419);
  for (let row = 0; row < 3; row++) {
    const y = row * 13 + 1, offset = row % 2 ? -10 : 0;
    for (let x = offset; x < 40; x += 21) {
      const bx = Math.max(1, x + 1), ex = Math.min(39, x + 19), w = ex - bx;
      if (w <= 0) continue;
      rect(g, bx, y, w, 10, '#f4e4c7'); rect(g, bx, y + 2, w, 8, '#d8c8a9');
      rect(g, bx, y + 1, w, 2, '#fff2d9'); rect(g, bx + 1, y + 4, w - 2, 4, row === 1 ? '#d6c6a9' : '#e7d8bc');
      rect(g, bx, y + 10, w, 2, '#ac9574'); rect(g, ex - 2, y + 2, 2, 8, '#aa9679');
      for (let t = 0; t < 4; t++) rect(g, bx + Math.floor(random() * w), y + 3 + Math.floor(random() * 6), 1, 1, random() < .5 ? '#bbaa8e' : '#fff4df');
    }
  }
  rect(g, 1, 38, 38, 2, '#443a2f');
}
function bomb(g: CanvasRenderingContext2D, color: 'blue' | 'black' | 'red', frame: number) {
  const body = color === 'blue' ? '#0e426f' : color === 'red' ? '#721d24' : '#25272a';
  const light = color === 'blue' ? '#3479aa' : color === 'red' ? '#b24c54' : '#5b5d5e';
  ellipse(g, 20, 34, 16, 4, '#0a160b');
  ellipse(g, 19, 21, 16, 16, '#111613'); ellipse(g, 18, 19, 15, 15, body);
  ellipse(g, 14, 12, 9, 6, light); ellipse(g, 11, 10, 4, 2, color === 'black' ? '#929696' : '#ccdcf0');
  rect(g, 23, 27, 7, 4, color === 'red' ? '#3f0f16' : '#07131d');
  poly(g, [27, 7, 31, 5, 34, 9, 31, 13, 27, 12], '#171e16');
  rect(g, 30, 5, 2, 4, '#b6a986'); rect(g, 32, 2, 2, 5, '#654e2e');
  rect(g, 33, frame ? 0 : 3, 3, 3, '#ff8d00'); rect(g, 35, frame ? 2 : 0, 2, 3, '#f9ec39');
  rect(g, 31, 0, 2, 2, '#fff7a2');
}
function fire(g: CanvasRenderingContext2D, kind: string, frame: number) {
  if (kind === 'center') {
    ellipse(g, 20, 20, 18, 18, '#bb2705'); ellipse(g, 20, 20, 16, 16, '#fa6c03');
    ellipse(g, 20, 20, 13, 14, '#ffe31b'); ellipse(g, 20, 20, 9, 11, '#fff9af');
    rect(g, 17, 2, 5, 35, '#fffcd4'); rect(g, 3, 17, 34, 5, '#fffcd4');
    return;
  }
  const horizontal = kind === 'horizontal' || kind === 'left' || kind === 'right';
  if (!horizontal) { g.translate(40, 0); g.rotate(Math.PI / 2); }
  const endLeft = kind === 'left' || kind === 'up', endRight = kind === 'right' || kind === 'down';
  const random = rnd(1938 + frame * 129 + kind.length);
  for (let x = 0; x < 40; x++) {
    const narrow = endLeft ? Math.min(1, (x + 3) / 12) : endRight ? Math.min(1, (42 - x) / 12) : 1;
    const edge = Math.round((8 + Math.floor(random() * 3)) * narrow);
    rect(g, x, 20 - edge, 1, edge * 2 + 1, '#a62b07');
    rect(g, x, 20 - Math.max(1, edge - 2), 1, Math.max(2, (edge - 2) * 2 + 1), '#f66d08');
    rect(g, x, 20 - Math.max(1, edge - 4), 1, Math.max(2, (edge - 4) * 2 + 1), '#ffe121');
    rect(g, x, 17, 1, 6, '#fffbc2');
  }
  if (frame) for (let i = 0; i < 7; i++) rect(g, Math.floor(random() * 40), 8 + Math.floor(random() * 24), 1, 1, '#fff98b');
}
function character(g: CanvasRenderingContext2D, id: number, direction: string, frame: number) {
  const isGirl = id === 0;
  const coat = ['#40267f', '#3b4445', '#b52128', '#9c198d'][id];
  const coatLight = ['#7553ae', '#697271', '#ec393e', '#cf45c0'][id];
  const hair = isGirl ? '#b97026' : '#123d35';
  const hairLight = isGirl ? '#e5a34d' : '#35705b';
  const skin = '#f3c19a';
  const walking = frame === 1;
  const back = direction === 'up';
  const side = direction === 'left' || direction === 'right';
  ellipse(g, 20, 66, 13, 3, '#092006');
  // Legs and small black shoes are anchored to the foot tile, independent of head height.
  rect(g, 14, 52, 5, walking ? 10 : 12, '#24232a'); rect(g, 22, 52, 5, walking ? 12 : 10, '#24232a');
  rect(g, 12, walking ? 62 : 64, 9, 4, '#171414'); rect(g, 21, walking ? 64 : 62, 9, 4, '#171414');
  rect(g, 14, 59, 4, 3, isGirl ? '#e9e2eb' : '#6d5551');
  rect(g, 24, 59, 4, 3, isGirl ? '#e9e2eb' : '#6d5551');
  poly(g, [12, 38, 29, 38, 32, 56, 9, 56], '#111719');
  poly(g, [13, 39, 27, 39, 29, 54, 11, 54], coat);
  rect(g, 16, 40, 7, 13, coatLight); rect(g, 18, 42, 3, 11, coat);
  rect(g, 10, 40, 5, 14, coat); rect(g, 27, 40, 5, 14, coat);
  rect(g, 10, 52, 5, 5, '#171c1a'); rect(g, 27, 52, 5, 5, '#171c1a');
  rect(g, 11, 53, 3, 3, skin); rect(g, 28, 53, 3, 3, skin);
  if (isGirl) { rect(g, 14, 52, 13, 3, '#311951'); rect(g, 20, 42, 3, 6, '#eec550'); }
  // Distinct front/back/side heads, surrounded by a dark pixel outline.
  ellipse(g, 20, 24, 15, 18, '#121914');
  ellipse(g, 20, 24, 13, 17, hair);
  if (back) {
    ellipse(g, 20, 20, 11, 13, hairLight); rect(g, 11, 14, 19, 15, hair);
    poly(g, [8, 21, 16, 15, 21, 23, 27, 15, 33, 21, 28, 29, 12, 29], hairLight);
    rect(g, 18, 24, 4, 14, hair); rect(g, 19, 25, 2, 12, '#162f2b');
  } else {
    ellipse(g, side ? 22 : 20, 28, 10, 12, skin);
    rect(g, 10, 20, 4, 13, hair); rect(g, 28, 19, 4, 14, hair);
    poly(g, [8, 19, 10, 11, 16, 7, 25, 7, 31, 12, 32, 21, 24, 17, 21, 21, 16, 16], hair);
    poly(g, [11, 13, 15, 9, 24, 9, 29, 14, 24, 13, 20, 17, 17, 12], hairLight);
    if (side) {
      rect(g, direction === 'right' ? 25 : 13, 27, 3, 4, '#171c18');
      rect(g, direction === 'right' ? 26 : 14, 28, 1, 2, '#ffffff');
      rect(g, direction === 'right' ? 28 : 11, 33, 3, 3, '#d69572');
    } else {
      rect(g, 15, 27, 3, 4, '#161c1b'); rect(g, 24, 27, 3, 4, '#161c1b');
      rect(g, 16, 27, 1, 2, '#ffffff'); rect(g, 25, 27, 1, 2, '#ffffff');
      rect(g, 19, 31, 3, 2, '#d68d75'); rect(g, 18, 35, 5, 1, '#8c4a4f');
    }
    rect(g, 9, 24, 2, 7, hairLight); rect(g, 29, 23, 2, 7, hairLight);
  }
  if (isGirl) { rect(g, 15, 5, 11, 2, '#eea84d'); rect(g, 28, 14, 5, 7, '#a45a25'); }
}
function item(g: CanvasRenderingContext2D, kind: string) {
  ellipse(g, 20, 34, 13, 4, '#09200c');
  ellipse(g, 20, 18, 16, 16, '#080e08'); ellipse(g, 20, 17, 14, 14, '#fffbd5');
  ellipse(g, 20, 17, 12, 12, '#ffffff');
  if (kind === 'bomb') { ellipse(g, 20, 18, 8, 8, '#2b2524'); rect(g, 24, 7, 3, 5, '#ba722c'); }
  if (kind === 'flame') {
    poly(g, [20, 5, 24, 15, 28, 13, 27, 23, 20, 29, 13, 24, 12, 16], '#a9330b');
    poly(g, [20, 11, 23, 18, 24, 23, 20, 27, 16, 23, 17, 17], '#ffe320');
  }
  if (kind === 'speed') {
    poly(g, [23, 6, 12, 19, 20, 19, 17, 29, 29, 15, 21, 15], '#d39712');
    rect(g, 13, 19, 7, 2, '#fff469');
  }
  if (kind === 'skull') {
    ellipse(g, 20, 15, 8, 8, '#e9e3d9'); rect(g, 14, 16, 12, 9, '#e9e3d9');
    rect(g, 14, 13, 4, 5, '#242523'); rect(g, 23, 13, 4, 5, '#242523');
    rect(g, 19, 19, 3, 3, '#b14135'); rect(g, 15, 24, 2, 3, '#292d24'); rect(g, 20, 24, 2, 3, '#292d24'); rect(g, 25, 24, 2, 3, '#292d24');
  }
}

export function makeArt(scene: Phaser.Scene) {
  for (let v = 0; v < 4; v++) texture(scene, `grass${v}`, 40, 40, g => grass(g, v));
  texture(scene, 'wall', 40, 40, wall); texture(scene, 'stone', 40, 40, stone); texture(scene, 'brick', 40, 40, brick);
  for (const color of ['blue', 'black', 'red'] as const) for (let frame = 0; frame < 2; frame++) texture(scene, `bomb-${color}-${frame}`, 40, 40, g => bomb(g, color, frame));
  for (const kind of ['center', 'horizontal', 'vertical', 'left', 'right', 'up', 'down']) for (let frame = 0; frame < 2; frame++) texture(scene, `fire-${kind}-${frame}`, 40, 40, g => fire(g, kind, frame));
  for (let id = 0; id < 4; id++) for (const dir of ['up', 'down', 'left', 'right']) for (let frame = 0; frame < 2; frame++) texture(scene, `person-${id}-${dir}-${frame}`, 40, 70, g => character(g, id, dir, frame));
  for (const kind of ['bomb', 'flame', 'speed', 'skull']) texture(scene, `item-${kind}`, 40, 40, g => item(g, kind));
}
