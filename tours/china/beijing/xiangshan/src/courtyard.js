import * as THREE from 'three';

// Photo-guided architectural detailing. The pool plan comes from OSM;
// the vertical profile, paving, stone joints and carving dimensions are estimates.
export function buildCourtyard(parent, geo, stone, paving) {
  const c = geo.courtyard;
  const base = geo.hallBase;
  const deck = c.deckY - base;
  const group = new THREE.Group();
  parent.add(group);

  function box(w, h, d, x, y, z, material = stone) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }

  function stoneProfile(u, v, y) {
    box(.25, .98, .25, u, y + .49, v);
    box(.32, .09, .32, u, y + 1.015, v);
    const points = [[0,0],[.11,0],[.14,.045],[.12,.11],[.065,.17],[.09,.21],[0,.23]];
    const cap = new THREE.Mesh(new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),12), stone);
    cap.position.set(u, y + 1.06, v);
    group.add(cap);
  }

  function panelGeometry(width) {
    const shape = new THREE.Shape();
    shape.moveTo(-width/2, 0);shape.lineTo(width/2, 0);shape.lineTo(width/2, .43);
    shape.lineTo(-width/2, .43);shape.closePath();
    // A through-cut quatrefoil is inferred from the photographed pierced balustrades.
    const hole = new THREE.Path();
    for(let i=0;i<=48;i++) {
      const t=-i/48*Math.PI*2,r=.135*(1+.22*Math.cos(4*t));
      const x=Math.cos(t)*r*1.8,y=.215+Math.sin(t)*r;
      if(i===0)hole.moveTo(x,y);else hole.lineTo(x,y);
    }
    shape.holes.push(hole);
    return new THREE.ExtrudeGeometry(shape,{depth:.13,bevelEnabled:true,bevelSize:.009,bevelThickness:.009,bevelSegments:1,steps:1});
  }

  function rail(a, b, height) {
    const du=b[0]-a[0],dv=b[1]-a[1],length=Math.hypot(du,dv);
    if(length<.55)return;
    const count=Math.max(1,Math.round(length/1.65)),segment=length/count;
    const panel=panelGeometry(Math.max(.34,segment-.28));
    const angle=-Math.atan2(dv,du);
    for(let i=0;i<=count;i++) {
      const t=i/count,u=a[0]+du*t,v=a[1]+dv*t,y=height(u,v);
      stoneProfile(u,v,y);
      if(i===count)break;
      const tm=(i+.5)/count,um=a[0]+du*tm,vm=a[1]+dv*tm,ym=height(um,vm);
      const panelMesh=new THREE.Mesh(panel,stone);
      panelMesh.position.set(um,ym+.25,vm);
      panelMesh.rotation.y=angle;
      group.add(panelMesh);
      const handrail=box(segment-.09,.145,.22,um,ym+.91,vm);
      handrail.rotation.y=angle;
      const rise=height(a[0]+du*(i+1)/count,a[1]+dv*(i+1)/count)-y;
      const tilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.atan2(rise,segment));
      handrail.quaternion.multiply(tilt);
      const plinth=box(segment-.10,.13,.22,um,ym+.10,vm);plinth.rotation.y=angle;
    }
  }

  // A single paving shape has a real hole for the original OSM water outline.
  const shape=new THREE.Shape([
    new THREE.Vector2(c.umin,-c.vmin),new THREE.Vector2(c.umax,-c.vmin),
    new THREE.Vector2(c.umax,-c.vmax),new THREE.Vector2(c.umin,-c.vmax)
  ]);
  const waterHole=new THREE.Path(c.poolLocal.map(p=>new THREE.Vector2(p[0],-p[1])));
  shape.holes.push(waterHole);
  const pavement=new THREE.ShapeGeometry(shape);
  pavement.rotateX(-Math.PI/2);
  const uv=pavement.getAttribute('uv');
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)/3.2,uv.getY(i)/3.2);
  const patio=new THREE.Mesh(pavement,paving);patio.position.y=deck;group.add(patio);

  // Curved masonry bridge: deck, soffit and side faces share the same profile as walkY().
  const pos=[],uvs=[],indices=[],steps=48;
  for(let i=0;i<=steps;i++) {
    const t=i/steps,v=c.bridgeStart+(c.bridgeEnd-c.bridgeStart)*t,y=geo.bridgeY(v)-base;
    const thickness=.34+1.10*(1-Math.sin(Math.PI*t));
    for(const [u,dy] of [[-c.bridgeHalfWidth,0],[c.bridgeHalfWidth,0],[-c.bridgeHalfWidth,-thickness],[c.bridgeHalfWidth,-thickness]]) {
      pos.push(u,y+dy,v);uvs.push(u/2,v/2);
    }
    if(i===steps)continue;
    const a=i*4,b=a+4;
    indices.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,
      a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);
  }
  const bridgeGeo=new THREE.BufferGeometry();
  bridgeGeo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  bridgeGeo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));bridgeGeo.setIndex(indices);bridgeGeo.computeVertexNormals();
  group.add(new THREE.Mesh(bridgeGeo,stone));
  for(const v of [c.bridgeStart,c.bridgeEnd])box(3.85,1.9,.5,0,deck-.97,v);
  for(const side of [-1,1])rail([side*1.89,c.bridgeStart],[side*1.89,c.bridgeEnd],(u,v)=>geo.bridgeY(v)-base);

  // Continuous masonry sides follow the mapped pool polygon. Bridge landings stay open.
  for(let i=1;i<c.poolLocal.length;i++) {
    const a=c.poolLocal[i-1],b=c.poolLocal[i],du=b[0]-a[0],dv=b[1]-a[1],length=Math.hypot(du,dv);
    const bottom=geo.pool.level-base-.55,top=deck-.03;
    const wall=box(length,top-bottom,.38,(a[0]+b[0])/2,(top+bottom)/2,(a[1]+b[1])/2);
    wall.rotation.y=-Math.atan2(dv,du);
    const cuts=[0,1];if(Math.abs(du)>1e-6)for(const edge of [-2.15,2.15]){const t=(edge-a[0])/du;if(t>0&&t<1)cuts.push(t);}
    cuts.sort((x,y)=>x-y);
    for(let j=1;j<cuts.length;j++) {
      const t0=cuts[j-1],t1=cuts[j],um=a[0]+du*(t0+t1)/2;
      if(Math.abs(um)<2.15)continue;
      rail([a[0]+du*t0,a[1]+dv*t0],[a[0]+du*t1,a[1]+dv*t1],()=>deck);
    }
  }
  return group;
}
