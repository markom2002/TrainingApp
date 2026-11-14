// Original procedural stage: flowing density fields, light scattering and embers.
export const RANK_FRAGMENT = `
precision highp float;
uniform vec2 resolution;
uniform vec2 center;
uniform float time;
uniform float tier;
uniform float impact;
uniform vec3 primary;
uniform vec3 secondary;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;mat2 m=mat2(.8,-.6,.6,.8);for(int i=0;i<4;i++){n+=a*noise(p);p=m*p*2.03+7.1;a*=.5;}return n;}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;
 vec2 p=(uv-center)*vec2(resolution.x/resolution.y,1.);
 float t=time, power=tier/8.,r=length(p),a=atan(p.y,p.x);
 float age=max(0.,t-impact),arrive=smoothstep(0.,.35,t);
 float hit=exp(-age*5.)*step(impact,t);
 float wind=t*(.09+power*.09);
 vec2 drift=vec2(p.x*3.,p.y*3.-wind);
 float warp=fbm(drift*1.4+vec2(wind,0.));
 float clouds=fbm(drift*2.7+warp*2.8);
 float flame=pow(max(0.,clouds-.27),1.6)*2.4;
 float profile=exp(-r*r*(6.-power*2.));
 vec3 c=mix(primary,secondary,clamp(clouds*1.5-.3,0.,1.));
 float density=flame*profile;
 // Each tier has its own physical character, beyond a colour change.
 if(tier<.5){density*=exp(-abs(p.x)*5.);density*=smoothstep(-.6,.2,p.y);}
 else if(tier<1.5){density*=1.+sin(p.y*13.-t*2.+warp*4.)*.45;}
 else if(tier<2.5){density*=.55+.8*pow(abs(sin(a*2.+warp*3.-t*.2)),3.);}
 else if(tier<3.5){density+=exp(-r*7.)*.22;density*=1.+.4*sin(a*3.+t*.2+warp*3.);}
 else if(tier<4.5){density*=.6+.8*pow(sin(p.x*9.+warp*5.+wind)*.5+.5,2.);}
 else if(tier<5.5){density*=.4+1.3*pow(abs(sin(a*3.+warp*4.+t*.3)),3.);c=mix(c,vec3(.85,.95,1.),flame*.35);}
 else if(tier<6.5){density*=1.2;density*=smoothstep(.03,.17,r);c=mix(c,secondary,sin(a+wind)*.5+.5);}
 else if(tier<7.5){float wings=exp(-pow((abs(p.x)-.25-p.y*.4)*5.,2.))*exp(-p.y*p.y*13.);density+=wings*flame*.6;}
 else {float spiral=pow(max(0.,sin(a*2.-r*13.+warp*5.-t*.4)),4.);density+=spiral*flame*profile*.55;c=mix(c,vec3(1.,.8,.38),spiral*.5);}
 // Saturated arena field and broad graphic energy blades, inspired by ranked game reveals.
 vec3 arena=mix(primary,secondary,.6)*(.12+power*.09)*exp(-r*r*1.4);
 float sweep=a+t*(.035+power*.035);
 float blades=pow(max(0.,sin(sweep*(5.+floor(tier*.5))+r*2.)),8.);
 float fan=blades*smoothstep(.12,.3,r)*exp(-r*2.3)*(.17+power*.20);
 float burst=exp(-age*2.1)*step(impact,t);
 float energy=pow(max(0.,sin(a*7.-r*4.+warp*2.)),12.)*exp(-r*2.)*burst;
 vec3 color=arena*arrive+c*density*(.7+power*.65)*arrive;
 color+=primary*fan*arrive+mix(primary,vec3(1.),.45)*energy*(.7+power*.65);
 float front=abs(r-age*(1.5+power*.6));
 color+=primary*exp(-front*front*190.)*exp(-age*3.)*step(impact,t)*(.35+power*.45);
 // One soft cinematic impact followed by drifting embers, no repeated flash.
 color+=mix(primary,vec3(1.),.35)*exp(-r*r*18.)*hit*.7;
 color+=secondary*exp(-r*r*28.)*(.1+power*.08)*arrive;
 vec2 particles=p*vec2(19.,15.);particles.y-=t*(.45+power*.5);
 vec2 cell=floor(particles),f=fract(particles)-.5;
 float seed=hash(cell),spark=exp(-dot(f,f)*180.);
 float shimmer=pow(sin(t*1.2+seed*30.)*.5+.5,3.);
 color+=mix(primary,vec3(1.,.92,.75),.65)*spark*step(.965-power*.025,seed)*shimmer*profile*arrive;
 float vignette=1.-smoothstep(.15,.9,length((uv-.5)*vec2(1.,.8)));
 // Low tiers remain deliberately restrained. High tiers add independent energy structures.
 if(tier<.5)color=primary*exp(-r*r*17.)*.10*arrive+primary*exp(-r*r*30.)*hit*.15;
 else if(tier<1.5)color=primary*density*.28*arrive+primary*exp(-r*r*22.)*hit*.30;
 else if(tier<2.5)color=color*.32+secondary*pow(max(0.,sin(a*2.+t*.3)),12.)*exp(-r*6.)*.09;
 else if(tier<3.5)color*=.50;
 else if(tier<4.5){float curtain=pow(max(0.,sin(p.x*12.+warp*3.-t*.5)),5.);color=color*.60+primary*curtain*profile*.12;}
 else if(tier<5.5){float facets=pow(max(0.,cos(a*6.+t*.08)),18.);color=color*.75+secondary*facets*profile*.20;}
 else if(tier<6.5){float vortex=pow(max(0.,sin(a*3.-r*19.+t*.9)),9.);color+=secondary*vortex*profile*.25;color*=smoothstep(.025,.12,r);}
 else if(tier<7.5){float crest=exp(-pow((abs(p.x)-.30-p.y*.50)*12.,2.))*exp(-p.y*p.y*8.);color+=primary*crest*.45;}
 else{float corona=exp(-pow((r-.31)*18.,2.))*(.5+.5*fbm(p*12.+t*.15));color+=mix(primary,secondary,sin(a*3.+t)*.5+.5)*corona*.65;}
 gl_FragColor=vec4(color*vignette,1.);
}`;
