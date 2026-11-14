// Rebuild the CC0 athlete without discontinuous vertex thresholds or dominant-bone seams.
// Source and licence: public/models/README.md. Input is the unmodified publisher GLB.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const dir=path.resolve('FE/training-app-frontend/node_modules/three');const T=await import(pathToFileURL(dir+'/build/three.module.js').href);const {GLTFLoader}=await import(pathToFileURL(dir+'/examples/jsm/loaders/GLTFLoader.js').href);const {GLTFExporter}=await import(pathToFileURL(dir+'/examples/jsm/exporters/GLTFExporter.js').href);
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:application/octet-stream;base64,'+Buffer.from(result).toString('base64');this.onloadend?.();});}};
const input=process.argv[2]??'artifacts/male-base-original.glb';const b=fs.readFileSync(input),gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');gltf.scene.updateMatrixWorld(true);
const skinColor=new T.Color('#b8b8b0'),shorts=new T.Color('#24252a');const gaussian=(n,w)=>Math.exp(-((n/w)**2));const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
gltf.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const p=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal,colors=new Float32Array(p.count*3),indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
 const boneData=mesh.skeleton.bones.map(bone=>({name:bone.name,at:bone.getWorldPosition(new T.Vector3()),axis:new T.Vector3(0,1,0).transformDirection(bone.matrixWorld)}));
 for(let i=0;i<p.count;i++){
  const original=new T.Vector3().fromBufferAttribute(p,i),v=original.clone(),displacement=new T.Vector3();const x=v.x,y=v.y,z=v.z;
  // Weighted radial muscle volume, tapering smoothly at each joint.
  for(let k=0;k<4;k++){const w=weights.getComponent(i,k),bone=boneData[indices.getComponent(i,k)];if(!w||!bone)continue;
   const arm=/^upperarm/.test(bone.name),thigh=/^upperleg/.test(bone.name),forearm=/^lowerarm/.test(bone.name),calf=/^lowerleg/.test(bone.name);if(!arm&&!thigh&&!forearm&&!calf)continue;
   const delta=original.clone().sub(bone.at),along=delta.dot(bone.axis),radial=delta.addScaledVector(bone.axis,-along);
   const length=arm?.261:thigh?.441:forearm?.282:.449;
   const fullness=gaussian(along-length*.42,length*.36),growth=arm?.48:thigh?.25:forearm?.22:.30;
   displacement.addScaledVector(radial,w*growth*fullness);
  }
  v.add(displacement);
  const torso=gaussian(x,.235)*gaussian(y-1.28,.22),front=smooth(.025,.12,z),back=1-smooth(-.06,.015,z);
  // Pectoral bellies, abdominal divisions and lat spread stay continuously differentiable.
  const pec=gaussian(Math.abs(x)-.105,.082)*gaussian(y-1.355,.065);
  const abs=[1.095,1.15,1.205,1.255].reduce((n,row)=>n+gaussian(Math.abs(x)-.044,.033)*gaussian(y-row,.021),0);
  const ax=Math.abs(x),latWidth=.055+.65*Math.max(0,Math.min(.22,y-1.12));
  const lat=gaussian(ax-latWidth,.060)*gaussian(y-1.275,.135);
  const scapula=gaussian(ax-.137,.052)*gaussian(y-1.365,.052);
  const trap=gaussian(ax-.052,.048)*gaussian(y-1.415,.085);
  const erector=gaussian(ax-.032,.018)*gaussian(y-1.22,.14);
  const spine=gaussian(x,.012)*gaussian(y-1.32,.18);
  v.z+=front*(pec*.052+abs*.019)*torso;
  v.z-=back*(lat*.038+scapula*.024+trap*.024+erector*.014-spine*.012);
  v.x+=x*.25*gaussian(y-1.34,.13)*gaussian(x,.26);
  // Shallow anatomical grooves, rather than separate floating muscle objects.
  const pecEdge=gaussian(y-(1.30+.10*ax),.008)*gaussian(ax-.105,.09)*front;
  const absEdge=[1.12,1.177,1.23].reduce((n,row)=>n+gaussian(y-row,.0055),0)*gaussian(x,.085)*front;
  const latEdge=gaussian(ax-(.028+.72*Math.max(0,y-1.13)),.009)*gaussian(y-1.285,.12)*back;
  const shoulderEdge=gaussian(Math.hypot((ax-.218)*.9,y-1.415)-.065,.007)*gaussian(ax-.23,.08);
  const grooves=pecEdge*.40+absEdge*.25+spine*.50+latEdge*.32+shoulderEdge*.26;
  v.addScaledVector(new T.Vector3().fromBufferAttribute(normal,i),-.005*Math.min(1,grooves));
  // Fabric is colour only; preserve smooth skin geometry and joint continuity.
  const cloth=smooth(.745,.785,y)*(1-smooth(1.005,1.025,y))*(1-smooth(.24,.29,Math.abs(x)));
  const backFibres=(.5+.5*Math.sin((y+ax*.58)*530))*lat*back*.075;
  const pecFibres=(.5+.5*Math.sin((y-ax*.20)*550))*pec*front*.055;
  const anatomicalShade=Math.max(.40,1-grooves-backFibres-pecFibres-.20*gaussian(x,.012)*front*gaussian(y-1.24,.18));
  const c=skinColor.clone().multiplyScalar(anatomicalShade).lerp(shorts,cloth);colors.set([c.r,c.g,c.b],i*3);p.setXYZ(i,v.x,v.y,v.z);
 }
 mesh.geometry.setAttribute('color',new T.BufferAttribute(colors,3));mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();mesh.material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,metalness:0,roughness:.72});
});
const out=await new GLTFExporter().parseAsync(gltf.scene,{binary:true,onlyVisible:true});fs.writeFileSync('FE/training-app-frontend/public/models/athlete-v3.glb',Buffer.from(out));console.log('Defined anatomical athlete:',out.byteLength,'bytes');
