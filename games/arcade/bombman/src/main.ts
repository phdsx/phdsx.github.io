import Phaser from 'phaser';
import { BOARD_X, BOARD_Y, COLS, ROWS, TILE, TUNING } from './config.ts';
import { makeArt } from './art.ts';
import { Match, type Actor, type Direction, type Flame, type ItemKind } from './model.ts';

type BindAction = 'up' | 'down' | 'left' | 'right' | 'bomb';
const defaults: Record<BindAction, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', bomb: 'Space' };
let bindings: Record<BindAction, string> = { ...defaults };
try { bindings = { ...bindings, ...JSON.parse(localStorage.getItem('bombman-keys') || '{}') }; } catch { /* invalid saved keys */ }
const pressed = new Set<string>();
let waitingFor: BindAction | null = null;
let soundOn = true;
let audio: AudioContext | null = null;
const ui = (id: string) => document.getElementById(id)!;
const readable = (code: string) => ({ Space: '空格', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' } as Record<string, string>)[code] || code.replace('Key', '');

function drawKeys() {
  const wrap = ui('keys'); wrap.replaceChildren();
  for (const [action, label] of [['up', '上'], ['down', '下'], ['left', '左'], ['right', '右'], ['bomb', '放弹']] as const) {
    const button = document.createElement('button');
    button.textContent = `${label}：${waitingFor === action ? '按新键…' : readable(bindings[action])}`;
    button.classList.toggle('waiting', waitingFor === action);
    button.addEventListener('click', () => { waitingFor = action; drawKeys(); });
    wrap.append(button);
  }
}
drawKeys();

function tone(type: 'place' | 'blast' | 'brick' | 'pickup' | 'death' | 'end') {
  if (!soundOn) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const now = audio.currentTime;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    const params = {
      place: [440, 180, .085, 'square'], blast: [95, 35, .27, 'sawtooth'],
      brick: [155, 75, .08, 'triangle'], pickup: [510, 840, .13, 'square'],
      death: [330, 65, .31, 'sawtooth'], end: [520, 260, .26, 'triangle'],
    } as const;
    const [start, end, length, wave] = params[type];
    oscillator.type = wave; oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(end, now + length);
    gain.gain.setValueAtTime(type === 'blast' ? .095 : .045, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + length);
    oscillator.connect(gain).connect(audio.destination); oscillator.start(now); oscillator.stop(now + length);
  } catch { /* Audio API may be unavailable in the browser. */ }
}

function directionFromKeys(): Direction | null {
  for (const [action, fallback] of [['up', 'KeyW'], ['down', 'KeyS'], ['left', 'KeyA'], ['right', 'KeyD']] as const) {
    if (pressed.has(bindings[action]) || pressed.has(fallback)) return action;
  }
  return null;
}

const referenceBombs = [
  { x: 4, y: 1, color: 'blue' }, { x: 9, y: 4, color: 'black' }, { x: 11, y: 4, color: 'black' },
  { x: 5, y: 9, color: 'red' }, { x: 5, y: 11, color: 'red' },
] as const;
const referenceFlames: Flame[] = [
  { x: 11, y: 9, kind: 'center', until: Infinity },
  ...Array.from({ length: 9 }, (_, n) => ({ x: n + 7, y: 9, kind: (n === 0 ? 'left' : n === 8 ? 'right' : 'horizontal') as Flame['kind'], until: Infinity })),
  ...Array.from({ length: 5 }, (_, n) => ({ x: 11, y: n + 6, kind: (n === 0 ? 'up' : 'vertical') as Flame['kind'], until: Infinity })),
  { x: 11, y: 11, kind: 'down', until: Infinity },
];

class GameScene extends Phaser.Scene {
  match = new Match();
  private solids: Phaser.GameObjects.Image[][] = [];
  private dynamicObjects: Phaser.GameObjects.GameObject[] = [];
  private screenText!: Phaser.GameObjects.Text;
  private lastStatus = '';
  private reference = true;

  constructor() { super('match'); }

  create() {
    makeArt(this);
    for (let y = 0; y < ROWS; y++) {
      this.solids[y] = [];
      for (let x = 0; x < COLS; x++) {
        const px = BOARD_X + x * TILE, py = BOARD_Y + y * TILE;
        this.add.image(px, py, `grass${(x * 7 + y * 13) % 4}`).setOrigin(0).setDepth(-100);
        const tile = this.match.tile(x, y);
        if (tile !== 'floor') this.solids[y][x] = this.add.image(px, py, tile).setOrigin(0).setDepth(py + 38);
      }
    }
    this.screenText = this.add.text(380, 282, '', {
      fontFamily: 'SimSun, Microsoft YaHei, sans-serif', fontSize: '27px', fontStyle: 'bold',
      color: '#fff5b7', backgroundColor: '#11200edb', padding: { x: 18, y: 12 }, align: 'center',
    }).setOrigin(.5).setDepth(10000).setVisible(false);
    ui('start').addEventListener('click', () => this.startMatch());
    ui('restart').addEventListener('click', () => this.startMatch());
    ui('pause').addEventListener('click', () => this.togglePause());
    ui('reference').addEventListener('click', () => this.toggleReference());
    ui('sound').addEventListener('click', () => { soundOn = !soundOn; ui('sound').textContent = `声音：${soundOn ? '开' : '关'}`; });
    window.addEventListener('keydown', event => {
      if (waitingFor) {
        event.preventDefault(); bindings[waitingFor] = event.code;
        localStorage.setItem('bombman-keys', JSON.stringify(bindings)); waitingFor = null; drawKeys(); return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      if (event.repeat && event.code === bindings.bomb) return;
      pressed.add(event.code);
      if (event.code === bindings.bomb && !this.reference) this.match.placeBomb(0);
      if (event.code === 'KeyP') this.togglePause();
      if (event.code === 'F2') { event.preventDefault(); this.toggleReference(); }
    });
    window.addEventListener('keyup', event => pressed.delete(event.code));
    window.addEventListener('blur', () => pressed.clear());
    this.renderAll(0);
  }

  private startMatch() {
    this.match = new Match(); this.match.start(); this.reference = false;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (this.solids[y][x]) this.solids[y][x].visible = this.match.tile(x, y) !== 'floor';
    }
    this.screenText.setVisible(false); ui('reference').classList.remove('active');
  }
  private toggleReference() {
    this.reference = !this.reference;
    ui('reference').classList.toggle('active', this.reference);
    this.screenText.setVisible(false);
    if (!this.reference && this.match.phase === 'ready') this.startMatch();
  }
  private togglePause() {
    if (this.reference) return;
    this.match.pause(); this.screenText.setText('暂停').setVisible(this.match.phase === 'paused');
  }
  private image(x: number, y: number, name: string, depth: number, originY = 0) {
    const image = this.add.image(x, y, name).setOrigin(0, originY).setDepth(depth);
    this.dynamicObjects.push(image); return image;
  }
  private actor(actor: Actor, time: number) {
    if (!actor.alive) return;
    const frame = actor.walking && Math.floor(time / 145) % 2 ? 1 : 0;
    const footY = BOARD_Y + actor.y + 20;
    const scale = 1.15;
    this.image(BOARD_X + actor.x - 20 * scale, footY, `person-${actor.id}-${actor.dir}-${frame}`, footY + 2, 1).setScale(scale);
  }
  private fire(flame: Flame, time: number) {
    const y = BOARD_Y + flame.y * TILE;
    this.image(BOARD_X + flame.x * TILE, y, `fire-${flame.kind}-${Math.floor(time / 85) % 2}`, y + 37);
  }
  private renderAll(time: number) {
    for (const object of this.dynamicObjects) object.destroy();
    this.dynamicObjects = [];
    const reference = this.reference;
    const flames = reference ? referenceFlames : this.match.flames;
    for (const flame of flames) this.fire(flame, time);
    const items: Array<{ x: number; y: number; kind: ItemKind | 'skull' }> = reference
      ? [{ x: 11, y: 5, kind: 'skull' }, { x: 5, y: 7, kind: 'flame' }] : this.match.items;
    for (const item of items) {
      const y = BOARD_Y + item.y * TILE;
      this.image(BOARD_X + item.x * TILE, y, `item-${item.kind}`, y + 39);
    }
    const bombs = reference ? referenceBombs : this.match.bombs.map(b => ({ x: b.x, y: b.y, color: b.owner === 0 ? 'blue' : b.owner === 2 ? 'red' : 'black' }));
    for (const bomb of bombs) {
      const y = BOARD_Y + bomb.y * TILE;
      this.image(BOARD_X + bomb.x * TILE, y, `bomb-${bomb.color}-${Math.floor(time / 130) % 2}`, y + 39);
    }
    const actors = reference ? this.match.actors.map((actor, id) => ({ ...actor,
      x: [140, 460, 140, 540][id], y: [60, 140, 350, 300][id],
      dir: (id === 0 ? 'down' : 'up') as Direction,
    })) : this.match.actors;
    for (const actor of actors) this.actor(actor, time);
    if (!reference) for (const effect of this.match.effects) {
      const x = BOARD_X + effect.x * TILE + 20, y = BOARD_Y + effect.y * TILE + 20;
      const left = (effect.until - this.match.now) / (effect.kind === 'death' ? 600 : 350);
      const color = effect.kind === 'brick' ? 0xe8cc9c : effect.kind === 'pickup' ? 0xffef49 : 0xdd442d;
      for (let p = 0; p < 5; p++) {
        const angle = p * Math.PI * 2 / 5;
        const square = this.add.rectangle(x + Math.cos(angle) * (1 - left) * 18, y + Math.sin(angle) * (1 - left) * 18, 3, 3, color, Math.max(0, left)).setDepth(y + 50);
        this.dynamicObjects.push(square);
      }
    }
  }
  update(time: number, delta: number) {
    if (!this.reference && this.match.phase === 'playing') {
      this.match.step(delta, directionFromKeys());
      for (const event of new Set(this.match.events)) tone(event);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (this.solids[y][x] && this.match.tile(x, y) === 'floor') this.solids[y][x].visible = false;
      }
      if (this.match.events.includes('end')) {
        const result = this.match.winner === 0 ? '胜利！' : this.match.winner === null ? '平局' : '失败';
        this.screenText.setText(`${result}\n按「重新开局」再战`).setVisible(true);
      }
    }
    this.renderAll(time);
    const text = this.reference ? '参考画面对照 · F2 切换' : this.match.phase === 'playing'
      ? `剩余 ${Math.max(0, Math.ceil(this.match.remaining / 1000))} 秒 · ${this.match.actors.filter(a => a.alive).length} 人存活 · 火力 ${this.match.actors[0].power} · 炸弹 ${this.match.actors[0].bombsMax}`
      : this.match.phase === 'paused' ? '已暂停' : this.match.phase === 'finished' ? '本局结束' : '准备开始';
    if (text !== this.lastStatus) { ui('status').textContent = text; this.lastStatus = text; }
  }
}

new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', width: 763, height: 580, backgroundColor: '#000000',
  pixelArt: true, antialias: false, roundPixels: true,
  scale: { mode: Phaser.Scale.NONE },
  scene: GameScene,
});
