const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {displayScale,decodeCharacter,matchesGlyph}=require('./display-enhance.js');
const read=file=>fs.readFileSync(require.resolve(file));

test('the original engine is preserved and the enhanced engine adds only its drawing import',()=>{
  const original=read('./engine/baye.wasm'),colour=read('./engine/baye-hd.wasm');
  const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  assert.equal(hash(original),'f65723e06946e5a824e0890cd2fe07a1b1488151f6c5abbbc0de2599f491c5a8');
  const manifest=JSON.parse(read('./engine/hd-build.json'));
  assert.equal(hash(colour),manifest.enhancedSHA256);
  const a=new WebAssembly.Module(original),b=new WebAssembly.Module(colour);
  assert.deepEqual(WebAssembly.Module.exports(b),WebAssembly.Module.exports(a));
  assert.deepEqual(WebAssembly.Module.imports(b).filter(i=>i.name!=='baye_hd_event'),WebAssembly.Module.imports(a));
  assert.equal(WebAssembly.Module.imports(b).filter(i=>i.name==='baye_hd_event').length,1);
});

test('GBK glyphs are decoded from their actual character codes, without OCR or smoothing',()=>{
  const decoder=new TextDecoder('gbk');
  assert.equal(decodeCharacter(0xc8fd,decoder),'三');
  assert.equal(decodeCharacter(0xb9fa,decoder),'国');
  assert.equal(decodeCharacter(0x39,decoder),'9');
  assert.equal(decodeCharacter(0x20,decoder),' ');
});

test('DPI sizing remains bounded and maintains the original aspect ratio',()=>{
  assert.equal(displayScale(320,1,160),4);assert.equal(displayScale(640,2,160),8);
  assert.equal(displayScale(1080,2,160),14);assert.equal(displayScale(4000,3,160),16);
});

function harness({blocked=false}={}){
  const calls=[],surfaces=[],settings=new Map(),listeners={};
  function surface(){
    const obj={width:0,height:0};const context={};
    for(const name of ['scale','fillRect','clearRect','drawImage','putImageData','save','restore','beginPath','rect','clip','fillText','strokeRect'])context[name]=(...args)=>calls.push({name,args,surface:obj});
    obj.getContext=()=>context;obj.getBoundingClientRect=()=>({width:640});surfaces.push(obj);return obj;
  }
  const canvas=surface();const selector={addEventListener(name,fn){listeners[name]=fn;}},label={};
  const memory=new Uint8Array(80000);
  const window={
    devicePixelRatio:2,addEventListener(){},
    localStorage:{getItem(k){if(blocked)throw Error('blocked');return settings.get(k);},setItem(k,v){if(blocked)throw Error('blocked');settings.set(k,v);}},
    bayeFlushLcdBuffer(){calls.push({name:'fallback'});},bayeFrameRendered(){}
  };
  const sandbox={window,document:{body:{dataset:{}},getElementById(id){return {lcd:canvas,'display-mode':selector,'display-resolution':label}[id];},createElement:surface,addEventListener(){}},
    TextDecoder,Uint8Array,Uint8ClampedArray,ImageData:class{constructor(data,w,h){this.data=data;this.width=w;this.height=h;}},console:{error(){}},
    dotSize:1,lcdWidth:160,lcdHeight:96,wasmMemory:{buffer:memory.buffer}
  };
  vm.runInNewContext(read('./display-enhance.js').toString(),sandbox);
  function glyph(x=12,y=24,inverse=false){
    const bits=new Uint8Array(24);
    for(let row=0;row<12;row++){bits[row*2]=row%2?0x55:0xaa;bits[row*2+1]=0xa0;}
    memory.set(bits,70000);
    for(let row=0;row<12;row++)for(let col=0;col<12;col++){
      const bit=!!(bits[row*2+(col>>3)]&(128>>(col&7)));
      const p=((y+row)*160+x+col)*4;
      memory.set([0,0,0,(bit!==inverse)?255:0],p);
    }
    window.bayeHDDispatch(10,x,y,0xc8fd);
    window.bayeHDDispatch(9,x,y,x+11,y+11,70000,0,1,1);
    return {x,y,w:12,h:12,bits,inverse};
  }
  return {window,sandbox,canvas,memory,calls,surfaces,selector,settings,glyph,change(value){selector.value=value;listeners.change();}};
}

test('glyph events paint text at original coordinates and never write engine memory',()=>{
  const a=harness();
  a.window.bayeHDDispatch(1,1234);
  a.glyph();
  const before=a.memory.slice();
  a.window.bayeHDDispatch(2,1234);
  a.window.bayeFlushLcdBuffer(0);
  const glyph=a.calls.find(c=>c.name==='fillText');
  assert.equal(glyph.args[0],'三');assert.equal(glyph.args[1],18*8);
  assert.equal(a.window.bayeHDStatus().glyphs,1);
  assert.equal(a.window.bayeHDStatus().verified,1);
  assert.deepEqual(a.memory,before);
  assert.equal(a.canvas.width,1280);assert.equal(a.canvas.height,768);
});

test('mode switching restores the exact original RGBA snapshot even after memory growth',()=>{
  const a=harness();
  for(let i=0;i<160*96*4;i++)a.memory[i]=i%251;
  const before=a.memory.slice(0,160*96*4);
  a.window.bayeHDDispatch(12,160,96);a.window.bayeFlushLcdBuffer(0);
  a.sandbox.wasmMemory.buffer=new ArrayBuffer(a.memory.length*2);
  a.change('original');
  assert.equal(a.settings.get('baye/display-mode'),'original');
  const painted=a.calls.find(c=>c.name==='putImageData').args[0].data;
  assert.deepEqual(new Uint8Array(painted),before);
  a.change('hd');assert.equal(a.window.bayeHDStatus().mode,'hd');
  assert.equal(a.canvas.getContext().imageSmoothingEnabled,false);
});

test('rendering failures and unavailable preferences cannot abort game callbacks',()=>{
  const a=harness({blocked:true});
  a.window.bayeHDDispatch(10,0,0,0xc8fd);
  a.window.bayeHDDispatch(9,0,0,11,11,9999999,0,1,1);
  assert.equal(a.window.bayeHDStatus().errors,1);
  assert.equal(a.window.bayeHDStatus().mode,'original');
  assert.doesNotThrow(()=>a.window.bayeFlushLcdBuffer(0));
  assert.doesNotThrow(()=>a.change('original'));
});

test('drawing notifications preserve independent screen, backup, and inversion state',()=>{
  const a=harness();
  a.window.bayeHDDispatch(1,2345);a.glyph();
  a.window.bayeHDDispatch(2,2345);a.window.bayeHDDispatch(3);
  a.window.bayeHDDispatch(1,0);a.window.bayeHDDispatch(6,0,0,159,95);
  a.window.bayeFlushLcdBuffer(0);
  assert.equal(a.window.bayeHDStatus().verified,0,'inverted metadata cannot match a normal frame');
  a.window.bayeHDDispatch(4);a.window.bayeFlushLcdBuffer(0);
  assert.equal(a.window.bayeHDStatus().verified,1,'backup has independent inversion metadata');
  assert.equal(a.window.bayeHDStatus().screens,3);
  a.window.bayeHDDispatch(13,99999,0,65536);
  assert.equal(a.window.bayeHDStatus().screens,3,'unrelated engine buffers must not allocate artwork');
});

test('final-frame verification rejects a changed map pixel, partial alpha, or clipped text',()=>{
  const a=harness(),g=a.glyph();
  assert.equal(matchesGlyph(g,a.memory,160,96),true);
  const p=(24*160+12)*4;
  a.memory[p+3]=128;assert.equal(matchesGlyph(g,a.memory,160,96),false);
  a.memory[p+3]=0;assert.equal(matchesGlyph(g,a.memory,160,96),false);
  a.window.bayeFlushLcdBuffer(0);assert.equal(a.window.bayeHDStatus().verified,0);
  assert.equal(matchesGlyph({...g,x:-1},a.memory,160,96),false);
});

test('occlusion, partial inversion and clearing conservatively retain original pixels',()=>{
  for(const args of [[5,12,24,12,24],[8,12,24,1],[6,12,24,12,24],[9,12,24,12,24,70000,2,1,1],[13,2345,0,15360]]){
    const a=harness();a.window.bayeHDDispatch(1,2345);a.glyph();
    a.window.bayeHDDispatch(...args);a.window.bayeHDDispatch(2,2345);a.window.bayeFlushLcdBuffer(0);
    assert.equal(a.window.bayeHDStatus().verified,0,`event ${args[0]}`);
  }
});

test('a surrounding border does not displace or remove the text; full inversion is preserved',()=>{
  const a=harness();a.glyph(12,24,true);
  a.window.bayeHDDispatch(7,0,0,159,95);a.window.bayeHDDispatch(6,12,24,23,35);
  a.window.bayeFlushLcdBuffer(0);
  assert.equal(a.window.bayeHDStatus().verified,1);
  assert.deepEqual(JSON.parse(JSON.stringify(a.window.bayeHDStatus().textCells)),[{x:12,y:24,w:12,h:12}]);
});

test('selection edges crossing the next text row retain the exact partial inversion',()=>{
  const a=harness();a.glyph();
  a.window.bayeHDDispatch(6,0,0,159,24);
  for(let x=12;x<24;x++){
    const p=(24*160+x)*4;
    a.memory[p+3]=255-a.memory[p+3];
  }
  a.window.bayeFlushLcdBuffer(0);
  assert.equal(a.window.bayeHDStatus().verified,1);
});
