(function(root){
  'use strict';
  class Renderer {
    constructor(canvas){this.ctx=canvas.getContext('2d');this.ctx.imageSmoothingEnabled=false;}
    draw(g){
      const c=this.ctx,rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
      rect(0,0,416,416,'#030303');
      const tile=(type,x,y)=>{
        if(type==='B'){
          rect(x,y,16,16,'#743a24');rect(x+1,y+1,14,6,'#c47b4b');rect(x+1,y+9,6,6,'#b9683c');rect(x+9,y+9,6,6,'#b9683c');
          rect(x+1,y+1,14,1,'#e4a371');
        }else if(type==='S'){
          rect(x,y,16,16,'#777f88');rect(x+1,y+1,14,2,'#edf0e3');rect(x+1,y+3,2,12,'#c5cbd0');rect(x+4,y+4,9,9,'#a7adb4');rect(x+13,y+3,2,12,'#424854');rect(x+3,y+13,10,2,'#424854');
        }else if(type==='W'){
          rect(x,y,16,16,'#17399c');const offset=Math.floor(g.time*3)%2*3;rect(x+offset,y+3,9,2,'#568ce0');rect(x+3-offset,y+10,11,2,'#4172d0');
        }else if(type==='G'){
          rect(x,y,16,16,'#143c20');for(let i=0;i<4;i++){rect(x+i*4,y+(i%2)*5,3,8,'#34863d');rect(x+i*4,y+9-(i%2)*4,2,6,'#61af43');}
        }
      };
      g.map.forEach((row,y)=>row.forEach((type,x)=>{if(type!=='G')tile(type,x*16,y*16);}));
      // Original pixel eagle, drawn locally; no external images or fonts.
      const bx=g.base.x,by=g.base.y;
      rect(bx-14,by-14,28,28,g.base.alive?'#24221e':'#51241d');
      const eagle=['10000000001','11000100111','11101101111','01111111110','00111111100','00011111000','00101110100','01100100110'];
      if(g.base.alive)eagle.forEach((row,y)=>[...row].forEach((p,x)=>{if(p==='1')rect(bx-11+x*2,by-10+y*2,2,2,'#d6c5a1');}));
      else{rect(bx-11,by-3,22,5,'#8b4e31');rect(bx-4,by-10,6,20,'#8b4e31');}
      const tank=t=>{
        if(t.birth>0)return;
        c.save();c.translate(Math.round(t.x),Math.round(t.y));c.rotate(t.dir*Math.PI/2);
        const color=t.team==='player'?'#f0cb54':root.TankEngine.TYPES[t.type].color;
        rect(-14,-13,6,26,'#626360');rect(8,-13,6,26,'#626360');
        for(let y=-11;y<13;y+=5){rect(-13,y,4,2,'#b9b8a2');rect(9,y,4,2,'#b9b8a2');}
        rect(-8,-11,16,23,color);rect(-5,-8,10,16,t.type==='armor'?'#274f35':'#756844');
        rect(-6,-5,12,12,color);rect(-2,-18,4,15,'#eee3b9');rect(-3,1,6,4,'#fff1b4');
        if(t.type==='armor')for(let i=0;i<t.hp;i++)rect(-5+i*4,8,2,2,'#faffea');
        if(t.team==='player')for(let i=1;i<t.upgrade;i++)rect(-6+(i-1)*8,9,4,2,'#fff8e0');
        c.restore();
        if(t.inv>0&&Math.floor(g.time*12)%2===0){c.strokeStyle='#9af9f2';c.lineWidth=2;c.strokeRect(Math.round(t.x)-16,Math.round(t.y)-16,32,32);}
      };
      g.enemies.forEach(tank);if(g.player)tank(g.player);
      for(const b of g.bullets){rect(b.x-2,b.y-2,4,4,b.team==='player'?'#fff7c8':'#ffb0a1');}
      // Foliage is painted after tanks and bullets to conceal them.
      g.map.forEach((row,y)=>row.forEach((type,x)=>{if(type==='G')tile(type,x*16,y*16);}));
      for(const p of g.pickups){
        if(p.ttl<5&&Math.floor(g.time*6)%2)continue;
        rect(p.x-12,p.y-12,24,24,'#171722');c.strokeStyle='#eee0a1';c.lineWidth=2;c.strokeRect(Math.round(p.x)-12,Math.round(p.y)-12,24,24);
        c.fillStyle={star:'#ffdc67',shield:'#89e7f2',bomb:'#ff9984'}[p.type];c.font='bold 22px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText({star:'★',shield:'◇',bomb:'✹'}[p.type],Math.round(p.x),Math.round(p.y)+1);
      }
      for(const e of g.effects){
        const progress=1-e.ttl/e.max,r=Math.round(4+progress*21);
        if(e.kind==='spawn'){c.strokeStyle= Math.floor(progress*10)%2?'#fff0a1':'#d0f8ff';c.lineWidth=3;c.strokeRect(e.x-r,e.y-r,r*2,r*2);}
        else for(let i=0;i<8;i++){const a=i*Math.PI/4;rect(e.x+Math.cos(a)*r-2,e.y+Math.sin(a)*r-2,4,4,e.kind==='spark'?'#ffeb9b':progress<.5?'#ffdc68':'#f3833c');}
      }
    }
  }
  root.TankRenderer=Renderer;
})(window);
