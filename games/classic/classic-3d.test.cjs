const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {runInNewContext} = require('node:vm');
const {join} = require('node:path');

const source = readFileSync(join(__dirname, 'classic-3d.mjs'), 'utf8').replace(/^import .*;\r?\n/, '');
const atlas=readFileSync(join(__dirname,'match-gems-atlas.png'));
assert.equal(atlas.readUInt32BE(16),1536);
assert.equal(atlas.readUInt32BE(20),1024);
assert.equal(atlas[25],6,'gem atlas should have true RGBA transparency');
let renders = 0, attached = false;
const vector = () => ({set() {}});
class Object3D {
  constructor() { this.position=vector(); this.scale=vector(); this.rotation=vector(); this.userData={}; this.children=[]; this.visible=true; }
  add(item) { this.children.push(item); }
  lookAt() {}
}
class Material {
  constructor() { this.color=vector(); this.emissive=vector(); }
  dispose() {}
}
class PlaneGeometry {
  static created=[];
  constructor() {
    const values=[[0,1],[1,1],[0,0],[1,0]];
    this.attributes={uv:{count:4,getX:i=>values[i][0],getY:i=>values[i][1],setXY(i,x,y){values[i]=[x,y]}}};
    PlaneGeometry.created.push(this);
  }
}
class TextureLoader { load(url) { assert.equal(url,'../../classic/match-gems-atlas.png'); return {}; } }
class Mesh extends Object3D { constructor(geometry, material) { super(); this.geometry=geometry; this.material=material; } }
class Sprite extends Object3D { constructor(material) { super(); this.material=material; } }
class Renderer {
  constructor() { this.domElement={setAttribute(){},remove(){}}; }
  setPixelRatio() {}
  setSize() {}
  render() { renders++; }
}
class Color { constructor() {} }
const THREE = {Mesh,Sprite,WebGLRenderer:Renderer,MeshStandardMaterial:Material,MeshBasicMaterial:Material,SpriteMaterial:Material,PlaneGeometry,TextureLoader,DoubleSide:2,Color,CanvasTexture:class{},SRGBColorSpace:'srgb'};
for(const name of ['Scene','OrthographicCamera','AmbientLight','DirectionalLight']) THREE[name]=Object3D;
for(const name of ['BoxGeometry','SphereGeometry','ConeGeometry','CylinderGeometry','OctahedronGeometry','TorusGeometry']) THREE[name]=class{};
const graphics = {beginPath(){},arc(){},roundRect(){},fill(){},stroke(){},fillText(){},createLinearGradient(){return {addColorStop(){}}}};
const document = {
  querySelector() {return {append(){attached=true}}},
  createElement() {return {getContext(){return graphics}}},
};
const window = {devicePixelRatio:1};
runInNewContext(source,{THREE,document,window,console});
assert.equal(attached,true);
assert.equal(PlaneGeometry.created.length,6,'six approved gem images should have atlas planes');
for(const [index,shape] of PlaneGeometry.created.entries()){
  const uv=shape.attributes.uv;
  for(let i=0;i<uv.count;i++){
    assert.ok(uv.getX(i)>=(index%3)/3&&uv.getX(i)<=(index%3+1)/3);
    assert.ok(uv.getY(i)>=(1-Math.floor(index/3))/2&&uv.getY(i)<=(2-Math.floor(index/3))/2);
  }
}
const draw=window.PHDSXClassic3D.draw;
const fixtures={
  snake:{food:{x:12,y:6},body:[{x:8,y:8},{x:7,y:8}],dir:{x:1,y:0}},
  plane:{shots:[{x:400,y:350}],enemies:[{x:500,y:100}],x:480,y:550,inv:0},
  birds:{targets:[{x:700,y:531,hit:false},{x:770,y:531,hit:false},{x:735,y:461,hit:false}],drag:null,bird:null,shots:3},
  match:{board:Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>(x+y)%6)),selected:{x:1,y:1}},
  stars:{points:[[130,355],[230,180],[390,260]],next:2},
  difference:{found:new Set([0,2])},
};
for(const [game,model] of Object.entries(fixtures)) draw(game,model,.5);
assert.equal(renders,6,'each game should draw its own Three.js scene');
const match=fixtures.match, before=match.board.map(row=>row.slice());
match.selected=null;
match.animation={type:'swap',duration:.26,elapsed:.13,before,a:{x:0,y:0},b:{x:1,y:0}};
draw('match',match,.5);
match.animation={type:'clear',duration:.24,elapsed:.12,before,cells:['0,0','1,0','2,0']};
draw('match',match,.5);
match.animation={type:'fall',duration:.38,elapsed:.2,pieces:[{x:0,fromY:-1,toY:0,color:2}]};
draw('match',match,.5);
assert.equal(renders,9,'swap, clear and fall phases should render');
assert.ok(window.PHDSXClassic3D,'rendering should retain its Three.js layer');
console.log('Six Three.js scenes and three match animations rendered.');
