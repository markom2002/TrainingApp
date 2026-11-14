import * as T from 'three';
/** An orthonormal palm frame: X across knuckles/handle, Y toward fingers. */
export function palmFrame(along:T.Vector3,across:T.Vector3){
 const y=along.clone().normalize(),x=across.clone().addScaledVector(y,-across.dot(y));
 if(x.lengthSq()<.00001)x.crossVectors(y,Math.abs(y.z)<.8?new T.Vector3(0,0,1):new T.Vector3(0,1,0));
 x.normalize();const z=new T.Vector3().crossVectors(x,y).normalize();
 return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
}
