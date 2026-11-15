import type { Material } from 'three';

// Blend rigid bone motions as dual quaternions. Linear matrix blending shrinks
// elbows and shoulders when neighbouring bones have opposing rotations.
const functions = /* glsl */ `
#ifdef USE_SKINNING
vec4 rigMultiply(vec4 a, vec4 b) {
  return vec4(a.w*b.xyz+b.w*a.xyz+cross(a.xyz,b.xyz),a.w*b.w-dot(a.xyz,b.xyz));
}
vec3 rigRotate(vec4 q, vec3 v) { return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v); }
vec4 rigRotation(mat4 m) {
  float trace=m[0][0]+m[1][1]+m[2][2];
  vec4 q;
  if(trace>0.0) {
    float s=2.0*sqrt(max(0.000001,trace+1.0));
    q=vec4((m[1][2]-m[2][1])/s,(m[2][0]-m[0][2])/s,(m[0][1]-m[1][0])/s,s*.25);
  } else if(m[0][0]>m[1][1] && m[0][0]>m[2][2]) {
    float s=2.0*sqrt(max(0.000001,1.0+m[0][0]-m[1][1]-m[2][2]));
    q=vec4(s*.25,(m[1][0]+m[0][1])/s,(m[2][0]+m[0][2])/s,(m[1][2]-m[2][1])/s);
  } else if(m[1][1]>m[2][2]) {
    float s=2.0*sqrt(max(0.000001,1.0+m[1][1]-m[0][0]-m[2][2]));
    q=vec4((m[1][0]+m[0][1])/s,s*.25,(m[2][1]+m[1][2])/s,(m[2][0]-m[0][2])/s);
  } else {
    float s=2.0*sqrt(max(0.000001,1.0+m[2][2]-m[0][0]-m[1][1]));
    q=vec4((m[2][0]+m[0][2])/s,(m[2][1]+m[1][2])/s,s*.25,(m[0][1]-m[1][0])/s);
  }
  return normalize(q);
}
#endif
`;
const blend = /* glsl */ `
#ifdef USE_SKINNING
vec4 rigQ0=rigRotation(boneMatX),rigQ1=rigRotation(boneMatY),rigQ2=rigRotation(boneMatZ),rigQ3=rigRotation(boneMatW);
rigQ1*=dot(rigQ0,rigQ1)<0.0?-1.0:1.0;
rigQ2*=dot(rigQ0,rigQ2)<0.0?-1.0:1.0;
rigQ3*=dot(rigQ0,rigQ3)<0.0?-1.0:1.0;
vec4 rigReal=rigQ0*skinWeight.x+rigQ1*skinWeight.y+rigQ2*skinWeight.z+rigQ3*skinWeight.w;
vec4 rigDual=.5*(rigMultiply(vec4(boneMatX[3].xyz,0.0),rigQ0)*skinWeight.x+rigMultiply(vec4(boneMatY[3].xyz,0.0),rigQ1)*skinWeight.y+rigMultiply(vec4(boneMatZ[3].xyz,0.0),rigQ2)*skinWeight.z+rigMultiply(vec4(boneMatW[3].xyz,0.0),rigQ3)*skinWeight.w);
float rigLength=max(length(rigReal),.00001);
rigReal/=rigLength;rigDual/=rigLength;
vec3 rigTranslation=2.0*rigMultiply(rigDual,vec4(-rigReal.xyz,rigReal.w)).xyz;
#endif
`;
export function preserveJointVolume(material: Material) {
  material.onBeforeCompile = shader => {
    shader.vertexShader=shader.vertexShader
      .replace('#include <skinning_pars_vertex>','#include <skinning_pars_vertex>\n'+functions)
      .replace('#include <skinbase_vertex>','#include <skinbase_vertex>\n'+blend)
      .replace('#include <skinning_vertex>', `
#ifdef USE_SKINNING
vec3 rigVertex=(bindMatrix*vec4(transformed,1.0)).xyz;
transformed=(bindMatrixInverse*vec4(rigRotate(rigReal,rigVertex)+rigTranslation,1.0)).xyz;
#endif`)
      .replace('#include <skinnormal_vertex>', `
#ifdef USE_SKINNING
objectNormal=mat3(bindMatrixInverse)*rigRotate(rigReal,mat3(bindMatrix)*objectNormal);
#ifdef USE_TANGENT
objectTangent=mat3(bindMatrixInverse)*rigRotate(rigReal,mat3(bindMatrix)*objectTangent);
#endif
#endif`);
  };
  material.customProgramCacheKey=()=> 'athlete-rigid-skin-v1';
}
