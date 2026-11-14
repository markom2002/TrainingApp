const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const root='FE/training-app-frontend/public/audio/ranks/competitive-v7',manifest=JSON.parse(fs.readFileSync(root+'/manifest.json'));let peak=0,duration=0;const hashes=new Set();
for(const cue of manifest.filter(x=>x.id!=='achievement')){
 const wav=fs.readFileSync(root+'/'+cue.id+'.wav');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');assert.equal(wav.readUInt32LE(40),wav.length-44);let actual=0;
 for(let i=44;i<wav.length;i+=2)actual=Math.max(actual,Math.abs(wav.readInt16LE(i)/32767));
 assert(actual>peak,`${cue.id} must increase peak strength`);assert(cue.duration>duration);assert(actual<.91);assert(cue.voiceStart+cue.voiceLength<cue.duration);peak=actual;duration=cue.duration;hashes.add(crypto.createHash('sha256').update(wav).digest('hex'));
 console.log(cue.id, 'seconds',cue.duration.toFixed(1),'peak',actual.toFixed(3));
}assert.equal(hashes.size,9);console.log('PASS: nine unique valid cues, ascending duration and peak strength, complete voice announcements, no clipping.');
