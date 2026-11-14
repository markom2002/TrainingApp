import { RewardAudioService } from './reward-audio.service';
describe('Reward audio loading',()=>{
 let service:RewardAudioService,request:jasmine.Spy,decode:jasmine.Spy;
 const wav=()=>{const b=new ArrayBuffer(48);new DataView(b).setUint32(0,0x52494646,false);return b;};
 const ok=()=>({ok:true,status:200,arrayBuffer:async()=>wav()}) as Response;
 beforeEach(()=>{
   decode=jasmine.createSpy('decode').and.resolveTo({duration:3});
   spyOn(window,'AudioContext').and.returnValue({state:'running',decodeAudioData:decode} as unknown as AudioContext);
   request=spyOn(window,'fetch');service=new RewardAudioService();
 });
 it('retries a transient failure and shares one in-flight request',async()=>{
   request.and.returnValues(Promise.reject(Error('network')),Promise.resolve(ok()));
   const [a,b]=await Promise.all([service.preload(2),service.preload(2)]);
   expect(a).toBe(b);expect(a).toBeDefined();expect(request).toHaveBeenCalledTimes(2);expect(service.unavailable()).toBeFalse();
 });
 it('rejects an HTML fallback before passing it to the audio decoder',async()=>{
   request.and.resolveTo({ok:true,arrayBuffer:async()=>new TextEncoder().encode('<html>fallback</html>').buffer} as Response);
   expect(await service.preload(3)).toBeUndefined();expect(decode).not.toHaveBeenCalled();expect(request).toHaveBeenCalledTimes(2);
 });
 it('does not show a playback error for an unsuccessful background preload and permits retry',async()=>{
   request.and.rejectWith(Error('offline'));expect(await service.preload(4)).toBeUndefined();expect(service.unavailable()).toBeFalse();
   request.and.resolveTo(ok());expect(await service.preload(4)).toBeDefined();
 });
 it('loads each of the nine explicit rank paths and the achievement cue',async()=>{
   request.and.resolveTo(ok());for(let i=0;i<9;i++)expect(await service.preload(i)).toBeDefined();await service.preload(0,true);
   expect(request).toHaveBeenCalledTimes(10);expect(request.calls.allArgs().every(a=>String(a[0]).includes('/competitive-v7/'))).toBeTrue();
 });
});
