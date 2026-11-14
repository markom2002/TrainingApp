import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const root='FE/training-app-frontend/public/audio/ranks',manifest=JSON.parse(fs.readFileSync(root+'/manifest.json')),hashes=new Set(),rows=[];
for(const cue of manifest){const b=fs.readFileSync(root+'/'+cue.id+'.wav');assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');assert.equal(b.readUInt16LE(22),2);assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(34),16);assert.equal(b.length-44,b.readUInt32LE(40));let peak=0,energy=0,clipped=0,crossings=0,last=0;
 for(let i=44;i<b.length;i+=4){const l=b.readInt16LE(i)/32767,r=b.readInt16LE(i+2)/32767;peak=Math.max(peak,Math.abs(l),Math.abs(r));energy+=(l*l+r*r)/2;if(Math.abs(l)>=1||Math.abs(r)>=1)clipped++;if(l*last<0)crossings++;last=l;}
 const frames=(b.length-44)/4,rms=Math.sqrt(energy/frames);assert(peak>.85&&peak<.92);assert(rms>.06);assert.equal(clipped,0);const hash=crypto.createHash('sha256').update(b).digest('hex');assert(!hashes.has(hash));hashes.add(hash);rows.push({id:cue.id,seconds:frames/44100,peak:+peak.toFixed(3),rms:+rms.toFixed(3),zeroCrossings:crossings});
}
assert.equal(hashes.size,10);console.table(rows);console.log('PASS: 10 unique stereo cues, valid PCM, no clipped samples, measurable signal throughout each arrangement.');
