const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {runInNewContext} = require('node:vm');
const {join} = require('node:path');

const source = readFileSync(join(__dirname, 'classic-3d.mjs'), 'utf8').replace(/^import .*;\r?\n/, '');
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
class BufferGeometry {
  static created=[];
  constructor() { this.attributes={}; BufferGeometry.created.push(this); }
  setAttribute(name,attribute) { this.attributes[name]=attribute; }
  computeVertexNormals() {}
}
class Float32BufferAttribute { constructor(array,itemSize) { this.array=array; this.itemSize=itemSize; } }
class Mesh extends Object3D { constructor(geometry, material) { super(); this.geometry=geometry; this.material=material; } }
class Sprite extends Object3D { constructor(material) { super(); this.material=material; } }
class Renderer {
  constructor() { this.domElement={setAttribute(){},remove(){}}; }
  setPixelRatio() {}
  setSize() {}
  render() { renders++; }
}
class Color { constructor() {} }
const THREE = {Mesh,Sprite,WebGLRenderer:Renderer,MeshStandardMaterial:Material,MeshPhysicalMaterial:Material,SpriteMaterial:Material,BufferGeometry,Float32BufferAttribute,DoubleSide:2,Color,CanvasTexture:class{},SRGBColorSpace:'srgb'};
for(const name of ['Scene','OrthographicCamera','AmbientLight','DirectionalLight']) THREE[name]=Object3D;
for(const name of ['BoxGeometry','SphereGeometry','ConeGeometry','CylinderGeometry','OctahedronGeometry','TorusGeometry']) THREE[name]=class{};
const graphics = {beginPath(){},arc(){},fill(){},stroke(){},fillText(){}};
const document = {
  querySelector() {return {append(){attached=true}}},
  createElement() {return {getContext(){return graphics}}},
};
const window = {devicePixelRatio:1};
runInNewContext(source,{THREE,document,window,console});
assert.equal(attached,true);
assert.equal(BufferGeometry.created.length,6,'six distinct gemstone cuts should be built');
for(const shape of BufferGeometry.created){
  const vertices=shape.attributes.position.array;
  assert.ok(vertices.every(Number.isFinite),'gem facets should have valid coordinates');
  assert.ok(Math.min(...vertices.filter((_,index)=>index%3===2))<0,'gem pavilion should have depth');
  assert.ok(Math.max(...vertices.filter((_,index)=>index%3===2))>0,'gem crown should rise above its girdle');
}
const draw=window.PHDSXClassic3D.draw;
const fixtures={
  snake:{food:{x:12,y:6},body:[{x:8,y:8},{x:7,y:8}],dir:{x:1,y:0}},
  plane:{shots:[{x:400,y:350}],enemies:[{x:500,y:100}],x:480,y:550,inv:0},
  tank:{bullets:[{x:200,y:200,own:true}],enemies:[{x:650,y:90}],x:480,y:550,dir:{x:0,y:-1}},
  birds:{targets:[{x:700,y:531,hit:false},{x:770,y:531,hit:false},{x:735,y:461,hit:false}],drag:null,bird:null,shots:3},
  match:{board:Array.from({length:8},(_,y)=>Array.from({length:8},(_,x)=>(x+y)%6)),selected:{x:1,y:1}},
  stars:{points:[[130,355],[230,180],[390,260]],next:2},
  difference:{found:new Set([0,2])},
};
for(const [game,model] of Object.entries(fixtures)) draw(game,model,.5);
assert.equal(renders,7,'each game should draw its own Three.js scene');
const match=fixtures.match, before=match.board.map(row=>row.slice());
match.selected=null;
match.animation={type:'swap',duration:.26,elapsed:.13,before,a:{x:0,y:0},b:{x:1,y:0}};
draw('match',match,.5);
match.animation={type:'clear',duration:.24,elapsed:.12,before,cells:['0,0','1,0','2,0']};
draw('match',match,.5);
match.animation={type:'fall',duration:.38,elapsed:.2,pieces:[{x:0,fromY:-1,toY:0,color:2}]};
draw('match',match,.5);
assert.equal(renders,10,'swap, clear and fall phases should render');
assert.ok(window.PHDSXClassic3D,'rendering should retain its Three.js layer');
console.log('Seven Three.js scenes and three match animations rendered.');
