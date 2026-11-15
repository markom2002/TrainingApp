import { build } from '../FE/training-app-frontend/node_modules/esbuild/lib/main.js';
import { mkdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const frontend = resolve('FE/training-app-frontend');
const output = resolve(frontend, '.angular/rig-validation.mjs');
await mkdir(resolve(frontend, '.angular'), {recursive:true});
try {
 await build({stdin:{contents:`
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {AthleteRig} from './src/app/components/exercise-picker/athlete-rig';
import {EXERCISE_MOTIONS} from './src/app/components/exercise-picker/motion-3d';
const b=readFileSync('public/models/athlete-v3.glb');
const g=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
const rig=new AthleteRig(g.scene);
let frames=0,maxContactError=0,maxPalmStep=0;
let previous;
for(const [id,motion] of Object.entries(EXERCISE_MOTIONS)){
 previous=undefined;
 for(let n=0;n<=40;n++){
  const pose=motion.sample(n/40);rig.update(pose);frames++;
  g.scene.traverse(object=>{
   if(object.isBone) assert(object.matrixWorld.elements.every(Number.isFinite), id+' invalid bone '+object.name);
  });
  if(id==='triceps-dip') for(let i=0;i<2;i++){
   const shoulder=rig.joints[i*6],elbow=rig.joints[i*6+1],sign=i?1:-1;
   assert(elbow[1]<shoulder[1]+.01,'dip elbow above shoulder '+n);
   assert(elbow[0]*sign>shoulder[0]*sign-.02,'dip elbow folded into torso '+n);
   const wrist=rig.joints[i*6+2],hip=rig.joints[i*6+3],knee=rig.joints[i*6+4];
   assert(Math.hypot(wrist[0]-elbow[0],wrist[2]-elbow[2])<.035,'dip forearm tilted '+n);
   assert(elbow[2]<shoulder[2]+.01,'dip elbow in front of shoulder '+n);
   assert(Math.abs(knee[0]-hip[0])<.025,'dip knee flared '+n);
   const angle=new T.Vector3(...shoulder).sub(new T.Vector3(...elbow)).angleTo(new T.Vector3(...wrist).sub(new T.Vector3(...elbow)))*180/Math.PI;
   if(n===0) assert(angle>80 && angle<115,'dip bottom elbow angle '+angle);
   if(n===40) assert(angle>150 && angle<180,'dip top elbow angle '+angle);
  }
  for(let i=0;i<2;i++){
   if(previous){const angle=previous[i].angleTo(rig.handRotations[i]);maxPalmStep=Math.max(maxPalmStep,angle);assert(angle<1.3,id+' sudden wrist flip '+angle+' phase '+n);}
   assert(Math.abs(rig.handRotations[i].length()-1)<1e-6,id+' invalid palm rotation');
   if(pose.handContacts){
    const error=rig.hands[i].distanceTo(new T.Vector3(...pose.handContacts[i]));
    maxContactError=Math.max(error,maxContactError);
    assert(error<.012,id+' detached palm '+error+' phase '+n);
   }
  }
  previous=rig.handRotations.map(q=>q.clone());
 }
}
console.log(JSON.stringify({exercises:Object.keys(EXERCISE_MOTIONS).length,frames,maxContactError,maxPalmStep}));
rig.dispose();`,resolveDir:frontend,sourcefile:'rig-validation.ts'},bundle:true,platform:'node',format:'esm',packages:'external',outfile:output});
 const result=spawnSync(process.execPath,['--single-threaded',output],{cwd:frontend,encoding:'utf8'});
 process.stdout.write(result.stdout);process.stderr.write(result.stderr);process.exitCode=result.status??1;
} finally {await unlink(output).catch(()=>{});}
