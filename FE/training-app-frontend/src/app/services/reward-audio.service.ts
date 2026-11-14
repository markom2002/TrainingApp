import { Injectable, signal } from '@angular/core';
import { RANK_PRESENTATION } from '../components/ranks/rank-presentation';
@Injectable({providedIn:'root'})
export class RewardAudioService {
  enabled = localStorage.getItem('form.sound') === 'on';
  volume = this.readVolume();
  readonly unavailable=signal(false);
  private context?:AudioContext;
  private active?:GainNode;
  private source?:AudioBufferSourceNode;
  private generation=0;
  private buffers=new Map<string,Promise<AudioBuffer>>();
  constructor(){document.addEventListener('pointerdown',()=>{if(this.enabled)void this.arm();});}
  private readVolume(){const value=Number(localStorage.getItem('form.volume')??.2);return Number.isFinite(value)?Math.max(0,Math.min(.6,value)):.2;}
  async arm(){try{this.context??=new AudioContext();if(this.context.state==='suspended')await this.context.resume();}catch{this.unavailable.set(true);}}
  async toggle(){this.enabled=!this.enabled;localStorage.setItem('form.sound',this.enabled?'on':'off');if(this.enabled){await this.arm();this.play(0);}else this.stop();}
  setVolume(value:number){this.volume=Math.max(0,Math.min(.6,Number.isFinite(value)?value:0));localStorage.setItem('form.volume',String(this.volume));if(this.active&&this.context)this.active.gain.setTargetAtTime(this.outputVolume,this.context.currentTime,.025);}
  private get outputVolume(){return this.volume/.6*.72;}
  private cue(tier:number,achievement=false){tier=Number.isFinite(tier)?tier:0;return achievement?'achievement':RANK_PRESENTATION[Math.max(0,Math.min(8,Math.round(tier)))].id;}
  private async decodeCue(id:string,ctx:AudioContext){
    // Reject SPA HTML fallbacks before decoding; retry transient network/decode failures.
    let failure:unknown;
    for(let attempt=0;attempt<2;attempt++)try{
      const response=await fetch('/audio/ranks/competitive-v7/'+id+'.wav',{cache:attempt?'reload':'default',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('Audio HTTP '+response.status);
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength<44||new DataView(bytes).getUint32(0,false)!==0x52494646)throw Error('Invalid WAV response');
      return await ctx.decodeAudioData(bytes);
    }catch(error){failure=error;}
    throw failure;
  }
  async preload(tier:number,achievement=false):Promise<AudioBuffer|undefined>{
    const id=this.cue(tier,achievement);let pending=this.buffers.get(id);
    try{
      if(this.context?.state==='closed'){this.context=undefined;this.buffers.clear();pending=undefined;}
      this.context??=new AudioContext();
      if(!pending){pending=this.decodeCue(id,this.context);this.buffers.set(id,pending);}
      return await pending;
    }catch{
      // A stale background preload must not delete a newer request or show a playback error.
      if(this.buffers.get(id)===pending)this.buffers.delete(id);
      return undefined;
    }
  }
  async audition(tier:number){this.unavailable.set(false);const generation=++this.generation;await this.arm();await this.start(tier,false,generation);}
  play(tier:number,achievement=false){if(!this.enabled)return;const generation=++this.generation;void this.arm().then(()=>this.start(tier,achievement,generation));}
  stop(){this.generation++;this.fade();}
  private fade(){const ctx=this.context,node=this.active,source=this.source;this.active=undefined;this.source=undefined;if(!ctx||!node)return;node.gain.cancelScheduledValues(ctx.currentTime);node.gain.setTargetAtTime(0,ctx.currentTime,.018);try{source?.stop(ctx.currentTime+.09);}catch{}setTimeout(()=>node.disconnect(),140);}
  private async start(tier:number,achievement:boolean,generation:number){
    const buffer=await this.preload(tier,achievement),ctx=this.context;
    if(generation!==this.generation)return;
    if(!buffer||!ctx||ctx.state!=='running'){this.unavailable.set(true);return;}
    this.fade();this.unavailable.set(false);
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(this.outputVolume,ctx.currentTime+.008);source.connect(gain);gain.connect(ctx.destination);this.active=gain;this.source=source;
    source.onended=()=>{source.disconnect();gain.disconnect();if(this.source===source){this.source=undefined;this.active=undefined;}};
    source.start();
  }
}
