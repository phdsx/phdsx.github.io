import * as THREE from 'three';

// Simplified stone profiles and perforated panels referenced to the institutional
// exterior photos. Motifs and exact carving dimensions remain estimates.
export function stonePost(){
 const profile=[[.14,0],[.15,.12],[.115,.16],[.10,.94],[.13,.97],[.13,1.02],[.08,1.06],[.135,1.12],[.14,1.17],[.1,1.24],[.055,1.3],[0,1.33]];
 const geo=new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),12);geo.translate(0,-.65,0);return geo;
}
export function stonePanel(){
 const shape=new THREE.Shape();shape.moveTo(-.5,-.5);shape.lineTo(.5,-.5);shape.lineTo(.5,.5);shape.lineTo(-.5,.5);shape.closePath();
 const hole=new THREE.Path();hole.moveTo(-.31,-.13);hole.lineTo(-.34,-.01);hole.quadraticCurveTo(-.27,.05,-.22,.11);hole.lineTo(-.12,.11);hole.quadraticCurveTo(0,.29,.12,.11);hole.lineTo(.22,.11);hole.quadraticCurveTo(.27,.05,.34,-.01);hole.lineTo(.31,-.13);hole.lineTo(.17,-.13);hole.lineTo(.11,-.22);hole.lineTo(-.11,-.22);hole.lineTo(-.17,-.13);hole.closePath();shape.holes.push(hole);
 const geo=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,curveSegments:5});geo.translate(0,0,-.5);return geo;
}
