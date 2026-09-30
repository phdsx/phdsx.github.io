import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

// Gentle contact occlusion in scene metres. No bloom, vignette or depth of field.
export function rendering(renderer,scene,camera,excluded){
 const composer=new EffectComposer(renderer),image=new RenderPass(scene,camera),ao=new SSAOPass(scene,camera,innerWidth,innerHeight,16);
 ao.kernelRadius=2.8;ao.minDistance=.000012;ao.maxDistance=.0006;
 ao.ssaoMaterial.fragmentShader=ao.ssaoMaterial.fragmentShader.replace('1.0 - occlusion','1.0 - occlusion * 0.65');
 const originalRender=ao.render.bind(ao);
 ao.render=(...args)=>{const hidden=[...excluded];scene.traverse(o=>{if(o.userData.skipAO)hidden.push(o);});const states=hidden.map(o=>o.visible);hidden.forEach(o=>o.visible=false);try{originalRender(...args);}finally{hidden.forEach((o,i)=>o.visible=states[i]);}};
 composer.addPass(image);composer.addPass(ao);composer.addPass(new OutputPass());
 renderer.info.autoReset=false;
 function resize(){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);}
 function render(quality){ao.enabled=quality==='high';renderer.info.reset();composer.render();}
 resize();return{render,resize,composer,ao};
}
