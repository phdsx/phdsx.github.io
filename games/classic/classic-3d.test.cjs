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
}
class Mesh extends Object3D { constructor(geometry, material) { super(); this.geometry=geometry; this.material=material; } }
class Sprite extends Object3D { constructor(material) { super(); this.material=material; } }
class Renderer {
  constructor() { this.domElement={setAttribute(){},remove(){}}; }
  setPixelRatio() {}
  setSize() {}
  render() { renders++; }
}
class Color { constructor() {} }
const THREE = {Mesh,Sprite,WebGLRenderer:Renderer,MeshStandardMaterial:Material,SpriteMaterial:Material,Color,CanvasTexture:class{},SRGBColorSpace:'srgb'};
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
assert.ok(window.PHDSXClassic3D,'rendering should retain its Three.js layer');
console.log('Seven Three.js scenes rendered with representative game states.');
