(() => {
  'use strict';
  const games = {
    snake: {title:'贪吃蛇', subtitle:'吃到果实，避开边界和自己的尾巴。', help:'方向键 / WASD / 下方按钮控制。手机也可在画面上滑动。', kind:'arcade'},
    plane: {title:'飞机大战', subtitle:'驾驶战机躲避敌人，持续开火得分。', help:'方向键 / WASD 移动，空格开火；也可拖动画面中的战机。', kind:'arcade'},
    tank: {title:'坦克大战', subtitle:'守住基地，击退向你逼近的坦克。', help:'方向键 / WASD 移动，空格发射炮弹。', kind:'arcade'},
    birds: {title:'愤怒的小鸟', subtitle:'拉开弹弓，击倒右侧的目标。', help:'拖动弹弓上的小鸟，松手发射。三发之内击中全部目标。', kind:'arcade'},
    match: {title:'消消乐', subtitle:'交换宝石，连成三个或更多同色方块。', help:'依次点击两个相邻的宝石进行交换。20 步内取得 600 分。', kind:'puzzle'},
    stars: {title:'星图', subtitle:'按数字顺序连接星辰，绘出星座。', help:'依次点击编号星星；点错会重置当前连线。完成后可进入下一片星空。', kind:'puzzle'},
    difference: {title:'大家来找茬', subtitle:'观察左右两幅画，找出五处不同。', help:'点击任意一侧的不同之处。最多可以错点 8 次。', kind:'puzzle'}
  };
  const slug = document.body.dataset.game;
  const info = games[slug];
  if (!info) return;
  const root = document.querySelector('#classic-game');
  root.innerHTML = `<header class="classic-head"><div><a class="classic-back" href="../../../games.html?category=${info.kind}">← 返回游戏厅</a><h1>${info.title}</h1><p>${info.subtitle}</p></div></header><section class="classic-card" aria-label="${info.title}游戏区"><div class="classic-status"><div class="classic-stats"><span id="stat-one"></span><span id="stat-two"></span></div><div class="classic-actions"><button id="restart" type="button">重新开始</button><button id="pause" type="button">暂停</button></div></div><div class="classic-canvas-wrap"><canvas id="stage" width="960" height="640" aria-label="${info.title}画面"></canvas><div class="classic-overlay" id="overlay" hidden><strong id="overlay-title"></strong><span id="overlay-subtitle"></span></div></div><div class="classic-pad" id="pad" hidden><button data-key="ArrowLeft" aria-label="左">←</button><button data-key="ArrowUp" aria-label="上">↑</button><button data-key="ArrowDown" aria-label="下">↓</button><button data-key="ArrowRight" aria-label="右">→</button><button data-key="Space" aria-label="开火">●</button></div><p class="classic-help">${info.help}</p></section>`;
  const canvas = document.querySelector('#stage'), ctx = canvas.getContext('2d');
  const stat1 = document.querySelector('#stat-one'), stat2 = document.querySelector('#stat-two');
  const overlay = document.querySelector('#overlay'), overlayTitle = document.querySelector('#overlay-title'), overlaySubtitle = document.querySelector('#overlay-subtitle');
  const pauseButton = document.querySelector('#pause');
  const pad = document.querySelector('#pad');
  const W=960,H=640, rand=(a,b)=>a+Math.random()*(b-a), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let model, paused=false, ended=false, last=0, tick=0, held=new Set(), pointer=null;
  const modes={snake:snake(),plane:plane(),tank:tank(),birds:birds(),match:match(),stars:stars(),difference:difference()};
  function status(a,b){stat1.textContent=a;stat2.textContent=b}
  function finish(title,sub='点击「重新开始」再玩一局'){ended=true;overlayTitle.textContent=title;overlaySubtitle.textContent=sub;overlay.hidden=false}
  function background(top='#102c4a',bottom='#0a152b') {const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,bottom);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
  function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
  function circle(x,y,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
  function label(s,x,y,size=24,color='#fff',align='center'){ctx.fillStyle=color;ctx.font=`700 ${size}px system-ui`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(s,x,y)}
  function pos(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
  function reset(){model=modes[slug].init();paused=false;ended=false;overlay.hidden=true;pauseButton.textContent='暂停';held.clear();tick=0;last=0;render()}
  function render(){
    if (window.PHDSXClassic3D) {
      window.PHDSXClassic3D.draw(slug, model, tick);
      const s=model;
      if(slug==='snake')status(`得分 ${s.score}`,`长度 ${s.body.length}`);
      else if(slug==='plane')status(`得分 ${s.score}`,`生命 ${s.hp}`);
      else if(slug==='tank')status(`击毁得分 ${s.score}`,`基地耐久 ${s.base}`);
      else if(slug==='birds')status(`得分 ${s.score}`,`剩余小鸟 ${s.shots}`);
      else if(slug==='match')status(`得分 ${s.score} / 600`,`剩余 ${s.moves} 步`);
      else if(slug==='stars')status(`星图 ${s.level+1} / 3`,`下一颗 ${s.next+1} · 失误 ${s.mistakes}`);
      else if(slug==='difference')status(`找到 ${s.found.size} / 5`,`错点 ${s.miss} / 8`);
    } else modes[slug].draw(model);
  }
  function frame(now){if(!last)last=now;const dt=Math.min((now-last)/1000,.05);last=now;if(!paused&&!ended){tick+=dt;modes[slug].update?.(model,dt)}render();requestAnimationFrame(frame)}
  document.querySelector('#restart').addEventListener('click',reset);
  pauseButton.addEventListener('click',()=>{if(ended)return;paused=!paused;pauseButton.textContent=paused?'继续':'暂停';overlay.hidden=!paused;overlayTitle.textContent='已暂停';overlaySubtitle.textContent='点击「继续」返回游戏'});
  const keyMap={a:'ArrowLeft',d:'ArrowRight',w:'ArrowUp',s:'ArrowDown',' ':'Space'};
  function keyDown(key){held.add(key);if(!paused&&!ended)modes[slug].key?.(model,key)}
  window.addEventListener('keydown',e=>{const key=keyMap[e.key.toLowerCase()]||e.key;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(key)){e.preventDefault();if(!e.repeat)keyDown(key)}});
  window.addEventListener('keyup',e=>held.delete(keyMap[e.key.toLowerCase()]||e.key));
  window.addEventListener('blur',()=>held.clear());
  canvas.addEventListener('pointerdown',e=>{if(paused||ended)return;pointer=pos(e);canvas.setPointerCapture(e.pointerId);modes[slug].down?.(model,pointer)});
  canvas.addEventListener('pointermove',e=>{if(!pointer||paused||ended)return;modes[slug].move?.(model,pos(e))});
  canvas.addEventListener('pointerup',e=>{if(!pointer||paused||ended)return;const p=pos(e);modes[slug].up?.(model,p,pointer);pointer=null});
  pad.querySelectorAll('button').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();keyDown(b.dataset.key)});for(const event of ['pointerup','pointercancel','pointerleave'])b.addEventListener(event,()=>held.delete(b.dataset.key))});
  if(['snake','plane','tank'].includes(slug)){pad.hidden=false;if(slug==='snake')pad.querySelector('[data-key="Space"]').hidden=true}

  function snake(){
    const cols=24,rows=16,cw=40;
    const nextFood=s=>{let p;do{p={x:Math.floor(rand(0,cols)),y:Math.floor(rand(0,rows))}}while(s.body.some(q=>q.x===p.x&&q.y===p.y));return p};
    return {init(){const s={body:[{x:8,y:8},{x:7,y:8},{x:6,y:8}],dir:{x:1,y:0},next:{x:1,y:0},score:0,acc:0};s.food=nextFood(s);return s},key(s,k){const d={ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1}}[k];if(d&&!(d.x===-s.dir.x&&d.y===-s.dir.y))s.next=d},up(s,p,start){const dx=p.x-start.x,dy=p.y-start.y;if(Math.hypot(dx,dy)<22)return;this.key(s,Math.abs(dx)>Math.abs(dy)?dx>0?'ArrowRight':'ArrowLeft':dy>0?'ArrowDown':'ArrowUp')},update(s,dt){s.acc+=dt;if(s.acc<Math.max(.075,.17-s.score*.002))return;s.acc=0;s.dir=s.next;const n={x:s.body[0].x+s.dir.x,y:s.body[0].y+s.dir.y},eat=n.x===s.food.x&&n.y===s.food.y;if(n.x<0||n.x>=cols||n.y<0||n.y>=rows||s.body.slice(0,eat?undefined:-1).some(q=>q.x===n.x&&q.y===n.y)){finish('游戏结束');return}s.body.unshift(n);if(eat){s.score+=10;if(s.body.length===cols*rows){finish('全图通关！');return}s.food=nextFood(s)}else s.body.pop()},draw(s){background('#143252','#071827');for(let x=0;x<cols;x++)for(let y=0;y<rows;y++)if((x+y)%2===0)rounded(x*cw+1,y*cw+1,cw-2,cw-2,5,'#ffffff08');circle(s.food.x*cw+20,s.food.y*cw+20,15,'#fb7185');circle(s.food.x*cw+25,s.food.y*cw+15,4,'#fff8');s.body.forEach((p,i)=>rounded(p.x*cw+3,p.y*cw+3,34,34,9,i?'#45c99a':'#9af3c9'));status(`得分 ${s.score}`,`长度 ${s.body.length}`)}}
  }
  function plane(){
    return {init(){return {x:480,y:550,shots:[],enemies:[],score:0,hp:3,spawn:0,fire:0,inv:0,stars:Array.from({length:55},()=>({x:rand(0,W),y:rand(0,H),r:rand(1,3)}))}},key(s,k){if(k==='Space')this.shoot(s)},shoot(s){if(s.fire<=0){s.shots.push({x:s.x,y:s.y-28});s.fire=.18}},move(s,p){s.x=clamp(p.x,25,W-25);s.y=clamp(p.y,50,H-25);this.shoot(s)},down(s,p){this.move(s,p)},update(s,dt){const speed=320;if(held.has('ArrowLeft'))s.x-=speed*dt;if(held.has('ArrowRight'))s.x+=speed*dt;if(held.has('ArrowUp'))s.y-=speed*dt;if(held.has('ArrowDown'))s.y+=speed*dt;s.x=clamp(s.x,25,W-25);s.y=clamp(s.y,50,H-25);s.fire-=dt;s.inv-=dt;if(held.has('Space'))this.shoot(s);s.spawn-=dt;if(s.spawn<=0){s.enemies.push({x:rand(38,W-38),y:-30,r:rand(18,28),speed:rand(95,160)+s.score*.3});s.spawn=Math.max(.35,.85-s.score*.001)}s.shots.forEach(b=>b.y-=590*dt);s.enemies.forEach(e=>e.y+=e.speed*dt);for(const e of s.enemies)for(const b of s.shots)if(Math.hypot(e.x-b.x,e.y-b.y)<e.r+7){e.dead=b.dead=true;s.score+=10}for(const e of s.enemies)if(!e.dead&&Math.hypot(e.x-s.x,e.y-s.y)<e.r+22&&s.inv<=0){e.dead=true;s.hp--;s.inv=1.2;if(s.hp<=0)finish('战机坠毁')}s.shots=s.shots.filter(b=>!b.dead&&b.y>-10);s.enemies=s.enemies.filter(e=>!e.dead&&e.y<H+35)},draw(s){background('#102948','#090f29');s.stars.forEach(a=>{circle(a.x,a.y,a.r,'#9ac6fb88')});s.shots.forEach(b=>rounded(b.x-3,b.y-14,6,23,3,'#fef08a'));s.enemies.forEach(e=>{ctx.fillStyle='#fb7185';ctx.beginPath();ctx.moveTo(e.x,e.y+e.r);ctx.lineTo(e.x-e.r,e.y-e.r);ctx.lineTo(e.x+e.r,e.y-e.r);ctx.fill();circle(e.x,e.y-4,5,'#fee2e2')});if(s.inv<=0||Math.floor(tick*12)%2===0){ctx.fillStyle='#50d5eb';ctx.beginPath();ctx.moveTo(s.x,s.y-29);ctx.lineTo(s.x-26,s.y+25);ctx.lineTo(s.x,s.y+13);ctx.lineTo(s.x+26,s.y+25);ctx.fill();circle(s.x,s.y-3,7,'#efffff')}status(`得分 ${s.score}`,`生命 ${s.hp}`)}}
  }
  function tank(){
    const walls=[{x:185,y:120,w:95,h:45},{x:410,y:90,w:140,h:45},{x:665,y:165,w:110,h:45},{x:130,y:360,w:110,h:45},{x:395,y:330,w:160,h:42},{x:695,y:390,w:95,h:45}];
    function hitWall(x,y,r=16){return walls.some(w=>x+r>w.x&&x-r<w.x+w.w&&y+r>w.y&&y-r<w.y+w.h)}
    return {init(){return {x:480,y:550,dir:{x:0,y:-1},bullets:[],enemies:[],score:0,base:5,spawn:1,fire:0}},key(s,k){if(k==='Space')this.shoot(s)},shoot(s){if(s.fire>0)return;s.bullets.push({x:s.x+s.dir.x*24,y:s.y+s.dir.y*24,vx:s.dir.x*410,vy:s.dir.y*410,own:true});s.fire=.3},update(s,dt){s.fire-=dt;const dirs=[['ArrowLeft',-1,0],['ArrowRight',1,0],['ArrowUp',0,-1],['ArrowDown',0,1]];for(const [key,x,y] of dirs)if(held.has(key)){s.dir={x,y};const nx=clamp(s.x+x*185*dt,25,W-25),ny=clamp(s.y+y*185*dt,25,H-25);if(!hitWall(nx,ny,19)){s.x=nx;s.y=ny}break}if(held.has('Space'))this.shoot(s);s.spawn-=dt;if(s.spawn<=0){s.enemies.push({x:rand(40,920),y:28,hp:2,fire:rand(1,2),dx:Math.random()<.5?-1:1});s.spawn=Math.max(.8,2.1-s.score*.008)}for(const e of s.enemies){e.y+=52*dt;e.x+=e.dx*25*dt;if(e.x<30||e.x>930)e.dx*=-1;e.fire-=dt;if(e.fire<=0){s.bullets.push({x:e.x,y:e.y+20,vx:0,vy:220,own:false});e.fire=rand(1.4,2.6)}if(e.y>H+25){e.dead=true;s.base--}}for(const b of s.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;if(hitWall(b.x,b.y,5)){b.dead=true;continue}if(b.own){for(const e of s.enemies)if(!e.dead&&Math.hypot(b.x-e.x,b.y-e.y)<24){b.dead=true;e.hp--;if(e.hp<=0){e.dead=true;s.score+=20}break}}else if(Math.hypot(b.x-s.x,b.y-s.y)<22){b.dead=true;s.base--}}s.bullets=s.bullets.filter(b=>!b.dead&&b.y>-10&&b.y<H+10&&b.x>-10&&b.x<W+10);s.enemies=s.enemies.filter(e=>!e.dead);if(s.base<=0)finish('基地失守')},draw(s){background('#254533','#132a2b');for(let x=0;x<W;x+=48)for(let y=0;y<H;y+=48)if((x+y)%96===0)rounded(x+3,y+3,42,42,5,'#ffffff07');walls.forEach(w=>{rounded(w.x,w.y,w.w,w.h,5,'#a37254');for(let x=w.x+4;x<w.x+w.w-20;x+=28)ctx.fillRect(x,w.y+21,20,3)});s.bullets.forEach(b=>circle(b.x,b.y,6,b.own?'#f7d46a':'#fb7185'));function drawTank(x,y,color,angle){ctx.save();ctx.translate(x,y);ctx.rotate(angle);rounded(-19,-20,38,40,6,color);rounded(-6,-32,12,28,3,'#d5e6d0');circle(0,0,12,'#314a3b');ctx.restore()}s.enemies.forEach(e=>drawTank(e.x,e.y,'#f97373',Math.PI));drawTank(s.x,s.y,'#7ee787',Math.atan2(s.dir.y,s.dir.x)+Math.PI/2);status(`击毁得分 ${s.score}`,`基地耐久 ${s.base}`)}}
  }
  function birds(){
    const targets=[{x:700,y:531},{x:770,y:531},{x:735,y:461}];
    return {init(){return {shots:3,targets:targets.map(t=>({...t,hit:false})),bird:null,drag:null,score:0}},down(s,p){if(s.bird)return;if(Math.hypot(p.x-180,p.y-490)<85)s.drag={x:clamp(p.x,80,250),y:clamp(p.y,390,550)}},move(s,p){if(s.drag)s.drag={x:clamp(p.x,80,250),y:clamp(p.y,390,550)}},up(s,p){if(!s.drag)return;const dx=180-s.drag.x,dy=490-s.drag.y;s.drag=null;if(Math.hypot(dx,dy)<12)return;s.bird={x:180,y:490,vx:dx*4.2,vy:dy*5.5,r:20};s.shots--},update(s,dt){const b=s.bird;if(!b)return;b.x+=b.vx*dt;b.y+=b.vy*dt;b.vy+=460*dt;for(const t of s.targets)if(!t.hit&&Math.hypot(b.x-t.x,b.y-t.y)<46){t.hit=true;s.score+=100;b.vx*=.65;b.vy=-130}if(s.targets.every(t=>t.hit)){finish('全部击倒！');return}if(b.x>W+30||b.y>H+20||b.x<-30){s.bird=null;if(!s.shots)finish('弹弓用尽')}},draw(s){background('#91caee','#c1e4e8');circle(820,105,55,'#fff4b9');rounded(0,560,W,80,0,'#78b45a');rounded(650,550,190,20,3,'#846342');rounded(715,466,42,91,5,'#9b7046');rounded(665,538,150,16,4,'#bb8a50');for(const t of s.targets)if(!t.hit){circle(t.x,t.y,27,'#87ca57');circle(t.x-9,t.y-5,4,'#173526');circle(t.x+9,t.y-5,4,'#173526');circle(t.x,t.y+9,5,'#456d36')}rounded(160,465,14,115,5,'#704635');rounded(199,455,14,125,5,'#704635');ctx.strokeStyle='#513025';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(167,472);ctx.lineTo(s.drag?.x??180,s.drag?.y??490);ctx.lineTo(206,465);ctx.stroke();const b=s.bird||s.drag||(!s.shots?null:{x:180,y:490});if(b){circle(b.x,b.y,20,'#eb4e4e');circle(b.x+6,b.y-4,4,'#fff');circle(b.x+7,b.y-4,2,'#17212f');ctx.fillStyle='#f9be51';ctx.beginPath();ctx.moveTo(b.x+17,b.y+2);ctx.lineTo(b.x+33,b.y+7);ctx.lineTo(b.x+17,b.y+12);ctx.fill()}status(`得分 ${s.score}`,`剩余小鸟 ${s.shots}`)}}
  }
  function match(){
    const n=8,colors=['#ed275d','#35bfff','#ffc92f','#62db24','#ac53e8','#ff8a22'],size=67,x0=212,y0=54;
    const copy=board=>board.map(row=>row.slice());
    const find=board=>{const out=new Set();for(let y=0;y<n;y++)for(let x=0;x<n;x++){const c=board[y][x];if(c<0)continue;if(x<=n-3&&c===board[y][x+1]&&c===board[y][x+2]){let k=x;while(k<n&&board[y][k]===c)out.add(`${k++},${y}`)}if(y<=n-3&&c===board[y+1][x]&&c===board[y+2][x]){let k=y;while(k<n&&board[k][x]===c)out.add(`${x},${k++}`)}}return out};
    function fall(board){
      const after=Array.from({length:n},()=>Array(n).fill(-1)),pieces=[];
      for(let x=0;x<n;x++){
        let target=n-1;
        for(let y=n-1;y>=0;y--)if(board[y][x]>=0){after[target][x]=board[y][x];pieces.push({x,fromY:y,toY:target,color:board[y][x]});target--}
        for(let y=target;y>=0;y--){const color=Math.floor(rand(0,colors.length));after[y][x]=color;pieces.push({x,fromY:y-target-1,toY:y,color})}
      }
      return {after,pieces};
    }
    function stagesForSwap(board,a,b){
      const swapped=copy(board);
      [swapped[a.y][a.x],swapped[b.y][b.x]]=[swapped[b.y][b.x],swapped[a.y][a.x]];
      const stages=[{type:'swap',duration:.26,before:board,after:swapped,a,b}];
      let work=swapped,valid=false;
      for(let loop=0;loop<20;loop++){
        const cells=find(work);if(!cells.size)break;valid=true;
        const cleared=copy(work);
        for(const key of cells){const [x,y]=key.split(',').map(Number);cleared[y][x]=-1}
        stages.push({type:'clear',duration:.24,before:work,after:cleared,cells:[...cells],points:cells.size*10});
        const dropped=fall(cleared);
        stages.push({type:'fall',duration:.38,before:cleared,after:dropped.after,pieces:dropped.pieces});
        work=dropped.after;
      }
      if(!valid)stages.push({type:'swap',duration:.22,before:swapped,after:board,a,b});
      return {stages,valid};
    }
    const ease=t=>1-Math.pow(1-t,3);
    function visualPieces(s){
      const stage=s.animation,p=stage?Math.min(stage.elapsed/stage.duration,1):0,items=[];
      if(stage?.type==='fall')for(const piece of stage.pieces)items.push({x:piece.x,y:piece.fromY+(piece.toY-piece.fromY)*ease(p),color:piece.color,scale:1});
      else{
        const board=stage?.before||s.board;
        for(let y=0;y<n;y++)for(let x=0;x<n;x++){
          const color=board[y][x];if(color<0)continue;
          let px=x,py=y,scale=1;
          if(stage?.type==='swap'){
            if(x===stage.a.x&&y===stage.a.y){px=x+(stage.b.x-x)*ease(p);py=y+(stage.b.y-y)*ease(p)}
            if(x===stage.b.x&&y===stage.b.y){px=x+(stage.a.x-x)*ease(p);py=y+(stage.a.y-y)*ease(p)}
            if((x===stage.a.x&&y===stage.a.y)||(x===stage.b.x&&y===stage.b.y))scale=1+.12*Math.sin(Math.PI*p);
          }else if(stage?.type==='clear'&&stage.cells.includes(`${x},${y}`))scale=1+.2*Math.sin(Math.PI*p)-ease(p);
          items.push({x:px,y:py,color,scale:Math.max(0,scale)});
        }
      }
      return items;
    }
    return {
      init(){const s={board:Array.from({length:n},()=>Array.from({length:n},()=>Math.floor(rand(0,colors.length)))),selected:null,moves:20,score:0,animation:null,queue:[],pendingResult:false};for(let i=0;i<20;i++){const cells=find(s.board);if(!cells.size)break;const cleared=copy(s.board);for(const key of cells){const [x,y]=key.split(',').map(Number);cleared[y][x]=-1}s.board=fall(cleared).after}return s},
      up(s,p){if(s.animation)return;const x=Math.floor((p.x-x0)/size),y=Math.floor((p.y-y0)/size);if(x<0||x>=n||y<0||y>=n)return;if(!s.selected){s.selected={x,y};return}const a=s.selected;s.selected=null;if(Math.abs(a.x-x)+Math.abs(a.y-y)!==1)return;const result=stagesForSwap(copy(s.board),a,{x,y});s.queue=result.stages;s.animation=s.queue.shift();s.animation.elapsed=0;s.pendingResult=result.valid;if(result.valid)s.moves--},
      update(s,dt){if(!s.animation)return;s.animation.elapsed+=dt;if(s.animation.elapsed<s.animation.duration)return;const stage=s.animation;s.board=stage.after;if(stage.points)s.score+=stage.points;s.animation=s.queue.shift()||null;if(s.animation)s.animation.elapsed=0;else if(s.pendingResult){s.pendingResult=false;if(s.score>=600)finish('挑战成功！');else if(!s.moves)finish('步数用尽')}},
      draw(s){background('#2a2459','#15182c');rounded(x0-18,y0-18,n*size+36,n*size+36,20,'#ffffff22');for(let y=0;y<n;y++)for(let x=0;x<n;x++)rounded(x0+x*size+3,y0+y*size+3,size-6,size-6,13,'#0e193c');for(const gem of visualPieces(s)){const px=x0+(gem.x+.5)*size,py=y0+(gem.y+.5)*size,r=24*gem.scale;if(r<1)continue;ctx.save();ctx.translate(px,py);ctx.fillStyle=colors[gem.color];ctx.beginPath();for(let i=0;i<8;i++){const a=Math.PI*i/4,rr=i%2?r*.84:r;const gx=Math.cos(a)*rr,gy=Math.sin(a)*rr;if(i)ctx.lineTo(gx,gy);else ctx.moveTo(gx,gy)}ctx.closePath();ctx.fill();ctx.strokeStyle='#ffffff99';ctx.lineWidth=2;ctx.stroke();ctx.restore()}if(s.selected){const px=x0+(s.selected.x+.5)*size,py=y0+(s.selected.y+.5)*size;ctx.strokeStyle='#ffe6a0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(px,py,29+Math.sin(tick*7)*2,0,Math.PI*2);ctx.stroke()}status(`得分 ${s.score} / 600`,`剩余 ${s.moves} 步`)}
    };
  }
  function stars(){
    const layouts=[[[130,355],[230,180],[390,260],[535,115],[675,220],[810,100]],[[130,155],[260,300],[370,130],[495,420],[655,250],[785,430],[850,150]],[[115,340],[230,110],[360,460],[490,200],[620,430],[720,130],[830,320]]];
    return {init(){return {level:0,next:0,points:layouts[0],mistakes:0}},up(s,p){const i=s.points.findIndex(q=>Math.hypot(q[0]-p.x,q[1]-p.y)<30);if(i<0)return;if(i===s.next){s.next++;if(s.next===s.points.length){if(s.level===layouts.length-1){finish('星图完成！');return}s.level++;s.points=layouts[s.level];s.next=0}}else{s.mistakes++;s.next=0}},draw(s){background('#142c5a','#090f2d');for(let i=0;i<90;i++){const x=(i*173+81)%W,y=(i*293+55)%H;circle(x,y,i%6===0?2:1,'#a9d8fa90')}ctx.strokeStyle='#f5d076';ctx.lineWidth=4;ctx.beginPath();s.points.slice(0,s.next).forEach((p,i)=>{if(i===0)ctx.moveTo(...p);else ctx.lineTo(...p)});ctx.stroke();s.points.forEach((p,i)=>{circle(p[0],p[1],i<s.next?21:17,i<s.next?'#f4c96a':'#9bc7f9');circle(p[0],p[1],6,'#fff');label(String(i+1),p[0],p[1]-38,19)});status(`星图 ${s.level+1} / ${layouts.length}`,`下一颗 ${s.next+1} · 失误 ${s.mistakes}`)}}
  }
  function difference(){
    const differences=[{x:95,y:110,r:24},{x:250,y:320,r:28},{x:104,y:402,r:23},{x:350,y:480,r:25},{x:276,y:445,r:25}];
    function scene(x,variant){ctx.save();ctx.translate(x,0);rounded(10,26,455,570,12,'#b7e4ef');circle(92,111,36,variant?'#f1b765':'#fff2aa');rounded(10,418,455,178,0,'#75ad72');ctx.fillStyle='#486f67';ctx.beginPath();ctx.moveTo(30,420);ctx.lineTo(175,210);ctx.lineTo(310,420);ctx.fill();ctx.fillStyle='#62877c';ctx.beginPath();ctx.moveTo(205,420);ctx.lineTo(365,172);ctx.lineTo(465,420);ctx.fill();rounded(175,352,210,145,6,'#f3dab1');ctx.fillStyle=variant?'#a25e74':'#b85753';ctx.beginPath();ctx.moveTo(156,354);ctx.lineTo(280,265);ctx.lineTo(402,354);ctx.fill();rounded(256,408,46,89,4,variant?'#7cb9d0':'#775f57');rounded(206,382,37,35,3,variant?'#f4d976':'#9dd4ee');rounded(324,378,37,35,3,'#9dd4ee');rounded(76,410,15,102,3,'#70563d');circle(84,399,53,variant?'#d79b50':'#55a267');rounded(335,479,70,15,4,variant?'#ec82a3':'#d6a258');ctx.restore()}
    return {init(){return {found:new Set(),miss:0}},up(s,p){const side=p.x>=480?1:0,x=p.x-side*480;let found=-1;differences.forEach((d,i)=>{if(Math.hypot(x-d.x,p.y-d.y)<d.r+12)found=i});if(found>=0){s.found.add(found);if(s.found.size===differences.length)finish('全部找到了！')}else{s.miss++;if(s.miss>=8)finish('机会用完了')}},draw(s){background('#233c54','#15253c');scene(0,false);scene(480,true);ctx.fillStyle='#17243b';ctx.fillRect(472,0,16,H);for(const i of s.found){const d=differences[i];for(const shift of [0,480]){ctx.strokeStyle='#fef08a';ctx.lineWidth=5;ctx.beginPath();ctx.arc(d.x+shift,d.y,d.r+16,0,Math.PI*2);ctx.stroke()}}status(`找到 ${s.found.size} / 5`,`错点 ${s.miss} / 8`)}}
  }
  reset();requestAnimationFrame(frame);
})();
