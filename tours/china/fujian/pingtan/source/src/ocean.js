import * as THREE from 'three';
// Coast-distance shading, not measured bathymetry. No random coastline or depth map.
export function createOcean(scene,data){
 const b=data.geo.metadata.bounds;
 const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.43,metalness:0,envMapIntensity:.24});
 const uniforms={time:{value:0},coastalField:{value:data.waterField},geoBounds:{value:new THREE.Vector4(b.x0,b.z0,b.width,b.depth)},sunVector:{value:new THREE.Vector3(.4,.8,.3)}};
 material.onBeforeCompile=s=>{
  Object.assign(s.uniforms,uniforms);
  s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSeaWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSeaWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vSeaWorld;
uniform float time;
uniform sampler2D coastalField;
uniform vec4 geoBounds;
uniform vec3 sunVector;
float hashsea(vec2 p){return fract(sin(dot(p,vec2(91.7,173.4)))*43758.545);}
float seaNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hashsea(i),hashsea(i+vec2(1,0)),f.x),mix(hashsea(i+vec2(0,1)),hashsea(i+vec2(1,1)),f.x),f.y);}
float wave(vec2 p){return .065*sin(dot(p,vec2(.31,.15))-time*1.3)+.04*sin(dot(p,vec2(-.14,.59))+time*1.7)+.016*sin(dot(p,vec2(1.49,.43))-time*2.1);}
`).replace('#include <color_fragment>',`#include <color_fragment>
vec2 guv=vec2((vSeaWorld.x-geoBounds.x)/geoBounds.z,1.-(vSeaWorld.z-geoBounds.y)/geoBounds.w);
vec3 cf=texture2D(coastalField,clamp(guv,0.,1.)).rgb;
bool covered=guv.x>=0.&&guv.x<=1.&&guv.y>=0.&&guv.y<=1.;
float shore=covered?(128.-cf.g*255.)*4.:1500.;
// Keep water beneath land: source-mask/LOD differences must not expose the sky
// through a white seam. Positive-elevation terrain occludes the sea naturally.
shore=max(0.,shore);
float shallow=1.-smoothstep(18.,220.,shore);
float variation=seaNoise(vSeaWorld.xz*.0012);
vec3 deep=vec3(.015,.060,.078),shoal=vec3(.055,.147,.131);
diffuseColor.rgb=mix(deep,shoal,shallow*.8)*mix(.92,1.08,variation);
float sandCoast=1.-smoothstep(7.,18.,abs(cf.b*255.-32.));
float wash=(.5+.5*sin(shore*mix(.38,.25,sandCoast)-time*1.3+seaNoise(vSeaWorld.xz*.045)*2.));
float foam=pow(wash,mix(16.,10.,sandCoast))*(1.-smoothstep(3.,mix(16.,32.,sandCoast),shore))*mix(.14,.42,seaNoise(vSeaWorld.xz*.38));
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.58,.64,.58),foam);
`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
float eps=.2;
float wx=(wave(vSeaWorld.xz+vec2(eps,0))-wave(vSeaWorld.xz-vec2(eps,0)))/(2.*eps);
float wz=(wave(vSeaWorld.xz+vec2(0,eps))-wave(vSeaWorld.xz-vec2(0,eps)))/(2.*eps);
float footprint=max(length(dFdx(vSeaWorld.xz)),length(dFdy(vSeaWorld.xz)));
float fade=(1.-smoothstep(1500.,6000.,distance(cameraPosition,vSeaWorld)))*(1.-smoothstep(.12,1.1,footprint));
normal=normalize((viewMatrix*vec4(normalize(vec3(-wx*fade,1.,-wz*fade)),0.)).xyz);
`);
 };
 material.customProgramCacheKey=()=> 'coastal-ocean-v2';
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(240000,240000),material);mesh.rotation.x=-Math.PI/2;mesh.position.y=.025;mesh.name='Coast distance shaded sea';scene.add(mesh);
 return {mesh,material,uniforms,update(t){uniforms.time.value=t;}};
}
