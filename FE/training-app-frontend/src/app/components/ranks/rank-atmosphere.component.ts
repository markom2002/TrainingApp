import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { RANK_FRAGMENT } from './rank-atmosphere.shader';
@Component({selector:'app-rank-atmosphere',standalone:true,template:'<canvas #stage aria-hidden="true"></canvas>',styles:[`:host{position:fixed;inset:0;pointer-events:none;z-index:-1;background:radial-gradient(ellipse at 50% 42%,color-mix(in srgb,var(--reward-color) 14%,transparent),transparent 65%)}canvas{width:100%;height:100%;display:block}`]})
export class RankAtmosphereComponent implements AfterViewInit,OnDestroy {
 @Input() tier=0; @Input() color='#b6b2bf'; @Input() secondary='#766880'; @Input() impact=.13;
 @ViewChild('stage',{static:true}) canvas!:ElementRef<HTMLCanvasElement>;
 private gl?:WebGLRenderingContext; private program?:WebGLProgram; private buffer?:WebGLBuffer;
 private frame=0; private born=0; private last=0; private size?:ResizeObserver;
 private media=matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private zone:NgZone,private host:ElementRef<HTMLElement>){}
 ngAfterViewInit(){this.zone.runOutsideAngular(()=>this.start());}
 private start(){
  const gl=this.canvas.nativeElement.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)return;
  this.gl=gl;
  const shader=(type:number,source:string)=>{const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return undefined;}return s;};
  const v=shader(gl.VERTEX_SHADER,'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}'),f=shader(gl.FRAGMENT_SHADER,RANK_FRAGMENT);
  if(!v||!f){if(v)gl.deleteShader(v);if(f)gl.deleteShader(f);return;}
  const program=gl.createProgram()!;gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);this.program=program;
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))return;
  gl.useProgram(program);this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  this.born=performance.now();this.size=new ResizeObserver(()=>this.draw(this.media.matches?3000:performance.now()-this.born));this.size.observe(this.host.nativeElement);
  this.media.addEventListener('change',this.motion);document.addEventListener('visibilitychange',this.visibility);
  this.host.nativeElement.dataset['renderer']='webgl';this.motion();
 }
 private motion=()=>{cancelAnimationFrame(this.frame);if(this.media.matches)this.draw(3000);else this.frame=requestAnimationFrame(this.tick);};
 private visibility=()=>{if(document.hidden)cancelAnimationFrame(this.frame);else this.motion();};
 private tick=(now:number)=>{if(document.hidden)return;const age=now-this.born;if(now-this.last>(age<6000?33:66)){this.last=now;this.draw(age);}this.frame=requestAnimationFrame(this.tick);};
 private draw(ms:number){
  const gl=this.gl,program=this.program;if(!gl||!program)return;const canvas=this.canvas.nativeElement;
  const box=this.host.nativeElement.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1,720/Math.max(box.width,box.height));
  const w=Math.round(box.width*ratio),h=Math.round(box.height*ratio);if(!w||!h)return;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
  const emblem=this.host.nativeElement.parentElement?.querySelector('.reveal-emblem')?.getBoundingClientRect();
  gl.uniform2f(gl.getUniformLocation(program,'resolution'),w,h);gl.uniform2f(gl.getUniformLocation(program,'center'),emblem?(emblem.x+emblem.width/2)/box.width:.5,emblem?1-(emblem.y+emblem.height/2)/box.height:.55);
  gl.uniform1f(gl.getUniformLocation(program,'time'),ms/1000);gl.uniform1f(gl.getUniformLocation(program,'tier'),this.tier);gl.uniform1f(gl.getUniformLocation(program,'impact'),this.impact);
  for(const [name,value] of [['primary',this.color],['secondary',this.secondary]]){const n=parseInt(value.replace('#',''),16);gl.uniform3f(gl.getUniformLocation(program,name),((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255);}
  gl.drawArrays(gl.TRIANGLES,0,6);
 }
 ngOnDestroy(){cancelAnimationFrame(this.frame);this.size?.disconnect();this.media.removeEventListener('change',this.motion);document.removeEventListener('visibilitychange',this.visibility);const gl=this.gl;if(gl){if(this.buffer)gl.deleteBuffer(this.buffer);if(this.program)gl.deleteProgram(this.program);gl.getExtension('WEBGL_lose_context')?.loseContext();}}
}
