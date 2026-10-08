import * as T from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
export function waterReflection(scene, renderer, camera, material) {
  const mirror = new Reflector(new T.PlaneGeometry(1, 1), {
    textureWidth: 384,
    textureHeight: 384,
    clipBias: 0.003,
    multisample: 0,
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = 0.015;
  mirror.visible = false;
  scene.add(mirror);
  mirror.updateMatrixWorld(true);
  const projection = new T.Matrix4(),
    strength = { value: 0 },
    water = [];
  scene.traverse((o) => {
    if (o.material === material) water.push(o);
  });
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader) => {
    previous(shader);
    shader.uniforms.lakeReflection = {
      value: mirror.getRenderTarget().texture,
    };
    shader.uniforms.reflectionProjection = { value: projection };
    shader.uniforms.reflectionStrength = strength;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform mat4 reflectionProjection;\nvarying vec4 vLakeReflection;",
      )
      .replace(
        "vWaterWorld = (modelMatrix * vec4(transformed,1.0)).xyz;",
        "vWaterWorld = (modelMatrix * vec4(transformed,1.0)).xyz;\nvLakeReflection=reflectionProjection*vec4(vWaterWorld,1.0);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D lakeReflection;\nuniform float reflectionStrength;\nvarying vec4 vLakeReflection;",
      )
      .replace(
        "#include <opaque_fragment>",
        `#include <opaque_fragment>
  vec2 reflectedUV=vLakeReflection.xy/max(vLakeReflection.w,.0001);reflectedUV+=wave*fade*.015;
  if(all(greaterThan(reflectedUV,vec2(0.0)))&&all(lessThan(reflectedUV,vec2(1.0)))){
   vec2 blur=vec2(2.5/384.0);
   vec3 reflection=texture2D(lakeReflection,reflectedUV).rgb*.2;
   reflection+=texture2D(lakeReflection,reflectedUV+blur).rgb*.2;
   reflection+=texture2D(lakeReflection,reflectedUV-blur).rgb*.2;
   reflection+=texture2D(lakeReflection,reflectedUV+vec2(blur.x,-blur.y)).rgb*.2;
   reflection+=texture2D(lakeReflection,reflectedUV+vec2(-blur.x,blur.y)).rgb*.2;
   float fresnel=.5+.5*pow(1.0-abs(dot(normal,normalize(vViewPosition))),3.0);
   gl_FragColor.rgb=mix(gl_FragColor.rgb,reflection,reflectionStrength*fresnel);
  }`,
      );
  };
  material.customProgramCacheKey = () => "lake-ripples-planar-reflection-v1";
  material.needsUpdate = true;
  let frames = 0,
    lastQuality = "";
  return {
    update(quality) {
      strength.value = quality === "low" ? 0 : quality === "high" ? 0.2 : 0.14;
      if (quality === "low") return;
      if (
        ++frames % (quality === "high" ? 8 : 12) !== 0 &&
        quality === lastQuality
      )
        return;
      lastQuality = quality;
      camera.updateMatrixWorld();
      scene.updateMatrixWorld(true);
      const visibility = water.map((o) => o.visible);
      water.forEach((o) => (o.visible = false));
      try {
        mirror.onBeforeRender(renderer, scene, camera);
        projection
          .copy(mirror.material.uniforms.textureMatrix.value)
          .multiply(mirror.matrixWorld.clone().invert());
      } finally {
        water.forEach((o, i) => (o.visible = visibility[i]));
        mirror.visible = false;
      }
    },
    dispose() {
      mirror.dispose();
      mirror.geometry.dispose();
      scene.remove(mirror);
    },
  };
}
