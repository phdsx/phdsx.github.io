import * as THREE from 'three';

// Chiwen silhouette approximated from the institution's oblique exterior photos.
// This retains a volumetric, curled ridge end; scales and carving are not surveyed.
export function ridgeEnd(height){
 const s=new THREE.Shape();s.moveTo(-.42,0);s.lineTo(.52,0);s.quadraticCurveTo(.88,.14,.64,.4);s.quadraticCurveTo(.28,.48,.28,.94);s.quadraticCurveTo(.28,1.5,-.4,1.78);s.quadraticCurveTo(-.69,1.87,-.63,1.64);s.quadraticCurveTo(-.5,1.35,-.1,1.17);s.lineTo(-.24,.95);s.quadraticCurveTo(-.5,.76,-.8,.9);s.lineTo(-.95,.71);s.lineTo(-.85,.51);s.lineTo(-.63,.52);s.quadraticCurveTo(-.42,.28,-.42,0);
 const geo=new THREE.ExtrudeGeometry(s,{depth:.52,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:2,curveSegments:10});geo.translate(0,0,-.26);geo.computeBoundingBox();const bounds=geo.boundingBox;geo.translate(0,-bounds.min.y,0);geo.scale(height/(bounds.max.y-bounds.min.y),height/(bounds.max.y-bounds.min.y),1);return geo;
}
