import * as T from 'three';
import { palmFrame } from './grip-frame';
describe('Equipment grip alignment',()=>{
 it('keeps the handle across the palm and the fingers in line with the forearm',()=>{
   for(const direction of [[0,-1,0],[.3,-.8,.4],[-.7,0,.2],[0,1,0],[1,0,0]])for(const shaft of [[1,0,0],[0,0,1]]){
     const along=new T.Vector3(...direction).normalize(),q=palmFrame(along,new T.Vector3(...shaft));
     const gripAxis=new T.Vector3(1,0,0).applyQuaternion(q),fingers=new T.Vector3(0,1,0).applyQuaternion(q);
     expect(q.toArray().every(Number.isFinite)).toBeTrue();expect(q.length()).toBeCloseTo(1,6);
     expect(Math.abs(gripAxis.dot(along))).toBeLessThan(.00001);expect(fingers.dot(along)).toBeCloseTo(1,6);
   }
 });
});
