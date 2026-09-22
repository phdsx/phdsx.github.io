const canvas = document.querySelector('#gameCanvas');
const ctx = canvas.getContext('2d');
const ui = {
  credits: document.querySelector('#credits'), baseHealth: document.querySelector('#baseHealth'), enemyHealth: document.querySelector('#enemyHealth'),
  status: document.querySelector('#statusLine'), toast: document.querySelector('#toast'), intro: document.querySelector('#introOverlay'), end: document.querySelector('#endOverlay'),
  endTitle: document.querySelector('#endTitle'), endText: document.querySelector('#endText'), endEyebrow: document.querySelector('#endEyebrow'), pause: document.querySelector('#pauseButton')
};

const WORLD = { width: 960, height: 600 };
const UNIT_TYPES = {
  scout: { label: '侦察车', cost: 120, hp: 62, speed: 76, range: 105, sight: 170, damage: 9, reload: .48, radius: 12, color: '#82f1ce' },
  tank: { label: '主战坦克', cost: 220, hp: 138, speed: 44, range: 135, sight: 205, damage: 24, reload: 1.18, radius: 16, color: '#42c99e' },
  harvester: { label: '采矿车', cost: 300, hp: 115, speed: 35, range: 0, sight: 0, damage: 0, reload: 0, radius: 17, color: '#f3c969' }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

class FrontlineGame {
  constructor() {
    this.pointer = { down: false, start: null, current: null };
    this.running = false;
    this.paused = false;
    this.ended = false;
    this.lastTime = 0;
    this.toastTimer = 0;
    this.bindEvents();
    this.reset();
    this.draw();
  }

  reset() {
    this.credits = 800;
    this.elapsed = 0;
    this.nextEnemySpawn = 5.5;
    this.units = [];
    this.shots = [];
    this.selected = new Set();
    this.playerBase = { kind: 'base', faction: 'player', x: 105, y: 306, hp: 900, maxHp: 900, radius: 47 };
    this.enemyBase = { kind: 'base', faction: 'enemy', x: 855, y: 294, hp: 960, maxHp: 960, radius: 47 };
    this.crystals = [
      { x: 300, y: 135, amount: 720 }, { x: 348, y: 164, amount: 600 }, { x: 468, y: 476, amount: 760 },
      { x: 523, y: 446, amount: 620 }, { x: 662, y: 118, amount: 560 }
    ];
    this.spawn('player', 'scout', 168, 270);
    this.spawn('player', 'tank', 170, 324);
    this.spawn('player', 'harvester', 145, 375);
    this.spawn('enemy', 'scout', 794, 265);
    this.spawn('enemy', 'tank', 790, 326);
    this.updateUi();
    ui.status.textContent = '等待部署。';
  }

  spawn(faction, type, x, y) {
    const stats = UNIT_TYPES[type];
    const unit = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), kind: 'unit', faction, type, x, y,
      hp: stats.hp, maxHp: stats.hp, radius: stats.radius, cooldown: Math.random() * stats.reload, target: null, destination: null,
      angle: faction === 'player' ? 0 : Math.PI, cargo: 0, harvestTarget: null, harvestTimer: 0, flash: 0
    };
    this.units.push(unit);
    return unit;
  }

  start() {
    this.reset();
    this.running = true;
    this.paused = false;
    this.ended = false;
    ui.intro.hidden = true;
    ui.end.hidden = true;
    ui.pause.textContent = '暂停';
    ui.status.textContent = '任务开始：摧毁东侧敌方指挥部。';
    this.lastTime = performance.now();
    requestAnimationFrame((time) => this.loop(time));
  }

  bindEvents() {
    document.querySelector('#startButton').addEventListener('click', () => this.start());
    document.querySelector('#restartButton').addEventListener('click', () => this.start());
    ui.pause.addEventListener('click', () => this.togglePause());
    document.querySelector('#selectAllButton').addEventListener('click', () => {
      this.selected = new Set(this.units.filter((u) => u.faction === 'player' && u.type !== 'harvester').map((u) => u.id));
      this.reportSelection();
    });
    document.querySelector('#stopButton').addEventListener('click', () => {
      this.selectedUnits().forEach((unit) => { unit.destination = null; unit.target = null; });
      ui.status.textContent = '所选部队已停止。';
    });
    document.querySelectorAll('[data-build]').forEach((button) => button.addEventListener('click', () => this.build(button.dataset.build)));
    canvas.addEventListener('pointerdown', (event) => this.pointerDown(event));
    canvas.addEventListener('pointermove', (event) => this.pointerMove(event));
    canvas.addEventListener('pointerup', (event) => this.pointerUp(event));
    canvas.addEventListener('pointercancel', () => { this.pointer.down = false; });
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') { event.preventDefault(); this.togglePause(); }
      if (event.key === 'Escape') { this.selected.clear(); this.reportSelection(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') { event.preventDefault(); document.querySelector('#selectAllButton').click(); }
    });
  }

  build(type) {
    if (!this.running || this.paused || this.ended) return;
    const stats = UNIT_TYPES[type];
    if (this.credits < stats.cost) { this.showToast('资金不足'); return; }
    if (this.units.filter((unit) => unit.faction === 'player').length >= 18) { this.showToast('部队已达上限'); return; }
    this.credits -= stats.cost;
    const index = this.units.filter((unit) => unit.faction === 'player').length;
    const unit = this.spawn('player', type, this.playerBase.x + 60 + (index % 3) * 22, this.playerBase.y - 42 + (index % 5) * 22);
    unit.destination = { x: 220 + (index % 4) * 25, y: 235 + (index % 6) * 28 };
    this.updateUi();
    ui.status.textContent = `${stats.label}已出厂。`;
  }

  togglePause() {
    if (!this.running || this.ended) return;
    this.paused = !this.paused;
    ui.pause.textContent = this.paused ? '继续' : '暂停';
    ui.status.textContent = this.paused ? '战术暂停。' : '作战继续。';
    if (!this.paused) { this.lastTime = performance.now(); requestAnimationFrame((time) => this.loop(time)); }
  }

  pointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * WORLD.width / rect.width, y: (event.clientY - rect.top) * WORLD.height / rect.height };
  }

  pointerDown(event) {
    if (!this.running || this.paused || this.ended) return;
    canvas.setPointerCapture?.(event.pointerId);
    const point = this.pointFromEvent(event);
    this.pointer = { down: true, start: point, current: point };
  }

  pointerMove(event) {
    if (this.pointer.down) this.pointer.current = this.pointFromEvent(event);
  }

  pointerUp(event) {
    if (!this.pointer.down) return;
    const point = this.pointFromEvent(event);
    const start = this.pointer.start;
    this.pointer.down = false;
    const drag = Math.hypot(point.x - start.x, point.y - start.y) > 10;
    if (drag) {
      const left = Math.min(start.x, point.x), right = Math.max(start.x, point.x), top = Math.min(start.y, point.y), bottom = Math.max(start.y, point.y);
      this.selected = new Set(this.units.filter((unit) => unit.faction === 'player' && unit.x >= left && unit.x <= right && unit.y >= top && unit.y <= bottom).map((unit) => unit.id));
      this.reportSelection();
      return;
    }
    const friendly = [...this.units].reverse().find((unit) => unit.faction === 'player' && distance(unit, point) <= unit.radius + 9);
    if (friendly) {
      if (!event.shiftKey) this.selected.clear();
      this.selected.add(friendly.id);
      this.reportSelection();
      return;
    }
    const hostile = [...this.units, this.enemyBase].find((target) => target.faction === 'enemy' && target.hp > 0 && distance(target, point) <= target.radius + 10);
    const chosen = this.selectedUnits().filter((unit) => unit.type !== 'harvester');
    if (hostile && chosen.length) {
      chosen.forEach((unit) => { unit.target = hostile; unit.destination = null; });
      ui.status.textContent = `集中攻击${hostile.kind === 'base' ? '敌方指挥部' : UNIT_TYPES[hostile.type].label}。`;
      return;
    }
    if (this.selected.size) {
      this.moveFormation(point);
      ui.status.textContent = `移动 ${this.selected.size} 个单位。`;
    } else {
      ui.status.textContent = '请先选择我方单位。';
    }
  }

  moveFormation(point) {
    const units = this.selectedUnits();
    const columns = Math.ceil(Math.sqrt(units.length));
    units.forEach((unit, index) => {
      unit.target = null;
      unit.destination = { x: clamp(point.x + (index % columns - (columns - 1) / 2) * 32, 28, 932), y: clamp(point.y + (Math.floor(index / columns) - 1) * 30, 30, 570) };
      if (unit.type === 'harvester') unit.harvestTarget = null;
    });
  }

  selectedUnits() { return this.units.filter((unit) => this.selected.has(unit.id) && unit.hp > 0); }

  reportSelection() {
    const units = this.selectedUnits();
    if (!units.length) ui.status.textContent = '未选择单位。';
    else ui.status.textContent = `已选择 ${units.length} 个单位：${units.map((u) => UNIT_TYPES[u.type].label).join('、')}。`;
  }

  loop(time) {
    if (!this.running || this.paused || this.ended) return;
    const dt = Math.min((time - this.lastTime) / 1000, .04);
    this.lastTime = time;
    this.update(dt);
    this.draw();
    requestAnimationFrame((next) => this.loop(next));
  }

  update(dt) {
    this.elapsed += dt;
    if (this.elapsed >= this.nextEnemySpawn) {
      this.nextEnemySpawn += Math.max(5, 9 - this.elapsed / 80);
      const type = Math.random() < .58 ? 'scout' : 'tank';
      const unit = this.spawn('enemy', type, this.enemyBase.x - 62, this.enemyBase.y + (Math.random() - .5) * 90);
      unit.destination = { x: this.playerBase.x, y: this.playerBase.y };
      this.showToast('侦测到敌方增援');
    }
    this.units.forEach((unit) => this.updateUnit(unit, dt));
    this.resolveSeparation();
    this.units = this.units.filter((unit) => unit.hp > 0);
    this.selected.forEach((id) => { if (!this.units.some((unit) => unit.id === id)) this.selected.delete(id); });
    this.shots.forEach((shot) => { shot.life -= dt; });
    this.shots = this.shots.filter((shot) => shot.life > 0);
    this.updateUi();
    if (this.enemyBase.hp <= 0) this.finish(true);
    if (this.playerBase.hp <= 0) this.finish(false);
  }

  updateUnit(unit, dt) {
    const stats = UNIT_TYPES[unit.type];
    unit.cooldown -= dt;
    unit.flash = Math.max(0, unit.flash - dt);
    if (unit.type === 'harvester') { this.updateHarvester(unit, dt); return; }
    if (unit.target && unit.target.hp <= 0) unit.target = null;
    if (!unit.target) {
      const foes = this.units.filter((other) => other.faction !== unit.faction && other.type !== 'harvester' && distance(unit, other) <= stats.sight);
      const hostileBase = unit.faction === 'player' ? this.enemyBase : this.playerBase;
      if (distance(unit, hostileBase) <= stats.sight) foes.push(hostileBase);
      foes.sort((a, b) => distance(unit, a) - distance(unit, b));
      unit.target = foes[0] || null;
    }
    if (unit.target) {
      const gap = distance(unit, unit.target);
      unit.angle = Math.atan2(unit.target.y - unit.y, unit.target.x - unit.x);
      if (gap <= stats.range + unit.target.radius) {
        if (unit.cooldown <= 0) this.fire(unit, unit.target, stats);
      } else this.moveToward(unit, unit.target, stats.speed, dt);
    } else if (unit.destination) {
      if (distance(unit, unit.destination) < 5) unit.destination = null;
      else this.moveToward(unit, unit.destination, stats.speed, dt);
    } else if (unit.faction === 'enemy') {
      unit.destination = { x: this.playerBase.x, y: this.playerBase.y };
    }
  }

  updateHarvester(unit, dt) {
    if (unit.destination) {
      if (distance(unit, unit.destination) < 7) unit.destination = null;
      else this.moveToward(unit, unit.destination, UNIT_TYPES.harvester.speed, dt);
      return;
    }
    if (unit.faction !== 'player') return;
    if (unit.cargo >= 100) {
      if (distance(unit, this.playerBase) > this.playerBase.radius + 8) this.moveToward(unit, this.playerBase, UNIT_TYPES.harvester.speed, dt);
      else { this.credits += unit.cargo; this.showToast(`蓝晶入库 +${unit.cargo}`); unit.cargo = 0; unit.harvestTarget = null; }
      return;
    }
    if (!unit.harvestTarget || unit.harvestTarget.amount <= 0) {
      unit.harvestTarget = this.crystals.filter((crystal) => crystal.amount > 0).sort((a, b) => distance(unit, a) - distance(unit, b))[0] || null;
    }
    if (!unit.harvestTarget) return;
    if (distance(unit, unit.harvestTarget) > 27) this.moveToward(unit, unit.harvestTarget, UNIT_TYPES.harvester.speed, dt);
    else {
      unit.harvestTimer += dt;
      if (unit.harvestTimer >= .22) {
        unit.harvestTimer = 0;
        const mined = Math.min(5, unit.harvestTarget.amount, 100 - unit.cargo);
        unit.harvestTarget.amount -= mined;
        unit.cargo += mined;
      }
    }
  }

  moveToward(unit, target, speed, dt) {
    const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
    unit.angle = angle;
    unit.x = clamp(unit.x + Math.cos(angle) * speed * dt, 18, WORLD.width - 18);
    unit.y = clamp(unit.y + Math.sin(angle) * speed * dt, 20, WORLD.height - 20);
  }

  fire(unit, target, stats) {
    unit.cooldown = stats.reload;
    const damage = stats.damage * (.9 + Math.random() * .2);
    target.hp = Math.max(0, target.hp - damage);
    if (target.kind === 'unit') target.flash = .12;
    this.shots.push({ x1: unit.x + Math.cos(unit.angle) * unit.radius, y1: unit.y + Math.sin(unit.angle) * unit.radius, x2: target.x, y2: target.y, faction: unit.faction, life: .12 });
  }

  resolveSeparation() {
    for (let i = 0; i < this.units.length; i++) for (let j = i + 1; j < this.units.length; j++) {
      const a = this.units[i], b = this.units[j], gap = distance(a, b), min = a.radius + b.radius + 3;
      if (gap > 0 && gap < min) { const push = (min - gap) / 2, dx = (a.x - b.x) / gap, dy = (a.y - b.y) / gap; a.x += dx * push; a.y += dy * push; b.x -= dx * push; b.y -= dy * push; }
    }
  }

  finish(won) {
    this.ended = true;
    this.running = false;
    ui.end.hidden = false;
    ui.endEyebrow.textContent = won ? '任务完成' : '防线失守';
    ui.endTitle.textContent = won ? '胜利' : '战败';
    ui.endText.textContent = won ? `你在 ${Math.floor(this.elapsed)} 秒内摧毁了敌方指挥部，并保有 ${Math.floor(this.credits)} 资金。` : '我方指挥部被摧毁。优先保护采矿车，并用坦克组成正面防线。';
  }

  updateUi() {
    ui.credits.textContent = Math.floor(this.credits);
    ui.baseHealth.textContent = `${Math.ceil(100 * this.playerBase.hp / this.playerBase.maxHp)}%`;
    ui.enemyHealth.textContent = `${Math.ceil(100 * this.enemyBase.hp / this.enemyBase.maxHp)}%`;
    document.querySelectorAll('[data-build]').forEach((button) => { button.disabled = this.credits < UNIT_TYPES[button.dataset.build].cost || !this.running || this.paused; });
  }

  showToast(message) {
    ui.toast.textContent = message;
    ui.toast.classList.add('is-visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => ui.toast.classList.remove('is-visible'), 1500);
  }

  draw() {
    ctx.clearRect(0, 0, WORLD.width, WORLD.height);
    this.drawTerrain();
    this.crystals.forEach((crystal) => this.drawCrystal(crystal));
    this.drawBase(this.playerBase);
    this.drawBase(this.enemyBase);
    this.units.forEach((unit) => this.drawUnit(unit));
    this.shots.forEach((shot) => this.drawShot(shot));
    if (this.pointer.down && this.pointer.start && this.pointer.current) this.drawSelectionBox();
    this.drawMinimap();
  }

  drawTerrain() {
    const gradient = ctx.createLinearGradient(0, 0, 960, 600);
    gradient.addColorStop(0, '#18352d'); gradient.addColorStop(.55, '#172f29'); gradient.addColorStop(1, '#2f3026');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 960, 600);
    ctx.strokeStyle = 'rgba(143,205,183,.055)'; ctx.lineWidth = 1;
    for (let x = 0; x < 960; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke(); }
    for (let y = 0; y < 600; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(180,195,171,.18)'; ctx.lineWidth = 54; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(145, 304); ctx.bezierCurveTo(330, 245, 560, 368, 812, 294); ctx.stroke();
    ctx.strokeStyle = 'rgba(224,229,210,.12)'; ctx.lineWidth = 3; ctx.setLineDash([14, 18]); ctx.stroke(); ctx.setLineDash([]);
    [[410,115],[584,253],[265,485],[730,456]].forEach(([x,y], i) => { ctx.fillStyle = i % 2 ? '#263d34' : '#2c493d'; ctx.beginPath(); ctx.ellipse(x,y,48,22,.3,0,Math.PI*2); ctx.fill(); });
  }

  drawCrystal(crystal) {
    if (crystal.amount <= 0) return;
    const scale = .55 + crystal.amount / 1200;
    ctx.save(); ctx.translate(crystal.x, crystal.y); ctx.shadowColor = '#55b8ff'; ctx.shadowBlur = 18;
    for (let i = 0; i < 6; i++) { const angle = i * 1.05; const x = Math.cos(angle) * 15, y = Math.sin(angle) * 11; ctx.fillStyle = i % 2 ? '#65c3ff' : '#9edbff'; ctx.beginPath(); ctx.moveTo(x, y - 25 * scale); ctx.lineTo(x + 9 * scale, y + 8); ctx.lineTo(x, y + 14); ctx.lineTo(x - 8 * scale, y + 8); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }

  drawBase(base) {
    const player = base.faction === 'player';
    ctx.save(); ctx.translate(base.x, base.y); ctx.shadowColor = player ? '#63e6be' : '#ff6b6b'; ctx.shadowBlur = 16;
    ctx.fillStyle = player ? '#163f35' : '#492629'; ctx.strokeStyle = player ? '#63e6be' : '#ff7b72'; ctx.lineWidth = 4;
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4, r = i % 2 ? 43 : 50; const x = Math.cos(a)*r,y=Math.sin(a)*r; i?ctx.lineTo(x,y):ctx.moveTo(x,y); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = player ? '#8af5d5' : '#ffaaa3'; ctx.fillRect(-11,-31,22,46); ctx.fillRect(-26,-4,52,18); ctx.restore();
    this.drawHealthBar(base, 72, -61);
    ctx.fillStyle = '#e8f5ef'; ctx.font = '800 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(player ? '我方指挥部' : '敌方指挥部', base.x, base.y + 69);
  }

  drawUnit(unit) {
    const stats = UNIT_TYPES[unit.type], player = unit.faction === 'player';
    ctx.save(); ctx.translate(unit.x, unit.y); ctx.rotate(unit.angle); ctx.shadowColor = player ? '#63e6be' : '#ff6b6b'; ctx.shadowBlur = this.selected.has(unit.id) ? 15 : 5;
    if (this.selected.has(unit.id)) { ctx.strokeStyle = '#ffc857'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0,0,unit.radius+8,0,Math.PI*2); ctx.stroke(); }
    ctx.fillStyle = unit.flash ? '#fff' : (player ? stats.color : '#d95d57'); ctx.strokeStyle = player ? '#c9ffef' : '#ffc1bc'; ctx.lineWidth = 2;
    if (unit.type === 'scout') { ctx.fillRect(-13,-9,24,18); ctx.fillStyle='#0c1714'; ctx.fillRect(-9,-13,5,26); ctx.fillRect(5,-13,5,26); ctx.fillStyle=player?'#baffea':'#ffd0cc'; ctx.fillRect(4,-2,19,4); }
    else if (unit.type === 'tank') { ctx.beginPath(); ctx.roundRect(-17,-12,34,24,6); ctx.fill(); ctx.stroke(); ctx.fillStyle=player?'#1b6f59':'#7f2e2e'; ctx.beginPath(); ctx.arc(2,0,8,0,Math.PI*2); ctx.fill(); ctx.fillStyle=player?'#baffea':'#ffd0cc'; ctx.fillRect(3,-3,27,6); }
    else { ctx.beginPath(); ctx.roundRect(-18,-14,36,28,6); ctx.fill(); ctx.stroke(); ctx.fillStyle='#23342f'; ctx.fillRect(-11,-9,18,18); ctx.fillStyle='#65c3ff'; ctx.fillRect(9,-8,6,16); }
    ctx.restore();
    this.drawHealthBar(unit, unit.radius * 2 + 8, -unit.radius - 12);
    if (unit.type === 'harvester' && unit.cargo > 0) { ctx.fillStyle='#65c3ff'; ctx.font='800 9px system-ui'; ctx.textAlign='center'; ctx.fillText(`${unit.cargo}/100`,unit.x,unit.y+unit.radius+19); }
  }

  drawHealthBar(entity, width, offsetY) {
    const ratio = clamp(entity.hp / entity.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.58)'; ctx.fillRect(entity.x - width/2, entity.y + offsetY, width, 5);
    ctx.fillStyle = ratio > .5 ? '#65e4a7' : ratio > .25 ? '#ffc857' : '#ff6b6b'; ctx.fillRect(entity.x - width/2, entity.y + offsetY, width * ratio, 5);
  }

  drawShot(shot) {
    ctx.strokeStyle = shot.faction === 'player' ? '#cbfff0' : '#ff9a91'; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(shot.x1, shot.y1); ctx.lineTo(shot.x2, shot.y2); ctx.stroke(); ctx.shadowBlur = 0;
  }

  drawSelectionBox() {
    const a = this.pointer.start, b = this.pointer.current;
    ctx.fillStyle='rgba(255,200,87,.1)'; ctx.strokeStyle='#ffc857'; ctx.lineWidth=1; ctx.setLineDash([5,4]); ctx.fillRect(a.x,a.y,b.x-a.x,b.y-a.y); ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y); ctx.setLineDash([]);
  }

  drawMinimap() {
    const x=760,y=485,w=180,h=95;
    ctx.fillStyle='rgba(3,9,8,.78)'; ctx.fillRect(x,y,w,h); ctx.strokeStyle='rgba(184,228,210,.3)'; ctx.strokeRect(x,y,w,h);
    const dot=(entity,color,size=3)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x+entity.x/WORLD.width*w,y+entity.y/WORLD.height*h,size,0,Math.PI*2);ctx.fill();};
    dot(this.playerBase,'#63e6be',5); dot(this.enemyBase,'#ff6b6b',5); this.units.forEach((u)=>dot(u,u.faction==='player'?'#8af5d5':'#ff8e87',2));
  }
}

const game = new FrontlineGame();
window.addEventListener('resize', () => game.draw());
