import { EXERCISE_MOTIONS, local } from './motion-3d';
import { distance, solveLimb } from './rig-math';
describe('3D exercise choreography', () => {
  it('keeps the pull-up bar clear of the head throughout the repetition', () => {
    for (let n=0;n<=40;n++) {
      const p=EXERCISE_MOTIONS['pull-up'].sample(n/40);
      const head=local(p,[0,.69,.05]);
      expect(Math.hypot(head[1]-2.12,head[2])).withContext('head/bar clearance '+n).toBeGreaterThan(.15);
      expect(p.handContacts).toEqual([[-.37,2.12,0],[.37,2.12,0]]);
    }
  });
  it('keeps loaded bars in front of the thighs at deadlift lockout', () => {
    for (const id of ['deadlift','romanian-deadlift']) {
      const p=EXERCISE_MOTIONS[id].sample(1);
      for(const hand of p.hands) expect(hand[2]-p.hip[2]).withContext(id).toBeGreaterThan(.2);
    }
  });
  it('keeps dip palms fixed on parallel handles and squat palms on the rear bar', () => {
    for(let n=0;n<=40;n++) {
      expect(EXERCISE_MOTIONS['triceps-dip'].sample(n/40).handContacts).toEqual([[-.3,1.05,.12],[.3,1.05,.12]]);
      const p=EXERCISE_MOTIONS['back-squat'].sample(n/40);
      expect(p.handContacts).toEqual([local(p,[-.43,.45,-.14]),local(p,[.43,.45,-.14])]);
    }
  });
  it('swings running arms with a stable elbow bend rather than folding them through the shoulders', () => {
    for(let n=0;n<=40;n++) {
      const p=EXERCISE_MOTIONS['treadmill'].sample(n/40);
      for(let i=0;i<2;i++) {
        const shoulder=local(p,[(i?1:-1)*.204,.471,.088]);
        const upper=p.elbows[i].map((v,k)=>v-shoulder[k]);
        const lower=p.hands[i].map((v,k)=>v-p.elbows[i][k]);
        expect(Math.abs(upper.reduce((sum,v,k)=>sum+v*lower[k],0))).toBeLessThan(.001);
      }
    }
  });
  it('defines an explicit choreography for all 48 catalog exercises', () => {
    expect(Object.keys(EXERCISE_MOTIONS).length).toBe(48);
  });
  it('keeps every arm and leg at its measured length throughout each movement', () => {
    for (const [id, motion] of Object.entries(EXERCISE_MOTIONS))
      for (let n = 0; n <= 20; n++) {
        const p = motion.sample(n / 20);
        for (let i = 0; i < 2; i++) {
          const side = i === 0 ? -1 : 1,
            shoulder = local(p, [side * 0.204, 0.471, 0.088]);
          const arm = solveLimb(
            shoulder,
            p.hands[i],
            p.elbows[i],
            0.261,
            0.282,
          );
          expect(arm.error)
            .withContext(id + ' arm ' + i + ' phase ' + n)
            .toBeLessThan(0.02);
          expect(distance(shoulder, arm.joint)).toBeCloseTo(0.261, 6);
          expect(distance(arm.joint, arm.end)).toBeCloseTo(0.282, 6);
          const hip: [number, number, number] = [
            p.hip[0] + side * 0.111,
            p.hip[1] + 0.002,
            p.hip[2] + 0.062,
          ];
          const leg = solveLimb(hip, p.feet[i], p.knees[i], 0.441, 0.449);
          expect(leg.error)
            .withContext(id + ' leg ' + i + ' phase ' + n)
            .toBeLessThan(0.02);
          expect(distance(hip, leg.joint)).toBeCloseTo(0.441, 6);
          expect(distance(leg.joint, leg.end)).toBeCloseTo(0.449, 6);
          expect(
            [...arm.joint, ...leg.joint, ...arm.end, ...leg.end].every(
              Number.isFinite,
            ),
          ).toBeTrue();
        }
      }
  });
  it('keeps the barbell grip fixed across the whole bench press', () => {
    const motion = EXERCISE_MOTIONS['bench-press'];
    for (let n = 0; n <= 40; n++) {
      const p = motion.sample(n / 40);
      expect(p.hands[0][0]).toBe(-.34);
      expect(p.hands[1][0]).toBe(.34);
    }
  });
  it('keeps bench press supine, feet planted, and the load above the chest', () => {
    const motion = EXERCISE_MOTIONS['bench-press'],
      low = motion.sample(0),
      high = motion.sample(1);
    expect(low.tilt).toBe(-Math.PI / 2);
    expect(high.feet).toEqual(low.feet);
    expect(high.hip).toEqual(low.hip);
    expect(low.hands[0][1]).toBeGreaterThan(
      local(low, [-0.204, 0.471, 0.088])[1],
    );
    expect(high.hands[0][1] - low.hands[0][1]).toBeGreaterThan(0.3);
  });
  it('shares the pulldown setup while separating chest and behind-neck bar paths', () => {
    const chest = EXERCISE_MOTIONS['lat-pulldown'];
    const behind = EXERCISE_MOTIONS['behind-neck-lat-pulldown'];
    expect(chest.camera).toEqual(behind.camera);
    expect(chest.sample(0)).toEqual(behind.sample(0));
    for (let n = 0; n <= 20; n++) {
      const front = chest.sample(n / 20), back = behind.sample(n / 20);
      expect(front.hip).toEqual(back.hip);
      expect(front.feet).toEqual(back.feet);
      expect(front.tilt).toEqual(back.tilt);
      expect(front.hands[0][0]).toBe(back.hands[0][0]);
    }
    const front = chest.sample(1), back = behind.sample(1);
    const shoulder = local(back, [-.204, .471, .088]);
    expect(front.hands[0][2]).toBeGreaterThan(local(front, [0, .471, .088])[2]);
    expect(back.hands[0][2]).toBeLessThan(local(back, [0, .6, -.08])[2]);
    expect(Math.abs(back.hands[0][1] - shoulder[1])).toBeLessThan(.06);
    expect(front.hands[0][1]).toBeLessThan(back.hands[0][1]);
  });
  it('distinguishes incline pressing, hip hinging and squat setups', () => {
    expect(EXERCISE_MOTIONS['incline-dumbbell-press'].sample(0).tilt).not.toBe(
      EXERCISE_MOTIONS['bench-press'].sample(0).tilt,
    );
    const squat = EXERCISE_MOTIONS['back-squat'];
    expect(squat.sample(0).feet).toEqual(squat.sample(1).feet);
    const hinge = EXERCISE_MOTIONS['romanian-deadlift'];
    expect(hinge.sample(0).tilt).toBeGreaterThan(hinge.sample(1).tilt);
  });
  it('keeps the supporting hand fixed for single-arm rows', () => {
    const m = EXERCISE_MOTIONS['dumbbell-row'];
    expect(m.sample(0).hands[0]).toEqual(m.sample(1).hands[0]);
    expect(
      distance(m.sample(0).hands[1], m.sample(1).hands[1]),
    ).toBeGreaterThan(0.3);
  });
  it('cycles pedals continuously instead of reversing the bicycle every half rep', () => {
    const m = EXERCISE_MOTIONS['cycling'];
    expect(m.continuous).toBeTrue();
    expect(distance(m.sample(0).feet[0], m.sample(1).feet[0])).toBeLessThan(
      0.0001,
    );
    expect(
      distance(m.sample(0).feet[0], m.sample(0.5).feet[0]),
    ).toBeGreaterThan(0.3);
  });
  it('holds a static plank and moves through wrists for wrist curls', () => {
    expect(EXERCISE_MOTIONS['plank'].sample(0)).toEqual(
      EXERCISE_MOTIONS['plank'].sample(1),
    );
    const m = EXERCISE_MOTIONS['wrist-curl'];
    expect(m.sample(0).hands).toEqual(m.sample(1).hands);
    expect(m.sample(0).wristFlex).not.toBe(m.sample(1).wristFlex);
  });
  it('bends the trunk during cable crunches while retaining the hip setup', () => {
    const start = EXERCISE_MOTIONS['cable-crunch'].sample(0),
      finish = EXERCISE_MOTIONS['cable-crunch'].sample(1);
    expect(start.hip).toEqual(finish.hip);
    expect(start.tilt).toBe(finish.tilt);
    expect(finish.spineBend).toBeGreaterThan(start.spineBend!);
  });
  it('raises through the shoulders with a constant soft elbow in flys and lateral raises',()=>{
    for(const id of ['reverse-fly','lateral-raise','cable-fly']){
      let first=0;
      for(let step=0;step<=20;step++){
        const p=EXERCISE_MOTIONS[id].sample(step/20),s=local(p,[-.204,.471,.088]);
        const limb=solveLimb(s,p.hands[0],p.elbows[0],.261,.282);
        const dot=(s[0]-limb.joint[0])*(limb.end[0]-limb.joint[0])+(s[1]-limb.joint[1])*(limb.end[1]-limb.joint[1])+(s[2]-limb.joint[2])*(limb.end[2]-limb.joint[2]);
        const flexion=Math.PI-Math.acos(Math.max(-1,Math.min(1,dot/(.261*.282))));
        if(step===0)first=flexion;
        expect(flexion).withContext(id+' elbow at '+step).toBeCloseTo(first,5);
        expect(flexion).toBeGreaterThan(.15);expect(flexion).toBeLessThan(.30);
      }
    }
    const low=EXERCISE_MOTIONS['reverse-fly'].sample(0),high=EXERCISE_MOTIONS['reverse-fly'].sample(1);
    expect(low.hip).toEqual(high.hip);expect(low.feet).toEqual(high.feet);
    expect(low.hands[0][1]).toBeLessThan(local(low,[-.204,.471,.088])[1]-.5);
    expect(Math.abs(high.hands[0][0])).toBeGreaterThan(.7);
  });
  it('keeps loaded arms long during deadlifts and carries and the raised RDL leg extended',()=>{
    for(const id of ['deadlift','romanian-deadlift','single-leg-rdl','farmer-carry'])for(let step=0;step<=20;step++){
      const p=EXERCISE_MOTIONS[id].sample(step/20),s=local(p,[-.204,.471,.088]);
      expect(distance(s,p.hands[0])).withContext(id+' loaded arm').toBeGreaterThan(.535);
      expect(distance(s,p.hands[0])).toBeLessThan(.544);
      if(id==='single-leg-rdl'){
        expect(distance([p.hip[0]+.111,p.hip[1]+.002,p.hip[2]+.062],p.feet[1])).toBeGreaterThan(.88);
      }
    }
    expect(EXERCISE_MOTIONS['deadlift'].sample(0).hands[0][1]).toBeGreaterThan(.20);
  });
});
