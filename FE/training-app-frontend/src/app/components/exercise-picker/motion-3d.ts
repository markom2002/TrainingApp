/** World coordinates in metres: Y up, +Z is the athlete's forward direction. */
export type V3 = [number, number, number];
export interface ExercisePose {
  hip: V3;
  tilt: number;
  twist: number;
  hands: [V3, V3];
  feet: [V3, V3];
  elbows: [V3, V3];
  knees: [V3, V3];
  headTilt?: number;
  grip: 'bar' | 'neutral' | 'open' | 'supinated';
  footTilt?: number;
  wristFlex?: number;
  spineBend?: number;
}
export interface ExerciseMotion {
  camera: V3;
  focus: V3;
  span: number;
  seconds: number;
  equipment: string;
  phase: [string, string];
  continuous?: boolean;
  sample: (progress: number) => ExercisePose;
}
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const smooth = (n: number) => {
  n = clamp(n);
  return n * n * (3 - 2 * n);
};
export function local(p: ExercisePose, v: V3): V3 {
  if (p.spineBend && v[1] > 0.2) {
    const angle = p.spineBend,
      y = v[1] - 0.2,
      z = v[2] - 0.02;
    v = [
      v[0],
      0.2 + y * Math.cos(angle) - z * Math.sin(angle),
      0.02 + y * Math.sin(angle) + z * Math.cos(angle),
    ];
  }
  const c = Math.cos(p.tilt),
    s = Math.sin(p.tilt),
    cy = Math.cos(p.twist),
    sy = Math.sin(p.twist);
  const x = v[0] * cy + v[2] * sy,
    z = -v[0] * sy + v[2] * cy;
  return [
    p.hip[0] + x,
    p.hip[1] + v[1] * c - z * s,
    p.hip[2] + v[1] * s + z * c,
  ];
}
function base(): ExercisePose {
  return {
    hip: [0, 0.958, 0],
    tilt: 0,
    twist: 0,
    hands: [
      [-0.27, 0.96, 0.12],
      [0.27, 0.96, 0.12],
    ],
    feet: [
      [-0.17, 0.074, 0.1],
      [0.17, 0.074, 0.1],
    ],
    elbows: [
      [-0.55, 1.1, 0],
      [0.55, 1.1, 0],
    ],
    knees: [
      [-0.17, 0.5, 1],
      [0.17, 0.5, 1],
    ],
    grip: 'bar',
  };
}
function arms(p: ExercisePose, left: V3, right?: V3) {
  p.hands = [local(p, left), local(p, right ?? [-left[0], left[1], left[2]])];
  return p;
}
function standHands(p: ExercisePose) {
  return arms(p, [-0.26, -0.065, 0.10]);
}
/** Shoulder-led arc with a fixed soft elbow, rather than a wrist lerp that curls the arm. */
function raiseArc(p: ExercisePose, angle: number) {
  const bend=.22;
  for(let i=0;i<2;i++){
    const sign=i===0?-1:1;
    const shoulder=local(p,[sign*.204,.471,.088]);
    const u:V3=[sign*Math.sin(angle),-Math.cos(angle),0];
    // Hinge stays fixed while humerus abducts; forearm keeps 12.6 degrees of flexion.
    const f:V3=[u[0]*Math.cos(bend),u[1]*Math.cos(bend),Math.sin(bend)];
    p.elbows[i]=shoulder.map((v,k)=>v+u[k]*.261) as V3;
    p.hands[i]=p.elbows[i].map((v,k)=>v+f[k]*.282) as V3;
  }
  p.grip='neutral';
  return p;
}
function bench(t: number, incline = false): ExercisePose {
  const p = base();
  p.hip = [0, 0.605, 0.18];
  p.tilt = incline ? -Math.PI / 3 : -Math.PI / 2;
  p.feet = [
    [-0.24, 0.074, 0.7],
    [0.24, 0.074, 0.7],
  ];
  p.knees = [
    [-0.24, 0.6, 0.68],
    [0.24, 0.6, 0.68],
  ];
  const shoulder = local(p, [0, 0.471, 0.088]);
  p.hands = [
    [
      -mix(0.39, 0.32, t),
      shoulder[1] + mix(0.14, 0.49, t),
      shoulder[2] + mix(0.12, 0, t),
    ],
    [
      mix(0.39, 0.32, t),
      shoulder[1] + mix(0.14, 0.49, t),
      shoulder[2] + mix(0.12, 0, t),
    ],
  ];
  p.elbows = [
    [-0.7, shoulder[1] - 0.1, shoulder[2] + 0.2],
    [0.7, shoulder[1] - 0.1, shoulder[2] + 0.2],
  ];
  return p;
}
function seated(): ExercisePose {
  const p = base();
  p.hip = [0, 0.57, 0];
  p.feet = [
    [-0.17, 0.074, 0.46],
    [0.17, 0.074, 0.46],
  ];
  p.knees = [
    [-0.17, 0.49, 0.43],
    [0.17, 0.49, 0.43],
  ];
  return standHands(p);
}
function squat(t: number, goblet = false): ExercisePose {
  const p = base();
  p.hip = [0, mix(0.958, 0.53, t), mix(0, -0.2, t)];
  p.tilt = mix(0.04, 0.36, t);
  p.feet = [
    [-0.23, 0.074, 0.12],
    [0.23, 0.074, 0.12],
  ];
  p.knees = [
    [-0.25, 0.6, 0.7],
    [0.25, 0.6, 0.7],
  ];
  return arms(p, goblet ? [-0.09, 0.36, 0.27] : [-0.36, 0.43, -0.045]);
}
function hinge(t: number, single = false): ExercisePose {
  const p = base();
  p.hip = [0, mix(0.958, 0.91, t), mix(0, -0.29, t)];
  p.tilt = mix(0, 1.02, t);
  const s = local(p, [0, 0.471, 0.088]);
  p.hands = [
    [-0.255, s[1] - 0.535, s[2] + 0.035],
    [0.255, s[1] - 0.535, s[2] + 0.035],
  ];
  p.elbows = [
    [-0.35, s[1] - 0.2, s[2] + 0.1],
    [0.35, s[1] - 0.2, s[2] + 0.1],
  ];
  if (single) p.feet[1] = [0.16,p.hip[1]+.002-.885*Math.cos(p.tilt),p.hip[2]+.062-.885*Math.sin(p.tilt)];
  return p;
}
function prone(push: number, forearms = false): ExercisePose {
  const p = base();
  const y = forearms ? 0.31 : mix(0.47, 0.25, push),
    rise = y + 0.002 - 0.074,
    reach = Math.sqrt(0.885 ** 2 - rise ** 2);
  p.hip = [0, y, -0.95 + reach - 0.062];
  p.tilt = Math.atan2(reach, rise);
  p.feet = [
    [-0.14, 0.074, -0.95],
    [0.14, 0.074, -0.95],
  ];
  p.hands = [
    [forearms ? -0.204 : -0.29, 0.1, forearms ? 0.598 : 0.43],
    [forearms ? 0.204 : 0.29, 0.1, forearms ? 0.598 : 0.43],
  ];
  p.elbows = forearms
    ? [
        [-0.204, 0.09, 0.316],
        [0.204, 0.09, 0.316],
      ]
    : [
        [-0.7, 0.19, 0.25],
        [0.7, 0.19, 0.25],
      ];
  p.grip = 'open';
  return p;
}
function bridge(t: number, raised = false): ExercisePose {
  const p = base();
  const shoulderY = raised ? 0.57 : 0.055;
  p.hip = [0, mix(raised ? 0.35 : 0.065, raised ? 0.56 : 0.36, t), 0.3];
  p.tilt = -Math.acos((shoulderY - p.hip[1]) / 0.471);
  p.headTilt = -Math.PI / 2;
  p.hip[2] = -0.28 - Math.sin(p.tilt) * 0.471;
  p.feet = [
    [-0.19, 0.074, 0.66],
    [0.19, 0.074, 0.66],
  ];
  p.knees = [
    [-0.2, 0.6, 0.65],
    [0.2, 0.6, 0.65],
  ];
  p.hands = raised
    ? [
        [-0.27, p.hip[1] + 0.1, p.hip[2]],
        [0.27, p.hip[1] + 0.1, p.hip[2]],
      ]
    : [
        [-0.28, 0.1, 0.20],
        [0.28, 0.1, 0.20],
      ];
  if(!raised)p.grip='open';
  return p;
}
function curlPose(t: number, neutral = false): ExercisePose {
  const p = base(),
    angle = t * 2.5;
  arms(p, [
    -0.235,
    0.214 - 0.282 * Math.cos(angle),
    0.088 + 0.282 * Math.sin(angle),
  ]);
  p.elbows = [
    local(p, [-0.235, 0.214, 0.088]),
    local(p, [0.235, 0.214, 0.088]),
  ];
  p.grip = neutral ? 'neutral' : 'supinated';
  return p;
}
const standing: V3 = [2.9, 1.9, 3.4],
  side: V3 = [3.5, 1.75, 2.6],
  floor: V3 = [3.4, 2.4, 2.8];
/** Both pulldowns share the seat, wide grip and torso; only the bar path differs. */
function latPulldown(t: number, behindNeck = false): ExercisePose {
  const p = seated();
  p.tilt = -0.04;
  p.knees = [local(p, [-0.17, -0.08, 0.43]), local(p, [0.17, -0.08, 0.43])];
  p.elbows = [local(p, [-0.50, 0.34, 0.02]), local(p, [0.50, 0.34, 0.02])];
  // Move clear of the head early, then lower along the front or rear of the torso.
  return arms(p, [-0.43, mix(0.95, behindNeck ? 0.50 : 0.40, t),
    mix(0.02, behindNeck ? -0.16 : 0.27, Math.min(1, t * (behindNeck ? 3 : 2)))]);
}
function motion(
  sample: (t: number) => ExercisePose,
  equipment = 'none',
  options: Partial<ExerciseMotion> = {},
): ExerciseMotion {
  return {
    sample,
    equipment,
    camera: standing,
    focus: [0, 0.95, 0],
    span: 2.45,
    seconds: 4.6,
    phase: ['Controlled return', 'Drive with control'],
    ...options,
  };
}
/** Every catalog ID is explicit. Variants have separate setup and trajectories. */
export const EXERCISE_MOTIONS: Record<string, ExerciseMotion> = {
  'bench-press': motion((t) => bench(t), 'bench-bar', {
    camera: side,
    focus: [0, 0.65, 0.05],
    span: 2.0,
    phase: ['Lower to chest', 'Press upward'],
  }),
  'incline-dumbbell-press': motion((t) => bench(t, true), 'incline-dumbbells', {
    camera: side,
    focus: [0, 0.8, 0.05],
    span: 2.1,
    phase: ['Lower with control', 'Press above shoulders'],
  }),
  'push-up': motion((t) => prone(1 - t), 'mat', {
    camera: floor,
    focus: [0, 0.35, -0.15],
    span: 2.15,
    phase: ['Lower the body', 'Press the floor'],
  }),
  'cable-fly': motion(
    (t) => {
      const p = base();
      p.hip[2] = 0.22;
      const angle=mix(.06,1.72,t),slope=.17,bend=.25;
      for(let i=0;i<2;i++){
        const side=i===0?-1:1,s=local(p,[side*.204,.471,.088]);
        const u:V3=[side*Math.cos(angle)*Math.cos(slope),-Math.sin(slope),Math.sin(angle)*Math.cos(slope)];
        const f:V3=[side*Math.cos(angle+bend)*Math.cos(slope),-Math.sin(slope),Math.sin(angle+bend)*Math.cos(slope)];
        p.elbows[i]=s.map((v,k)=>v+.261*u[k]) as V3;
        p.hands[i]=p.elbows[i].map((v,k)=>v+.282*f[k]) as V3;
      }
      p.grip='neutral';
      return p;
    },
    'cable-fly',
    { phase: ['Open with soft elbows', 'Bring hands together'] },
  ),
  'lat-pulldown': motion(
    (t) => latPulldown(t),
    'lat',
    {
      camera: [2.1, 1.65, 3.9],
      focus: [0, 1.04, 0.12],
      span: 2.4,
      phase: ['Controlled reach', 'Pull to upper chest'],
    },
  ),
  'behind-neck-lat-pulldown': motion(
    (t) => latPulldown(t, true),
    'lat',
    {
      camera: [2.1, 1.65, 3.9],
      focus: [0, 1.04, 0.12],
      span: 2.4,
      phase: ['Controlled reach', 'Pull behind head to shoulder height'],
    },
  ),
  'seated-row': motion(
    (t) => {
      const p = seated();
      p.feet = [
        [-0.17, 0.214, 0.68],
        [0.17, 0.214, 0.68],
      ];
      return arms(p, [-0.16, 0.27, mix(0.59, 0.24, t)]);
    },
    'row',
    { camera: side, phase: ['Reach forward', 'Elbows toward hips'] },
  ),
  'pull-up': motion(
    (t) => {
      const p = base();
      p.hip[1] = mix(1.15, 1.5, t);
      p.feet = [
        [-0.17, mix(0.25, 0.65, t), 0.08],
        [0.17, mix(0.25, 0.65, t), 0.08],
      ];
      p.hands = [
        [-0.37, 2.12, 0.05],
        [0.37, 2.12, 0.05],
      ];
      p.elbows = [
        [-0.7, 1.6, 0.15],
        [0.7, 1.6, 0.15],
      ];
      return p;
    },
    'pullup',
    {
      focus: [0, 1.25, 0],
      span: 2.8,
      phase: ['Lower from the bar', 'Pull the body up'],
    },
  ),
  'dumbbell-row': motion(
    (t) => {
      const p = hinge(0.85);
      p.hip = [0, 0.81, -0.1];
      p.tilt = 0.85;
      p.feet = [
        [-0.2, 0.074, 0.3],
        [0.21, 0.074, -0.12],
      ];
      p.hands[0] = [-0.3, 0.58, 0.42];
      const s = local(p, [0.204, 0.471, 0.088]);
      p.hands[1] = [
        0.28,
        mix(s[1] - 0.49, s[1] - 0.13, t),
        mix(s[2], s[2] - 0.12, t),
      ];
      p.elbows[1] = [0.45, s[1], s[2] - 0.7];
      return p;
    },
    'single-row',
    { camera: side, phase: ['Lower the dumbbell', 'Pull toward the hip'] },
  ),
  'shoulder-press': motion(
    (t) => arms(base(), [-mix(0.36, 0.23, t), mix(0.48, 0.98, t), 0.12]),
    'dumbbells',
    { phase: ['Lower to shoulder level', 'Press overhead'] },
  ),
  'lateral-raise': motion(
    (t) => raiseArc(base(),mix(.09,1.43,t)),
    'dumbbells',
    { phase: ['Lower slowly', 'Raise to shoulder level'] },
  ),
  'face-pull': motion(
    (t) => {
      const p = arms(base(), [
        -mix(0.12, 0.3, t),
        mix(0.48, 0.64, t),
        mix(0.61, 0.23, t),
      ]);
      p.elbows = [
        [-0.7, 1.55, 0.05],
        [0.7, 1.55, 0.05],
      ];
      return p;
    },
    'face-cable',
    { phase: ['Reach with control', 'Pull toward the face'] },
  ),
  'reverse-fly': motion(
    (t) => {
      const p = hinge(1);
      p.hip=[0,.895,-.25];
      p.tilt=1.03;
      return raiseArc(p,mix(.04,1.47,t));
    },
    'dumbbells',
    {
      camera: side,
      focus: [0,.68,.05],
      span: 1.95,
      phase: ['Lower with control', 'Open through the shoulders'],
    },
  ),
  'biceps-curl': motion((t) => curlPose(t), 'dumbbells', {
    phase: ['Extend without swinging', 'Curl with fixed elbows'],
  }),
  'hammer-curl': motion((t) => curlPose(t, true), 'dumbbells', {
    phase: ['Lower with neutral grip', 'Curl palms facing inward'],
  }),
  'preacher-curl': motion(
    (t) => {
      const p = seated(),
        a = -0.6 + 1.75 * t;
      p.grip='supinated';
      p.elbows = [local(p, [-0.2, 0.258, 0.24]), local(p, [0.2, 0.258, 0.24])];
      return arms(p, [
        -0.2,
        0.258 + 0.282 * Math.sin(a),
        0.24 + 0.282 * Math.cos(a),
      ]);
    },
    'preacher',
    {
      camera: side,
      phase: ['Extend over the pad', 'Curl without lifting upper arms'],
    },
  ),
  'triceps-pushdown': motion(
    (t) => {
      const p = base(),
        angle = (t * Math.PI) / 2;
      arms(p, [
        -0.204,
        0.21 - 0.282 * Math.sin(angle),
        0.088 + 0.282 * Math.cos(angle),
      ]);
      p.elbows = [
        local(p, [-0.204, 0.21, 0.088]),
        local(p, [0.204, 0.21, 0.088]),
      ];
      return p;
    },
    'pushdown',
    { phase: ['Bend at the elbows', 'Extend downward'] },
  ),
  'overhead-extension': motion(
    (t) => {
      const p = arms(base(), [-0.08, mix(0.68, 0.99, t), mix(-0.18, 0.08, t)]);
      p.elbows = [
        [-0.19, 1.75, 0.04],
        [0.19, 1.75, 0.04],
      ];
      return p;
    },
    'overhead-bell',
    { phase: ['Bend elbows behind the head', 'Extend overhead'] },
  ),
  'triceps-dip': motion(
    (t) => {
      const p = base();
      p.hip = [0, mix(0.92, 1.1, t), 0];
      p.hands = [
        [-0.3, 1.05, 0.06],
        [0.3, 1.05, 0.06],
      ];
      p.feet = [
        [-0.17, mix(0.21, 0.42, t), -0.15],
        [0.17, mix(0.21, 0.42, t), -0.15],
      ];
      p.elbows = [
        [-0.4, 1.2, -0.4],
        [0.4, 1.2, -0.4],
      ];
      return p;
    },
    'dip',
    { phase: ['Lower with control', 'Press above the bars'] },
  ),
  'wrist-curl': motion(
    (t) => {
      const p = seated();
      p.hands = [
        [-0.17, 0.71, 0.4],
        [0.17, 0.71, 0.4],
      ];
      p.elbows = [
        [-0.2, 0.77, 0.12],
        [0.2, 0.77, 0.12],
      ];
      p.grip = 'supinated';
      p.headTilt = 0.1;
      p.wristFlex = -0.45 + 0.9 * t;
      return p;
    },
    'wrist-bench',
    { camera: side, phase: ['Extend the wrists', 'Flex the wrists'] },
  ),
  'farmer-carry': motion(
    (t) => {
      const p = standHands(base());
      p.grip = 'neutral';
      const s = Math.sin(t * Math.PI * 2);
      p.feet = [
        [-0.18, 0.074 + Math.max(0, s) * 0.035, 0.1 + s * 0.15],
        [0.18, 0.074 + Math.max(0, -s) * 0.035, 0.1 - s * 0.15],
      ];
      return p;
    },
    'dumbbells',
    {
      seconds: 2.8,
      continuous: true,
      phase: ['Controlled step', 'Stay tall and braced'],
    },
  ),
  'back-squat': motion((t) => squat(1 - t), 'squat-bar', {
    camera: side,
    phase: ['Sit between the hips', 'Stand through the feet'],
  }),
  'goblet-squat': motion((t) => squat(1 - t, true), 'goblet', {
    camera: side,
    phase: ['Lower with the bell at chest', 'Stand with control'],
  }),
  'leg-press': motion(
    (t) => {
      const p = base();
      p.hip = [0, 0.49, -0.35];
      p.tilt = -0.55;
      p.footTilt = -Math.PI / 4;
      p.hands = [
        [-0.28, 0.43, -0.32],
        [0.28, 0.43, -0.32],
      ];
      p.feet = [
        [-0.19, mix(0.7, 0.99, t), mix(0.08, 0.37, t)],
        [0.19, mix(0.7, 0.99, t), mix(0.08, 0.37, t)],
      ];
      p.knees = [
        [-0.23, 1.1, -0.2],
        [0.23, 1.1, -0.2],
      ];
      return p;
    },
    'legpress',
    {
      camera: side,
      focus: [0, 0.7, 0],
      span: 2.0,
      phase: ['Lower the sled', 'Press without locking knees'],
    },
  ),
  'leg-extension': motion(
    (t) => {
      const p = seated();
      p.hands = [
        [-0.31, 0.54, 0],
        [0.31, 0.54, 0],
      ];
      p.feet = [
        [-0.16, mix(0.12, 0.56, t), mix(0.44, 0.94, t)],
        [0.16, mix(0.12, 0.56, t), mix(0.44, 0.94, t)],
      ];
      p.knees = [
        [-0.16, 0.57, 0.5],
        [0.16, 0.57, 0.5],
      ];
      return p;
    },
    'legextension',
    {
      camera: side,
      focus: [0, 0.65, 0.2],
      span: 2.1,
      phase: ['Lower the ankle pad', 'Extend the knees'],
    },
  ),
  'romanian-deadlift': motion((t) => hinge(1 - t), 'barbell', {
    camera: side,
    phase: ['Hinge the hips back', 'Stand through the hips'],
  }),
  'leg-curl': motion(
    (t) => {
      const p = base();
      p.hip = [0, 0.75, 0];
      p.tilt = Math.PI / 2;
      p.hands = [
        [-0.25, 0.57, 0.66],
        [0.25, 0.57, 0.66],
      ];
      p.feet = [
        [-0.15, mix(0.63, 1.03, t), mix(-0.81, -0.48, t)],
        [0.15, mix(0.63, 1.03, t), mix(-0.81, -0.48, t)],
      ];
      p.knees = [
        [-0.15, 0.64, -0.44],
        [0.15, 0.64, -0.44],
      ];
      p.headTilt = Math.PI / 2;
      return p;
    },
    'legcurl',
    {
      camera: floor,
      focus: [0, 0.6, -0.1],
      span: 2.1,
      phase: ['Extend with control', 'Curl heels upward'],
    },
  ),
  'single-leg-rdl': motion((t) => hinge(1 - t, true), 'dumbbells', {
    camera: side,
    phase: ['Hinge on one leg', 'Return with square hips'],
  }),
  'hip-thrust': motion((t) => bridge(t, true), 'hipthrust', {
    camera: side,
    focus: [0, 0.5, 0.1],
    span: 2,
    phase: ['Lower the hips', 'Drive through the heels'],
  }),
  'glute-bridge': motion((t) => bridge(t), 'mat', {
    camera: floor,
    focus: [0, 0.35, 0.1],
    span: 2,
    phase: ['Lower with control', 'Lift the hips'],
  }),
  'cable-kickback': motion(
    (t) => {
      const p = base();
      p.tilt = 0.2;
      p.hands = [
        [-0.26, 1.28, 0.55],
        [0.26, 1.28, 0.55],
      ];
      p.feet[1] = [0.15, mix(0.074, 0.42, t), mix(0.1, -0.64, t)];
      return p;
    },
    'ankle-cable',
    { camera: side, phase: ['Return the leg', 'Extend through the hip'] },
  ),
  'bulgarian-split-squat': motion(
    (t) => {
      const p = base();
      p.hip = [0, mix(0.83, 0.56, 1 - t), -0.05];
      p.tilt = 0.15;
      p.feet = [
        [-0.17, 0.074, 0.46],
        [0.16, 0.49, -0.58],
      ];
      p.knees = [
        [-0.17, 0.5, 0.9],
        [0.17, 0.2, -0.45],
      ];
      return standHands(p);
    },
    'split-bench',
    {
      camera: side,
      phase: ['Lower through front leg', 'Stand with the front leg'],
    },
  ),
  'standing-calf-raise': motion(
    (t) => {
      const p = base();
      p.hip[1] += 0.07 * t;
      p.footTilt = 0.45 * t;
      p.feet = [
        [-0.17, 0.074 + 0.07 * t, 0.1],
        [0.17, 0.074 + 0.07 * t, 0.1],
      ];
      return standHands(p);
    },
    'calf',
    { camera: side, phase: ['Lower the heels', 'Rise onto the forefoot'] },
  ),
  'seated-calf-raise': motion(
    (t) => {
      const p = seated();
      p.footTilt = 0.45 * t;
      p.feet = [
        [-0.17, 0.074 + 0.07 * t, 0.45],
        [0.17, 0.074 + 0.07 * t, 0.45],
      ];
      p.hands = [
        [-0.18, 0.69, 0.35],
        [0.18, 0.69, 0.35],
      ];
      return p;
    },
    'seated-calf',
    { camera: side, phase: ['Lower the heels', 'Raise through the ankles'] },
  ),
  plank: motion(() => prone(0, true), 'mat', {
    camera: floor,
    focus: [0, 0.35, -0.15],
    span: 2.15,
    phase: ['Brace and breathe', 'Hold a steady line'],
  }),
  'dead-bug': motion(
    (t) => {
      const p = base();
      p.hip = [0, 0.055, 0.15];
      p.tilt = -Math.PI / 2;
      p.headTilt = -Math.PI / 2;
      const shoulder = local(p, [0, 0.471, 0.088]);
      p.hands = [
        [
          -0.22,
          shoulder[1] + 0.53 * Math.cos((t * Math.PI) / 2),
          shoulder[2] - 0.53 * Math.sin((t * Math.PI) / 2),
        ],
        [
          0.22,
          shoulder[1] + 0.53 * Math.cos(((1 - t) * Math.PI) / 2),
          shoulder[2] - 0.53 * Math.sin(((1 - t) * Math.PI) / 2),
        ],
      ];
      p.feet = [
        [-0.16, mix(0.10, 0.50, t), mix(1.07, 0.66, t)],
        [0.16, mix(0.50, 0.10, t), mix(0.66, 1.07, t)],
      ];
      p.knees = [
        [-0.16, 0.8, 0.2],
        [0.16, 0.8, 0.2],
      ];
      return p;
    },
    'mat',
    {
      camera: floor,
      focus: [0, 0.3, 0.05],
      span: 2.2,
      phase: ['Extend opposite limbs', 'Alternate with control'],
    },
  ),
  'hanging-leg-raise': motion(
    (t) => {
      const p = base();
      p.hip = [0, 1.15, 0];
      p.hands = [
        [-0.3, 2.12, 0.07],
        [0.3, 2.12, 0.07],
      ];
      p.feet = [
        [
          -0.14,
          p.hip[1] + 0.002 - 0.875 * Math.cos(t * 1.45),
          0.062 + 0.875 * Math.sin(t * 1.45),
        ],
        [
          0.14,
          p.hip[1] + 0.002 - 0.875 * Math.cos(t * 1.45),
          0.062 + 0.875 * Math.sin(t * 1.45),
        ],
      ];
      p.knees = [
        [-0.15, 0.7, 0.9],
        [0.15, 0.7, 0.9],
      ];
      return p;
    },
    'pullup',
    {
      focus: [0, 1.2, 0.15],
      span: 2.8,
      phase: ['Lower without swinging', 'Raise the legs'],
    },
  ),
  'cable-crunch': motion(
    (t) => {
      const p = base();
      p.hip = [0, 0.53, -0.05];
      p.tilt = 0.1;
      p.spineBend = 0.6 * t;
      p.feet = [
        [-0.18, 0.09, -0.39],
        [0.18, 0.09, -0.39],
      ];
      p.knees = [
        [-0.18, 0.06, 0.22],
        [0.18, 0.06, 0.22],
      ];
      p.elbows = [local(p, [-0.25, 0.38, 0.15]), local(p, [0.25, 0.38, 0.15])];
      return arms(p, [-0.13, 0.57, 0.18]);
    },
    'crunch-cable',
    {
      camera: side,
      focus: [0, 0.9, 0],
      span: 2.35,
      phase: ['Return without arching', 'Flex through the trunk'],
    },
  ),
  deadlift: motion(
    (t) => {
      const p = base();
      p.hip = [0, mix(0.53, 0.958, t), mix(-0.18, 0, t)];
      p.tilt = mix(0.93, 0.02, t);
      const s = local(p, [0, 0.471, 0.088]);
      p.hands = [
        [-0.27, s[1] - 0.535, s[2] + 0.025],
        [0.27, s[1] - 0.535, s[2] + 0.025],
      ];
      p.elbows = [
        [-0.35, 0.6, 0.4],
        [0.35, 0.6, 0.4],
      ];
      return p;
    },
    'barbell',
    { camera: side, phase: ['Set the bar down', 'Extend hips and knees'] },
  ),
  'kettlebell-swing': motion(
    (t) => {
      const p = hinge(1 - t);
      p.hands = [
        [-0.08, mix(0.64, 1.35, t), mix(-0.05, 0.59, t)],
        [0.08, mix(0.64, 1.35, t), mix(-0.05, 0.59, t)],
      ];
      return p;
    },
    'kettlebell',
    {
      camera: side,
      seconds: 3.2,
      phase: ['Load the hip hinge', 'Drive the bell with hips'],
    },
  ),
  burpee: motion(
    (t) => {
      const p = base();
      if (t < 0.5) {
        const u = smooth(t * 2),
          a = prone(0);
        p.hip = [0, mix(a.hip[1], 0.48, u), mix(a.hip[2], 0, u)];
        p.tilt = mix(a.tilt, 0.8, u);
        p.feet = [
          [-0.18, 0.074, mix(-0.95, 0.1, u)],
          [0.18, 0.074, mix(-0.95, 0.1, u)],
        ];
        p.hands = [
          [-0.28, mix(0.1, 0.3, u), mix(0.43, 0.3, u)],
          [0.28, mix(0.1, 0.3, u), mix(0.43, 0.3, u)],
        ];
        return p;
      }
      const u = smooth(t * 2 - 1);
      p.hip[1] = mix(0.48, 0.958, u);
      p.tilt = mix(0.8, 0, u);
      p.hands = [
        [-0.28, mix(0.3, 0.98, u), mix(0.3, 0.12, u)],
        [0.28, mix(0.3, 0.98, u), mix(0.3, 0.12, u)],
      ];
      return p;
    },
    'mat',
    {
      camera: side,
      seconds: 6,
      phase: ['Step into a stable plank', 'Return and stand'],
    },
  ),
  treadmill: motion(
    (t) => {
      const p = base(),
        s = Math.sin(t * Math.PI * 2);
      p.hip[1] = 0.945 + 0.015 * Math.abs(s);
      p.feet = [
        [-0.15, 0.109 + Math.max(0, s) * 0.11, 0.1 + s * 0.24],
        [0.15, 0.109 + Math.max(0, -s) * 0.11, 0.1 - s * 0.24],
      ];
      p.hands = [
        [-0.25, 1.2, 0.15 - s * 0.13],
        [0.25, 1.2, 0.15 + s * 0.13],
      ];
      return p;
    },
    'treadmill',
    {
      camera: side,
      seconds: 2,
      continuous: true,
      phase: ['Land softly', 'Move at a steady pace'],
    },
  ),
  cycling: motion(
    (t) => {
      const p = seated();
      p.hip = [0, 1.08, -0.2];
      p.tilt = 0.45;
      p.hands = [
        [-0.25, 1.15, 0.48],
        [0.25, 1.15, 0.48],
      ];
      const a = t * Math.PI * 2;
      for (let i = 0; i < 2; i++) {
        const angle = a + i * Math.PI;
        p.feet[i] = [
          i ? 0.16 : -0.16,
          0.42 + Math.sin(angle) * 0.17,
          0.1 + Math.cos(angle) * 0.17,
        ];
      }
      return p;
    },
    'bike',
    {
      camera: side,
      seconds: 2.6,
      continuous: true,
      phase: ['Smooth pedal stroke', 'Keep the pelvis stable'],
    },
  ),
  rowing: motion(
    (t) => {
      const p = seated(),
        legs = smooth(t / 0.55),
        body = smooth((t - 0.35) / 0.45),
        pull = smooth((t - 0.65) / 0.35);
      p.hip = [0, 0.55, mix(0.18, -0.28, legs)];
      p.tilt = mix(0.3, -0.18, body);
      p.feet = [
        [-0.16, 0.16, 0.55],
        [0.16, 0.16, 0.55],
      ];
      const shoulder = local(p, [0, 0.471, 0.088]);
      p.hands = [
        [
          -0.16,
          shoulder[1] - 0.08 - 0.08 * pull,
          shoulder[2] + 0.5 - 0.28 * pull,
        ],
        [
          0.16,
          shoulder[1] - 0.08 - 0.08 * pull,
          shoulder[2] + 0.5 - 0.28 * pull,
        ],
      ];
      return p;
    },
    'rower',
    {
      camera: side,
      focus: [0, 0.7, 0.1],
      span: 2.2,
      seconds: 5.6,
      phase: ['Arms, body, legs recovery', 'Drive legs, body, then arms'],
    },
  ),
  'jump-rope': motion(
    (t) => {
      const p = standHands(base()),
        rise = Math.sin(t * Math.PI);
      p.hip[1] += 0.07 * rise;
      p.feet = [
        [-0.14, 0.074 + 0.07 * rise, 0.1],
        [0.14, 0.074 + 0.07 * rise, 0.1],
      ];
      p.hands = [
        [-0.34, 1.0, 0.13],
        [0.34, 1.0, 0.13],
      ];
      return p;
    },
    'rope',
    {
      seconds: 1.4,
      continuous: true,
      phase: ['Soft landing', 'Small controlled jump'],
    },
  ),
  'hip-flexor-stretch': motion(
    (t) => {
      const p = base();
      p.hip = [0, 0.46, mix(0, 0.04, t)];
      p.feet = [
        [-0.17, 0.074, 0.6],
        [0.17, 0.074, -0.47],
      ];
      p.knees = [
        [-0.17, 0.55, 0.6],
        [0.17, 0.04, -0.1],
      ];
      return arms(p, [-0.18, 0.18, 0.22]);
    },
    'mat',
    {
      camera: side,
      seconds: 7,
      phase: ['Half-kneeling setup', 'Gentle forward shift'],
    },
  ),
  'thoracic-rotation': motion(
    (t) => {
      const p = prone(0, true);
      p.hip = [0, 0.51, -0.15];
      p.tilt = 1.5;
      p.twist = mix(0, 0.65, t);
      p.feet = [
        [-0.16, 0.08, -0.63],
        [0.16, 0.08, -0.63],
      ];
      p.knees = [
        [-0.18, 0.06, -0.18],
        [0.18, 0.06, -0.18],
      ];
      const shoulder = local(p, [0.204, 0.471, 0.088]);
      p.hands = [
        [-0.24, 0.1, 0.43],
        [
          shoulder[0] + 0.1,
          shoulder[1] + mix(-0.4, 0.49, t),
          shoulder[2] + mix(0.1, 0, t),
        ],
      ];
      return p;
    },
    'mat',
    {
      camera: floor,
      focus: [0, 0.45, 0],
      span: 2.1,
      seconds: 6,
      phase: ['Return under control', 'Rotate the upper back'],
    },
  ),
  'hamstring-stretch': motion(
    (t) => {
      const p = base();
      p.hip = [0, 0.79, -0.07];
      p.tilt = mix(0.35, 0.6, t);
      p.feet = [
        [-0.16, 0.074, 0.5],
        [0.16, 0.074, -0.13],
      ];
      p.knees = [
        [-0.16, 0.4, 0.55],
        [0.16, 0.5, 0.5],
      ];
      return arms(p, [-0.18, 0.02, 0.22]);
    },
    'mat',
    {
      camera: side,
      seconds: 7,
      phase: ['Long back and soft knee', 'Gentle hip hinge'],
    },
  ),
};
