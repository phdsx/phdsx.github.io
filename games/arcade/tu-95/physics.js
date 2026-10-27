/* Original arcade flight model. World units: metres, seconds, positive y up. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TU95 = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const LEVELS = [
    { id:'training', name:'初次起航', from:'松林机场', to:'山谷机场', destination:3600, runway:1700, wind:0, gust:0, fuel:150, ceiling:900, brief:'晴空、长跑道。熟悉起飞与着陆，完成第一次转场。', weather:'晴朗 · 无风', color:'#9cdbed' },
    { id:'headwind', name:'逆风航线', from:'山谷机场', to:'北岸机场', destination:5500, runway:1400, wind:-6, gust:2, fuel:165, ceiling:1000, brief:'迎着山风飞行。留意空速，提前减速并放下起落架。', weather:'多云 · 逆风 6 m/s', color:'#b2cbd8' },
    { id:'dusk', name:'暮色归航', from:'北岸机场', to:'灯塔机场', destination:7000, runway:1150, wind:7, gust:4, fuel:170, ceiling:1100, brief:'晚霞与阵风中的短跑道进近。轻柔接地，及时刹车。', weather:'黄昏 · 顺风 7 m/s', color:'#e5bdb0' }
  ];
  const TUNING = { throttleRate:.34, pitchRate:17, minPitch:-23, maxPitch:25, takeoffSpeed:61, landingSpeed:92, landingSink:5.5, brake:22, verticalResponse:1.35 };
  function createFlight(levelIndex = 0) {
    const level = LEVELS[clamp(Math.trunc(levelIndex) || 0, 0, LEVELS.length - 1)];
    return { level, status:'ready', x:100, y:0, vx:0, vy:0, pitch:0, throttle:0, flaps:1, gear:true, ground:true, airborne:false, touched:false, time:0, fuel:100, touchdown:null, reason:'', score:0, stars:0, brake:false, stall:false };
  }
  function fail(s, reason) { s.status='crashed'; s.reason=reason; }
  function onRunway(s) { return s.x >= -200 && s.x <= 1450 || s.x >= s.level.destination && s.x <= s.level.destination+s.level.runway; }
  function toggleGear(s) {
    if (s.status !== 'flying') return false;
    if (s.ground || s.gear && s.y < 12) return false;
    s.gear = !s.gear; return true;
  }
  function cycleFlaps(s) {
    if (s.status !== 'flying') return;
    s.flaps=(s.flaps+1)%3;
  }
  function step(s, input, dt) {
    if (s.status !== 'flying') return;
    dt=clamp(dt,0,1/30);
    s.time+=dt;
    s.throttle=clamp(s.throttle+((input.more?1:0)-(input.less?1:0))*TUNING.throttleRate*dt,0,1);
    s.pitch=clamp(s.pitch+((input.up?1:0)-(input.down?1:0))*TUNING.pitchRate*dt,TUNING.minPitch,TUNING.maxPitch);
    s.brake=!!input.brake && s.ground;
    s.fuel=Math.max(0,s.fuel-(.17+s.throttle*.31)*dt*(150/s.level.fuel));
    if (!s.fuel) s.throttle=0;
    const drag=.00054*s.vx*s.vx+(s.gear?1.1:0)+s.flaps*.7;
    const acceleration=s.throttle*12.6-drag-s.pitch*.045-(s.ground?.5:0)-(s.brake?TUNING.brake:0);
    s.vx=clamp(s.vx+acceleration*dt,0,160);
    const wind=s.ground?0:s.level.wind+Math.sin(s.time*.8)*s.level.gust;
    s.x+=Math.max(0,s.vx+wind)*dt;
    const stallSpeed=56-s.flaps*4;
    s.stall=!s.ground && (s.vx<stallSpeed || s.pitch>21);
    if (s.ground) {
      s.pitch=clamp(s.pitch,0,12);
      if (!s.touched && s.vx>=TUNING.takeoffSpeed && s.pitch>3 && !s.brake) {
        s.ground=false; s.airborne=true; s.y=.2; s.vy=2;
      }
      if (!onRunway(s)) fail(s,s.touched?'冲出跑道：接地后收油门，按住空格刹车。':'滑跑冲出跑道：空速达到 220 km/h 后，按 ← 轻抬机头。');
      if (s.touched && s.vx<2 && s.status==='flying') {
        s.status='won';
        s.score=Math.round(clamp(1000-s.touchdown.sink*65-Math.abs(s.touchdown.pitch-4)*12+s.fuel*2,100,1200));
        s.stars=s.score>=950?3:s.score>=700?2:1;
      }
    } else {
      let target=s.vx*Math.sin(s.pitch*Math.PI/180)*.74+(s.vx-85)*.075+s.flaps*.5;
      if (s.stall) target=-8-Math.max(0,stallSpeed-s.vx)*.45;
      target+=Math.sin(s.time*1.3)*s.level.gust*.18;
      s.vy+=(target-s.vy)*Math.min(1,TUNING.verticalResponse*dt);
      s.y+=s.vy*dt;
      if (s.y<=0) {
        const sink=Math.abs(s.vy);
        s.y=0;
        if (!onRunway(s)) fail(s,'在跑道外接地：沿航线继续飞往目标机场，保持安全高度。');
        else if (!s.gear) fail(s,'机腹触地：着陆前按 G 放下起落架。');
        else if (sink>TUNING.landingSink) fail(s,'下降过快：接地前轻抬机头，将下降率控制在 5 m/s 以内。');
        else if (s.pitch < -5 || s.pitch > 14) fail(s,'接地姿态过大：接地时让机头保持约 0～10°。');
        else if (s.vx>TUNING.landingSpeed) fail(s,'接地速度过快：提前收油门、放襟翼，将空速降至 330 km/h 以下。');
        else if (s.x<s.level.destination) fail(s,'返回了出发机场：目标机场在航线右侧，请继续转场。');
        else { s.ground=true; s.touched=true; s.touchdown={sink,pitch:s.pitch,speed:s.vx}; s.vy=0; s.pitch=0; }
      }
      if (s.y>s.level.ceiling) fail(s,'超出任务空域：巡航保持在建议高度附近，按 → 降低机头。');
    }
    if (s.x>s.level.destination+s.level.runway+160) fail(s,'错过目标机场：下一次提前减速，跟随进近引导下降。');
  }
  function stage(s) { return s.touched?4:!s.airborne?0:s.x>s.level.destination-1300?3:s.y<90 && s.x<1700?1:2; }
  function guidance(s) {
    if (s.status==='crashed') return s.reason;
    if (s.touched) return '接地成功 · 油门收至 0%，按住空格刹车，停稳即可完成任务。';
    if (!s.fuel) return '燃油耗尽 · 保持空速，放下起落架，滑翔进近。';
    if (s.stall) return '失速警报 · 按 → 压低机头，并按 ↑ 加大油门。';
    if (!s.airborne) return s.vx<61?'按住 ↑ 将油门推至 100%，沿跑道加速至 220 km/h。':'速度已够 · 按 ← 轻抬机头到 8°，离开跑道。';
    if (s.x>s.level.destination-1500) return !s.gear?'进入进近 · 按 G 放下起落架，按 F 放至着陆襟翼。':'收油门至 25～40%，按 → 轻压机头下降；接地前轻抬头。';
    if (s.gear && s.y>25) return '爬升稳定 · 按 G 收起起落架，按 F 切换到收起襟翼。';
    if (s.y>300) return '高度偏高 · 按 → 轻压机头，巡航建议高度 120～250 米。';
    return '保持 120～250 米高度，微调俯仰与油门，飞往右侧目标机场。';
  }
  function readSave(raw) {
    try {
      const data=JSON.parse(raw);
      if (!data || data.version!==1 || !data.records || typeof data.records!=='object') return {version:1,records:{}};
      const records={};
      for (const level of LEVELS) {
        const row=data.records[level.id];
        if (row && Number.isFinite(row.score) && Number.isInteger(row.stars) && row.stars>=1 && row.stars<=3) records[level.id]={score:clamp(row.score,0,1200),stars:row.stars};
      }
      return {version:1,records};
    } catch { return {version:1,records:{}}; }
  }
  return { LEVELS,TUNING,clamp,createFlight,step,toggleGear,cycleFlaps,stage,guidance,readSave };
});
