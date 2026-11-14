// Original FORM sound design. No audio from a game or video is sampled.
import fs from 'node:fs';
const rate=44100, PI=Math.PI, root='FE/training-app-frontend/public/audio/ranks';
fs.mkdirSync(root,{recursive:true});
const profiles=[
  ['iron',1.55,[[0,'metal',118,.55,.72],[.13,'kick',72,.30,.7],[.19,'metal',177,.46,.35],[.56,'pulse',146.83,.22,.25]]],
  ['bronze',2.05,[[0,'kick',80,.22,.6],[.14,'kick',100,.20,.55],[.34,'slam',70,.40,.7],[.37,'brass',146.83,.28,.37],[.65,'brass',220,.35,.32],[.98,'brass',293.66,.65,.28]]],
  ['silver',2.2,[[0,'whoosh',2200,.22,.33],[.24,'metal',440,.7,.43],[.28,'bell',880,.65,.27],[.46,'bell',1174.66,.8,.26],[.69,'bell',1760,.9,.18],[.26,'kick',105,.35,.48]]],
  ['gold',2.7,[[0,'whoosh',400,.45,.37],[.49,'slam',65,.45,.62],[.51,'brass',261.63,.28,.34],[.51,'brass',329.63,.28,.24],[.80,'brass',392,.26,.33],[1.06,'brass',523.25,.95,.37],[1.06,'choir',261.63,1.25,.2],[1.06,'choir',392,1.25,.14]]],
  ['platinum',2.8,[[0,'pulse',110,.12,.34],[.16,'pulse',164.81,.12,.27],[.32,'pulse',220,.12,.28],[.40,'whoosh',650,.28,.35],[.68,'growl',55,.52,.65],[.72,'bell',659.25,.70,.23],[.96,'pulse',220,.20,.26],[1.22,'bell',1318.51,1.0,.2],[1.47,'pulse',329.63,.50,.22]]],
  ['diamond',3.15,[[0,'bell',1396.91,.50,.19],[.12,'metal',2100,.33,.2],[.31,'whoosh',3400,.30,.25],[.57,'slam',95,.28,.56],[.59,'bell',698.46,1.65,.38],[.66,'bell',1046.5,1.65,.26],[.82,'bell',1567.98,1.4,.2],[1.06,'bell',2349.32,1.6,.14],[1.34,'bell',3135.96,1.3,.1],[1.68,'bell',1396.91,.8,.12]]],
  ['elite',3.4,[[0,'growl',43.65,.65,.45],[.22,'pulse',130.81,.13,.18],[.39,'pulse',155.56,.12,.18],[.55,'whoosh',180,.42,.47],[.90,'slam',52,.55,.8],[.91,'brass',130.81,.42,.34],[1.12,'brass',155.56,.32,.28],[1.34,'slam',76,.25,.32],[1.35,'brass',196,.65,.32],[1.63,'choir',261.63,1.3,.18],[1.64,'growl',65.4,.75,.29]]],
  ['master',4.1,[[0,'kick',95,.20,.36],[.14,'kick',100,.2,.32],[.29,'kick',110,.18,.32],[.43,'whoosh',250,.52,.5],[1.0,'slam',48,.65,.8],[1.02,'growl',73.42,1.0,.37],[1.04,'brass',146.83,.62,.40],[1.04,'brass',220,.62,.26],[1.72,'brass',174.61,.24,.27],[2.03,'brass',293.66,1.25,.38],[2.05,'choir',146.83,1.65,.24],[2.05,'choir',349.23,1.65,.13]]],
  ['legend',5.2,[[0,'growl',36.71,.70,.32],[.15,'bell',1174.66,.65,.15],[.46,'whoosh',120,.64,.50],[1.15,'slam',43.65,.85,.9],[1.17,'growl',55,1.18,.45],[1.20,'brass',146.83,.38,.35],[1.20,'brass',220,.38,.23],[1.58,'brass',174.61,.27,.29],[1.86,'brass',220,.28,.31],[2.2,'slam',65,.42,.38],[2.21,'brass',293.66,1.5,.40],[2.22,'brass',440,1.4,.26],[2.22,'choir',146.83,2.0,.22],[2.22,'choir',349.23,2.0,.18],[2.55,'bell',1174.66,1.8,.14],[2.95,'bell',1760,1.7,.12]]],
  ['achievement',1.25,[[0,'bell',659.25,.35,.3],[.13,'bell',880,.40,.3],[.27,'bell',1318.51,.7,.28]]],
];
function wave(t,kind,f,d,random){
 const u=t/d,fade=Math.min(1,t/.012)*Math.min(1,(d-t)/.06);let x=0;
 if(kind==='kick'){const phase=2*PI*(f*.5*t+(f*2.7)*.055*(1-Math.exp(-t/.055)));return (Math.sin(phase)+.2*Math.sin(2*phase))*Math.exp(-t*14)*fade;}
 if(kind==='slam'){return (Math.sin(2*PI*(f*t+7*(1-Math.exp(-t*8))))*.7*Math.exp(-t*6)+random()*.45*Math.exp(-t*18)+Math.sin(2*PI*220*t)*.13*Math.exp(-t*9))*fade;}
 if(kind==='metal'){for(const [ratio,level]of [[1,.6],[1.47,.27],[2.09,.23],[2.92,.18],[4.07,.1]])x+=Math.sin(2*PI*f*ratio*t)*level*Math.exp(-t*(3+ratio));return Math.tanh(x*2.4+random()*.16*Math.exp(-t*22))*.8*fade;}
 if(kind==='bell')return Math.sin(2*PI*f*t+1.8*Math.sin(2*PI*f*2.756*t)*Math.exp(-t*9))*Math.exp(-u*5)*fade;
 if(kind==='brass'){const attack=Math.min(1,t/.035),tail=Math.pow(1-u,.7);for(let h=1;h<=10;h++){const l=Math.exp(-h*(.15+u*.25))/h;x+=l*(Math.sin(2*PI*f*h*t)+.35*Math.sin(2*PI*f*1.004*h*t));}return Math.tanh(x*1.4)*attack*tail*fade;}
 if(kind==='pulse'){const carrier=Math.sin(2*PI*f*t)+.26*Math.sin(2*PI*f*3*t);return Math.tanh(2.2*carrier)*Math.exp(-u*4)*fade;}
 if(kind==='growl'){const mod=2*Math.sin(2*PI*(22*t+6*t*t)),carrier=Math.sin(2*PI*f*t+mod);return (Math.tanh(carrier*2)+.22*Math.sin(2*PI*f*3*t))*.68*Math.sin(PI*Math.min(1,u*1.1))**.6*fade;}
 if(kind==='choir'){for(let h=1;h<24;h++){const frequency=f*h,formant=Math.exp(-(((frequency-720)/260)**2))+.6*Math.exp(-(((frequency-1250)/400)**2))+.25*Math.exp(-(((frequency-2600)/650)**2));x+=Math.sin(2*PI*frequency*t+.018*Math.sin(2*PI*4.7*t))*formant/h;}return x*4*Math.sin(PI*u)**.6*fade;}
 if(kind==='whoosh'){const center=f+(1100-f)*u,osc=Math.sin(2*PI*(f*t+(3600-f)*t*t/(2*d)));return (random()*.7+osc*.3)*Math.sin(PI*u)**1.4*fade;}
 return 0;
}
// Industrial competitive redesign: no bells, chimes, choir or fanfare.
for(let rank=0;rank<profiles.length;rank++){
 const events=profiles[rank][2];
 for(const event of events){
   if(event[1]==='bell'){event[1]=rank%2===0?'pulse':'metal';event[2]=55*Math.pow(2,(rank%5)/12)+(event[0]*23);event[3]=Math.min(event[3],.42);event[4]*=1.4;}
   else if(event[1]==='brass'){event[1]='growl';event[2]=43.65+(rank*3.4)+(event[0]*12);event[3]=Math.max(.25,Math.min(.65,event[3]));}
   else if(event[1]==='choir'){event[1]='metal';event[2]=82+rank*7;event[3]=.7;event[4]*=1.5;}
   else if(event[1]==='metal'){event[2]=Math.min(180,event[2]);}
   else if(event[1]==='whoosh'){event[2]=110;}
 }
 if(rank>2&&rank<9){events.push([profiles[rank][1]-.7,'slam',48+rank*2,.4,.55]);events.push([profiles[rank][1]-.65,'growl',55+rank*3,.5,.38]);}
}
const report=[];
for(let index=0;index<profiles.length;index++){
 const [id,duration,events]=profiles[index],frames=Math.ceil(duration*rate),left=new Float32Array(frames),right=new Float32Array(frames);let seed=12345+index*7919;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 events.forEach(([at,kind,f,d,level],event)=>{const pan=(kind==='kick'||kind==='slam')?0:Math.sin(event*2.39)*.52,L=Math.sqrt((1-pan)/2),R=Math.sqrt((1+pan)/2);for(let i=0;i<Math.ceil(d*rate)&&Math.floor(at*rate)+i<frames;i++){const target=Math.floor(at*rate)+i,v=wave(i/rate,kind,f,d,random)*level;left[target]+=v*L;right[target]+=v*R;}});
 // Small asymmetric room tails add space without obscuring the attack.
 for(const [delay,amount]of [[.079,.13],[.131,.10],[.197,.065]])for(let i=frames-1;i>=Math.ceil(delay*rate);i--){left[i]+=right[i-Math.ceil(delay*rate)]*amount;right[i]+=left[i-Math.ceil((delay+.013)*rate)]*amount||0;}
 let peak=0;for(let i=0;i<frames;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));const gain=.89/Math.max(.01,peak);let energy=0;
 const wav=Buffer.alloc(44+frames*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*4,40);
 for(let i=0;i<frames;i++){const l=left[i]*gain,r=right[i]*gain;energy+=(l*l+r*r)/2;wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,l))*32767),44+i*4);wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,r))*32767),46+i*4);}
 fs.writeFileSync(root+'/'+id+'.wav',wav);report.push({id,duration,events:events.length,peak:.89,rms:+Math.sqrt(energy/frames).toFixed(4)});
}
fs.writeFileSync(root+'/manifest.json',JSON.stringify(report,null,2)+'\n');console.log(report);
