import * as T from 'three';
import type { ExercisePose, V3 } from './motion-3d';
import { palmFrame } from './grip-frame';
import { solveLimb } from './rig-math';
import { preserveJointVolume } from './joint-volume';
const vec = (p: V3) => new T.Vector3(...p),
  arr = (v: T.Vector3) => v.toArray() as V3;
interface BoneState {
  bone: T.Bone;
  rest: T.Matrix4;
  region: string;
  grip?: T.Matrix4;
}
export class AthleteRig {
  private bones = new Map<string, T.Bone>();
  private states: BoneState[] = [];
  private restPosition = new Map<string, T.Vector3>();
  private palmRest = new Map<string,T.Quaternion>();
  private gripCenters = new Map<string,T.Vector3>();
  private rootRest!: T.Vector3;
  private meshes: T.SkinnedMesh[] = [];
  private muscleActivity = new Map<T.SkinnedMesh, Float32Array>();
  private contraction = 0;
  readonly hands: [T.Vector3, T.Vector3] = [new T.Vector3(), new T.Vector3()];
  readonly feet: [T.Vector3, T.Vector3] = [new T.Vector3(), new T.Vector3()];
  readonly joints: V3[] = [];
  readonly handRotations: [T.Quaternion, T.Quaternion] = [
    new T.Quaternion(),
    new T.Quaternion(),
  ];
  constructor(readonly model: T.Group) {
    model.updateMatrixWorld(true);
    model.traverse((object) => {
      if ((object as T.Bone).isBone) {
        const bone = object as T.Bone;
        this.bones.set(bone.name, bone);
        this.restPosition.set(
          bone.name,
          bone.getWorldPosition(new T.Vector3()),
        );
      }
    });
    this.rootRest = this.position('root').clone();
    model.traverse((object) => {
      if ((object as T.Bone).isBone) {
        const bone = object as T.Bone;
        let region = 'body';
        for (let n: T.Object3D | null = bone; n; n = n.parent) {
          if (/^wrist[LR]$/.test(n.name)) {
            region = 'hand' + n.name.at(-1);
            break;
          }
          if (/^lowerarm01[LR]$/.test(n.name)) {
            region = 'forearm' + n.name.at(-1);
            break;
          }
          if (/^upperarm01[LR]$/.test(n.name)) {
            region = 'arm' + n.name.at(-1);
            break;
          }
          if (/^foot[LR]$/.test(n.name)) {
            region = 'foot' + n.name.at(-1);
            break;
          }
          if (/^lowerleg01[LR]$/.test(n.name)) {
            region = 'shin' + n.name.at(-1);
            break;
          }
          if (/^upperleg01[LR]$/.test(n.name)) {
            region = 'thigh' + n.name.at(-1);
            break;
          }
          if (n.name === 'neck01') {
            region = 'head';
            break;
          }
          if (/^pelvis[LR]$/.test(n.name) || n.name === 'root') {
            region = 'pelvis';
            break;
          }
          if (n.name === 'spine05') break;
        }
        this.states.push({ bone, rest: bone.matrixWorld.clone(), region });
        bone.matrixAutoUpdate = false;
        bone.matrixWorldAutoUpdate = false;
      }
      if ((object as T.SkinnedMesh).isSkinnedMesh) {
        const mesh = object as T.SkinnedMesh;
        mesh.frustumCulled = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = new T.MeshStandardMaterial({
          color: 0xffffff,
          vertexColors: true,
          metalness: 0.0,
          roughness: 0.72,
        });
        preserveJointVolume(mesh.material as T.Material);
        mesh.customDepthMaterial = new T.MeshDepthMaterial({depthPacking: T.RGBADepthPacking});
        preserveJointVolume(mesh.customDepthMaterial);
        this.meshes.push(mesh);
        const color = mesh.geometry.getAttribute('color');
        mesh.geometry.userData['restColors'] = color
          ? new Float32Array(color.array)
          : new Float32Array(
              mesh.geometry.attributes['position'].count * 3,
            ).fill(0.2);
      }
    });
    for(const side of ['R','L']){
      const wrist=this.position('wrist'+side),middle=this.position('finger3-1'+side);
      this.palmRest.set(side,palmFrame(middle.clone().sub(wrist),this.position('finger2-1'+side).clone().sub(this.position('finger5-1'+side))));
      const normal=new T.Vector3(0,0,1).applyQuaternion(this.palmRest.get(side)!);
      this.gripCenters.set(side,wrist.clone().lerp(middle,.75).addScaledVector(normal,side==='R'?.015:-.015));
    }
    // Close the actual finger joints around the grip, retaining open palms for floor support.
    const corrections = new Map<T.Object3D, T.Matrix4>();
    for (const state of this.states) {
      if (!state.region.startsWith('hand')) continue;
      const side = state.region.at(-1)!;
      let correction =
        corrections.get(state.bone.parent!)?.clone() ?? new T.Matrix4();
      if (/^finger\d-\d/.test(state.bone.name)) {
        const pivot = this.position(state.bone.name)
          .clone()
          .applyMatrix4(correction);
        const axis = new T.Vector3()
          .setFromMatrixColumn(state.rest, 0)
          .normalize()
          .transformDirection(correction);
        const child = state.bone.children.find((n) => (n as T.Bone).isBone);
        const end = (
          child
            ? this.position(child.name).clone()
            : new T.Vector3(0, 0.025, 0).applyMatrix4(state.rest)
        ).applyMatrix4(correction);
        const palm = this.gripCenters.get(side)!.clone();
        const positive = end
          .clone()
          .sub(pivot)
          .applyAxisAngle(axis, 0.85)
          .add(pivot)
          .distanceToSquared(palm);
        const negative = end
          .clone()
          .sub(pivot)
          .applyAxisAngle(axis, -0.85)
          .add(pivot)
          .distanceToSquared(palm);
        correction = this.rigid(
          pivot,
          new T.Quaternion().setFromAxisAngle(
            axis,
            (positive < negative ? 1 : -1) * (state.bone.name.startsWith('finger1-') ? .55 : state.bone.name.includes('-1') ? 1.05 : 1.15),
          ),
          pivot,
        ).multiply(correction);
      }
      state.grip = correction;
      corrections.set(state.bone, correction);
    }
  }
  private position(name: string) {
    const p = this.restPosition.get(name);
    if (!p) throw new Error('Missing athlete joint: ' + name);
    return p;
  }
  private rigid(at: T.Vector3, q: T.Quaternion, restAt: T.Vector3) {
    return new T.Matrix4()
      .makeTranslation(at.x, at.y, at.z)
      .multiply(new T.Matrix4().makeRotationFromQuaternion(q))
      .multiply(
        new T.Matrix4().makeTranslation(-restAt.x, -restAt.y, -restAt.z),
      );
  }
  private segment(a: T.Vector3, b: T.Vector3, toA: T.Vector3, toB: T.Vector3) {
    return this.rigid(
      toA,
      new T.Quaternion().setFromUnitVectors(
        b.clone().sub(a).normalize(),
        toB.clone().sub(toA).normalize(),
      ),
      a,
    );
  }
  private limbSegment(a:T.Vector3,b:T.Vector3,reference:T.Vector3,toA:T.Vector3,toB:T.Vector3,toReference:T.Vector3) {
    // Match the elbow's bend plane as well as its axis. A shortest-arc quaternion alone
    // allows the arm to roll inside out when the athlete raises or bends it.
    const frame=(start:T.Vector3,end:T.Vector3,pole:T.Vector3)=>{
      const y=end.clone().sub(start).normalize();
      let x=pole.clone().sub(start).addScaledVector(y,-pole.clone().sub(start).dot(y));
      if(x.lengthSq()<1e-8)x=new T.Vector3(0,0,1).addScaledVector(y,-y.z);
      return palmFrame(y,x);
    };
    const q=frame(toA,toB,toReference).multiply(frame(a,b,reference).invert());
    return this.rigid(toA,q,a);
  }
  contract(progress:number) {
    const amount=Math.sin(Math.max(0,Math.min(1,progress))*Math.PI/2);
    if(Math.abs(amount-this.contraction)<.025)return;
    this.contraction=amount;
    for(const mesh of this.meshes){
      const rest=mesh.geometry.userData['sculptPositions'] as Float32Array;
      const normals=mesh.geometry.userData['sculptNormals'] as Float32Array;
      const mask=this.muscleActivity.get(mesh);
      if(!rest||!mask)continue;
      const p=mesh.geometry.getAttribute('position');
      for(let i=0;i<p.count;i++){
        const bulge=mask[i]*amount*.0035;
        p.setXYZ(i,rest[i*3]+normals[i*3]*bulge,rest[i*3+1]+normals[i*3+1]*bulge,rest[i*3+2]+normals[i*3+2]*bulge);
      }
      p.needsUpdate=true;
    }
  }
  update(p: ExercisePose) {
    const bodyQ = new T.Quaternion()
      .setFromEuler(new T.Euler(p.tilt, 0, 0))
      .multiply(
        new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), p.twist),
      );
    const body = this.rigid(vec(p.hip), bodyQ, this.rootRest),
      pelvis = this.rigid(vec(p.hip), new T.Quaternion(), this.rootRest);
    const spinePivot = this.rootRest.clone().add(new T.Vector3(0, 0.2, 0.02));
    const bendQ = new T.Quaternion().setFromAxisAngle(
      new T.Vector3(1, 0, 0),
      p.spineBend ?? 0,
    );
    const upperBody = body
      .clone()
      .multiply(this.rigid(spinePivot, bendQ, spinePivot));
    const upperQ = bodyQ.clone().multiply(bendQ);
    const transforms: Record<string, T.Matrix4> = { body, pelvis };
    const headBase = this.position('neck01'),
      headAt = headBase.clone().applyMatrix4(upperBody);
    transforms['head'] = this.rigid(
      headAt,
      p.headTilt === undefined
        ? upperQ
        : new T.Quaternion().setFromAxisAngle(
            new T.Vector3(1, 0, 0),
            p.headTilt,
          ),
      headBase,
    );
    this.joints.length = 0;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 'R' : 'L';
      const arm = this.position('upperarm01' + side),
        elbow = this.position('lowerarm01' + side),
        wrist = this.position('wrist' + side);
      const shoulderAt = arm.clone().applyMatrix4(upperBody);
      let a = solveLimb(
        arr(shoulderAt),
        p.hands[i],
        p.elbows[i],
        arm.distanceTo(elbow),
        elbow.distanceTo(wrist),
      );
      const grip = p.handGrips?.[i] ?? p.grip;
      const across = grip === 'neutral'
        ? new T.Vector3(0, 0, 1).applyQuaternion(bodyQ)
        : new T.Vector3(i === 0 ? 1 : -1, 0, 0).applyQuaternion(bodyQ);
      if (grip === 'supinated') across.negate();
      const orientation = () => {
        const forearm = vec(a.end).sub(vec(a.joint)).normalize();
        const along = grip === 'open' ? new T.Vector3(0, 0, 1) : forearm;
        // Carry a neutral wrist with the forearm through its arc. Projecting a
        // fixed forward axis flips the hand by 180 degrees at a horizontal curl.
        const palmAcross = grip === 'neutral'
          ? new T.Vector3(0, 0, 1).applyQuaternion(bodyQ).applyQuaternion(
              new T.Quaternion().setFromUnitVectors(new T.Vector3(0, -1, 0).applyQuaternion(bodyQ), forearm),
            )
          : across;
        const worldPalm = palmFrame(along, palmAcross);
        const delta = worldPalm.multiply(this.palmRest.get(side)!.clone().invert());
        if (p.wristFlex) delta.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0), p.wristFlex));
        return delta;
      };
      // Solve the elbow against the actual palm contact, including the rigid
      // wrist-to-palm offset. A wrist-only iterative solve has multiple branches
      // in dips and can jump between them near a horizontal forearm.
      let fixedHand: T.Quaternion | undefined;
      if (p.handContacts) {
        const gripRest = this.gripCenters.get(side)!;
        const restAxis = gripRest.clone().sub(elbow).normalize();
        const contact = vec(p.handContacts[i]);
        const solution = solveLimb(arr(shoulderAt), arr(contact), p.elbows[i], arm.distanceTo(elbow), elbow.distanceTo(gripRest));
        const elbowAt = vec(solution.joint);
        const direction = vec(solution.end).sub(elbowAt).normalize();
        const restAcross = new T.Vector3(1,0,0).applyQuaternion(this.palmRest.get(side)!);
        const contactAcross = grip === 'neutral'
          ? new T.Vector3(0,0,1).applyQuaternion(bodyQ).applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,-1,0).applyQuaternion(bodyQ),direction))
          : across;
        fixedHand = palmFrame(direction,contactAcross).multiply(palmFrame(restAxis,restAcross).invert());
        const wristTarget = wrist.clone().sub(elbow).applyQuaternion(fixedHand).add(elbowAt);
        a = {joint: solution.joint, end: arr(wristTarget), error: solution.error};
      }
      const wristAt = vec(a.end), delta = fixedHand ?? orientation();
      // Swing the humerus relative to the torso. Using the wrist as its roll
      // reference can spin the shoulder through 180 degrees as the elbow bends.
      const upperSwing = new T.Quaternion().setFromUnitVectors(
        elbow.clone().sub(arm).normalize().applyQuaternion(upperQ),
        vec(a.joint).sub(shoulderAt).normalize(),
      ).multiply(upperQ);
      transforms['arm' + side] = this.rigid(shoulderAt, upperSwing, arm);
      // Let the forearm follow pronation/supination of the palm instead of
      // leaving its skin in the elbow plane while rotating the hand separately.
      const restAcross = new T.Vector3(1, 0, 0).applyQuaternion(this.palmRest.get(side)!);
      const worldAcross = restAcross.clone().applyQuaternion(delta);
      transforms['forearm' + side] = this.limbSegment(
        elbow, wrist, wrist.clone().add(restAcross),
        vec(a.joint), wristAt, wristAt.clone().add(worldAcross),
      );
      const hand=this.rigid(wristAt,delta,wrist);
      transforms['hand'+side]=hand;
      this.hands[i].copy(this.gripCenters.get(side)!).applyMatrix4(hand);
      this.handRotations[i].copy(delta).multiply(this.palmRest.get(side)!);
      const hip = this.position('upperleg01' + side),
        knee = this.position('lowerleg01' + side),
        ankle = this.position('foot' + side),
        hipAt = hip.clone().applyMatrix4(pelvis);
      const l = solveLimb(
        arr(hipAt),
        p.feet[i],
        p.knees[i],
        hip.distanceTo(knee),
        knee.distanceTo(ankle),
      );
      transforms['thigh' + side] = this.segment(hip, knee, hipAt, vec(l.joint));
      transforms['shin' + side] = this.segment(
        knee,
        ankle,
        vec(l.joint),
        vec(l.end),
      );
      transforms['foot' + side] = this.rigid(
        vec(l.end),
        new T.Quaternion().setFromAxisAngle(
          new T.Vector3(1, 0, 0),
          p.footTilt ?? 0,
        ),
        ankle,
      );
      this.feet[i].fromArray(l.end);
      this.joints.push(
        arr(shoulderAt),
        a.joint,
        a.end,
        arr(hipAt),
        l.joint,
        l.end,
      );
    }
    for (const state of this.states) {
      state.bone.matrixWorld.copy(transforms[state.region] ?? body);
      if (
        state.region === 'body' &&
        this.position(state.bone.name).y > spinePivot.y
      )
        state.bone.matrixWorld.copy(upperBody);
      const handGrip = p.handGrips?.[state.region.endsWith('R') ? 0 : 1] ?? p.grip;
      if (state.grip && handGrip !== 'open')
        state.bone.matrixWorld.multiply(state.grip);
      state.bone.matrixWorld.multiply(state.rest);
    }
    this.model.traverse((n) => {
      if ((n as T.SkinnedMesh).isSkinnedMesh)
        (n as T.SkinnedMesh).skeleton.update();
    });
  }
  highlight(group:string,id:string){
    const active=new T.Color('#ff502b'),hot=new T.Color('#ffbd69');
    const g=(n:number,w:number)=>Math.exp(-((n/w)**2));
    const ease=(a:number,b:number,n:number)=>{const t=Math.max(0,Math.min(1,(n-a)/(b-a)));return t*t*(3-2*t);};
    for(const mesh of this.meshes){
      const geo=mesh.geometry,p=geo.getAttribute('position'),rest=geo.userData['restColors'] as Float32Array,colors=new Float32Array(rest),indices=geo.getAttribute('skinIndex'),weights=geo.getAttribute('skinWeight');
      if(!geo.userData['sculptPositions']){
        geo.userData['sculptPositions']=new Float32Array(p.array);
        geo.userData['sculptNormals']=new Float32Array(geo.getAttribute('normal').array);
      }
      const sculpt=geo.userData['sculptPositions'] as Float32Array;
      p.array.set(sculpt);p.needsUpdate=true;
      const activity=new Float32Array(p.count);
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i),ax=Math.abs(x),front=ease(-.01,.07,z),back=1-ease(-.055,.015,z);
        let upper=0,lower=0,thigh=0,shin=0;
        for(let k=0;k<4;k++){const w=weights.getComponent(i,k),name=mesh.skeleton.bones[indices.getComponent(i,k)]?.name??'';if(/upperarm/.test(name))upper+=w;if(/lowerarm/.test(name))lower+=w;if(/upperleg/.test(name))thigh+=w;if(/lowerleg/.test(name))shin+=w;}
        const chest=g(ax-.105,.105)*g(y-1.355,.078)*front;
        const latWidth=.055+.65*Math.max(0,Math.min(.22,y-1.12));
        const lat=g(ax-latWidth,.065)*g(y-1.275,.135);
        const trapezius=g(ax-.052,.055)*g(y-1.415,.09);
        const scapula=g(ax-.137,.055)*g(y-1.365,.055);
        const dorsal=Math.max(lat,trapezius*.72,scapula*.82)*back*(1-.85*g(x,.017));
        const core=g(x,.12)*g(y-1.16,.12)*front;
        const posterior=['reverse-fly','face-pull'].includes(id);
        const shoulder=g(ax-.225,.068)*g(y-1.423,.067)*(posterior?back:.8+.2*front);
        const glute=g(ax-.10,.10)*g(y-.94,.09)*back;
        const masks:Record<string,number>={Chest:chest,Back:dorsal,Core:core,Shoulders:shoulder,Biceps:upper*g(y-1.30,.095)*front,Triceps:upper*g(y-1.30,.10)*back,Forearms:lower,Quads:thigh*front,Hamstrings:thigh*back,Calves:shin*back,Glutes:glute};
        let mask=masks[group]??0;
        if(group==='Full body')mask=Math.max(chest,dorsal,core,thigh*.8,glute);
        if(group==='Cardio')mask=Math.max(thigh*.7,shin*.6,id==='rowing'?dorsal:0);
        if(group==='Mobility')mask=id==='thoracic-rotation'?dorsal:thigh*.65;
        const cloth=ease(.745,.785,y)*(1-ease(1.005,1.025,y))*(1-ease(.24,.29,ax));
        if(group!=='Glutes'&&group!=='Full body')mask*=1-cloth;
        activity[i]=Math.max(0,mask);
        const blend=Math.min(.96,Math.max(0,mask)*1.65),c=active.clone().lerp(hot,Math.max(0,mask-.55)*.65);
        // Keep the sculpt's anatomical seams and fibres visible under the muscle tint.
        const luminance=.2126*rest[i*3]+.7152*rest[i*3+1]+.0722*rest[i*3+2];
        c.multiplyScalar(Math.max(.65,Math.min(1.25,luminance/.46)));
        colors[i*3]=rest[i*3]*(1-blend)+c.r*blend;colors[i*3+1]=rest[i*3+1]*(1-blend)+c.g*blend;colors[i*3+2]=rest[i*3+2]*(1-blend)+c.b*blend;
      }
      geo.setAttribute('color',new T.BufferAttribute(colors,3));
      this.muscleActivity.set(mesh,activity);
    }
    this.contraction=-1;
  }
  dispose() {
    for (const mesh of this.meshes) mesh.customDepthMaterial?.dispose();
    new Set(this.meshes.map((mesh) => mesh.skeleton)).forEach((skeleton) =>
      skeleton.dispose(),
    );
  }
}
