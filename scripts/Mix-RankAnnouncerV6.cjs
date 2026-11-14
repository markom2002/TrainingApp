// Browser decoding supports the source OGG and Windows PCM voice without an encoder dependency.
const fs=require('fs'),path=require('path');
const {chromium}=require(path.join(process.env.TEMP,'form-ui-check/node_modules/playwright'));
(async()=>{const browser=await chromium.launch({executablePath:'C:/Users/Marija/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',headless:true});try{
const page=await browser.newPage();const names=['iron','bronze','silver','gold','platinum','diamond','elite','master','legend'];
const impacts=[.13,.34,.26,.49,.68,.57,.90,1,1.15];
const files=fs.readdirSync('artifacts/rank-sources-v6').filter(n=>n.endsWith('.ogg')&&!n.includes('Glass'));if(files.length<3)throw Error('Missing licensed impact sources');
const sources=Object.fromEntries([...files,...names.map(n=>n+'-voice.mp3')].map(n=>[n,fs.readFileSync('artifacts/rank-sources-v6/'+n).toString('base64')]));
const report=[];
for(let tier=0;tier<names.length;tier++){
const result=await page.evaluate(async({sources,tier,name,impact,files})=>{
 const rate=44100,context=new OfflineAudioContext(2,rate*7,rate),decoded={};for(const [key,b64] of Object.entries(sources)){const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));decoded[key]=await context.decodeAudioData(bytes.buffer);}
 const duration=2.9+tier*.22,frames=Math.ceil(duration*rate),left=new Float32Array(frames),right=new Float32Array(frames);
 const voice=decoded[name+'-voice.mp3'],raw=voice.getChannelData(0);let first=0,last=raw.length-1;while(first<last&&Math.abs(raw[first])<.009)first++;while(last>first&&Math.abs(raw[last])<.009)last--;
 const voiceStart=impact+.19,voiceRate=1,voiceLength=(last-first)/voice.sampleRate/voiceRate;
 function add(buffer,at,speed,level,pan=0,reverse=false){const data=buffer.getChannelData(0),length=Math.min(frames-Math.floor(at*rate),Math.ceil(data.length/buffer.sampleRate*rate/speed));let low=0;for(let i=0;i<length;i++){const pos=i*buffer.sampleRate/rate*speed,k=Math.floor(pos),f=pos-k,index=reverse?data.length-1-k:k;let v=(data[index]??0)*(1-f)+(data[reverse?index-1:index+1]??0)*f;low+=.65*(v-low);v=low*.35+v*.65;const t=at+i/rate,duck=t>voiceStart-.04&&t<voiceStart+voiceLength+.13?.24:1;const out=Math.floor(at*rate)+i;left[out]+=v*level*duck*(1-pan*.3);right[out]+=v*level*duck*(1+pan*.3);}}
 // Each tier uses different recorded transients, rhythm, pitch and stereo movement.
 const main=decoded[files[tier%files.length]],accent=decoded[files[(tier+2)%files.length]];
 add(accent,Math.max(0,impact-.22),1.1,.38,-.7,true);add(main,impact,.78-tier*.025,1.35);
 add(accent,impact+.045,1.6,.42,-.5);
 if(tier%3===1){add(accent,impact+.10,.9,.52,.7);add(main,impact+.19,1.25,.32,-.7);}
 if(tier%3===2){add(accent,impact+.08,1.45,.55,-.8);add(accent,impact+.21,.72,.42,.8);}
 const finish=voiceStart+voiceLength+.23;add(accent,finish,.8, tier>4?.65:.35,.5);
 if(tier>5){add(main,finish+.12,.68,.55,-.6);add(accent,finish+.28,1.2,.30,.7);}
 // Short detuned brass stabs carry the victory motif above the bass, audible on phone speakers.
 const motifs=[[0],[0,7],[0,3,10],[0,7,12],[0,5,12],[0,7,15],[0,3,7,12],[0,7,10,19],[0,7,12,19,24]];
 const noteStart=impact+.04;
 motifs[tier].forEach((note,n)=>{const at=noteStart+n*.055,d=.30+(tier/8)*.18,freq=110*Math.pow(2,note/12);for(let j=0;j<d*rate;j++){const out=Math.floor(at*rate)+j;if(out>=frames)break;const t=j/rate,env=Math.min(1,t/.012)*Math.pow(1-t/d,1.5);let v=0;for(let h=1;h<=6;h++)v+=(Math.sin(2*Math.PI*freq*h*t)+.38*Math.sin(2*Math.PI*freq*1.006*h*t))*Math.exp(-h*.3)/h;v=Math.tanh(v*1.6)*env*.12;left[out]+=v;right[out]+=v;}});
 let seed=9001+tier;let filtered=0;for(let i=0;i<frames;i++){const t=i/rate,age=t-impact;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;filtered+=.075*(noise-filtered);let fx=0;
  if(age>=0){const env=Math.exp(-age*(5-tier*.22));fx+=(Math.sin(2*Math.PI*(48*age+3*(1-Math.exp(-age*14))))*.53+Math.sin(2*Math.PI*96*age)*.14)*env;fx+=filtered*.85*Math.exp(-age*9);}
  if(t<impact&&impact>0)fx+=filtered*(t/impact)**3*.5;
  if(t>voiceStart-.04&&t<voiceStart+voiceLength+.13)fx*=.20;
  left[i]+=fx;right[i]+=fx;
 }
 // Rendered synthetic announcer: gently lowered pitch, compression, short slap and dark room.
 let peakVoice=0;for(let j=first;j<=last;j++)peakVoice=Math.max(peakVoice,Math.abs(raw[j]));
 for(let i=0;i<Math.ceil(voiceLength*rate);i++){const pos=first+i*voice.sampleRate/rate*voiceRate,k=Math.floor(pos),f=pos-k;const v=Math.tanh(((raw[k]??0)*(1-f)+(raw[k+1]??0)*f)/Math.max(.01,peakVoice)*1.15)*.68;const out=Math.floor(voiceStart*rate)+i;if(out>=frames)break;left[out]+=v;right[out]+=v;for(const [delay,gain] of [[.085,.035],[.16,.02]]){const at=out+Math.floor(delay*rate);if(at<frames){left[at]+=v*gain;right[at]+=v*gain*.85;}}}
 let peak=0;for(let i=0;i<frames;i++){left[i]=Math.tanh(left[i]*1.3);right[i]=Math.tanh(right[i]*1.3);peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));}
 const gain=.89/peak,pcm=new Int16Array(frames*2);let energy=0;for(let i=0;i<frames;i++){const fade=Math.min(1,i/(rate*.005),(frames-1-i)/(rate*.04)),l=left[i]*gain*fade,r=right[i]*gain*fade;pcm[i*2]=Math.round(l*32767);pcm[i*2+1]=Math.round(r*32767);energy+=(l*l+r*r)/2;}
 const bytes=new Uint8Array(pcm.buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {pcm:btoa(binary),duration,voiceStart,voiceLength,rms:Math.sqrt(energy/frames),sample:files[tier%files.length]};
},{sources,tier,name:names[tier],impact:impacts[tier],files});
const pcm=Buffer.from(result.pcm,'base64'),wav=Buffer.alloc(44+pcm.length);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(176400,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(pcm.length,40);pcm.copy(wav,44);fs.writeFileSync('FE/training-app-frontend/public/audio/ranks/'+names[tier]+'.wav',wav);delete result.pcm;report.push({id:names[tier],...result});}
const old=JSON.parse(fs.readFileSync('FE/training-app-frontend/public/audio/ranks/manifest.json'));report.push(old.find(x=>x.id==='achievement'));fs.writeFileSync('FE/training-app-frontend/public/audio/ranks/manifest.json',JSON.stringify(report,null,2));console.table(report);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
