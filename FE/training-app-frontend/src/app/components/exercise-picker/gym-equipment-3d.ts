import * as T from 'three';
import { local, type ExercisePose } from './motion-3d';
import type { AthleteRig } from './athlete-rig';
const up = new T.Vector3(0, 1, 0);
export function disposeObject(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>();
  root.traverse((n) => {
    if ((n as T.Mesh).isMesh) {
      const m = n as T.Mesh;
      geometries.add(m.geometry);
      for (const material of Array.isArray(m.material)
        ? m.material
        : [m.material])
        materials.add(material);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}
export class GymEquipment3D {
  readonly group = new T.Group();
  private steel = new T.MeshStandardMaterial({
    color: '#596173',
    metalness: 0.75,
    roughness: 0.28,
  });
  private dark = new T.MeshStandardMaterial({
    color: '#202631',
    metalness: 0.2,
    roughness: 0.65,
  });
  private pad = new T.MeshStandardMaterial({
    color: '#383244',
    roughness: 0.8,
  });
  private accent = new T.MeshStandardMaterial({
    color: '#accd76',
    metalness: 0.4,
    roughness: 0.35,
  });
  private chrome = new T.MeshStandardMaterial({
    color: '#b7bbc6',
    metalness: 0.85,
    roughness: 0.22,
  });
  private dynamicBar?: T.Group;
  private bells: T.Group[] = [];
  private cables: T.Mesh[] = [];
  private roller?: T.Mesh;
  private moving?: T.Group;
  private crank?: T.Mesh[];
  constructor(readonly key: string) {
    this.build();
  }
  private mesh(
    geometry: T.BufferGeometry,
    material: T.Material,
    parent: T.Object3D = this.group,
  ) {
    const m = new T.Mesh(geometry, material);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  private box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    material = this.steel,
    parent: T.Object3D = this.group,
  ) {
    const m = this.mesh(new T.BoxGeometry(w, h, d), material, parent);
    m.position.set(x, y, z);
    return m;
  }
  private tube(
    a: T.Vector3,
    b: T.Vector3,
    r = 0.025,
    material = this.steel,
    parent: T.Object3D = this.group,
  ) {
    const m = this.mesh(new T.CylinderGeometry(r, r, 1, 12), material, parent);
    this.link(m, a, b);
    return m;
  }
  private link(m: T.Mesh, a: T.Vector3, b: T.Vector3) {
    m.position.copy(a).add(b).multiplyScalar(0.5);
    const delta = b.clone().sub(a);
    m.scale.set(1, Math.max(0.001, delta.length()), 1);
    m.quaternion.setFromUnitVectors(up, delta.normalize());
  }
  private v(x: number, y: number, z: number) {
    return new T.Vector3(x, y, z);
  }
  private bench(incline = false, z = -0.23, y = 0.53) {
    const deck = this.box(
      0.38,
      0.09,
      incline ? 1.03 : 1.3,
      0,
      incline ? 0.77 : y,
      z,
      this.pad,
    );
    if (incline) deck.rotation.x = Math.PI / 6;
    if (incline) this.box(0.38, 0.09, 0.34, 0, 0.53, 0.27, this.pad);
    for (const zz of [-0.65, 0.22]) {
      this.tube(this.v(0, 0.05, zz), this.v(0, 0.49, zz));
      this.box(0.63, 0.05, 0.12, 0, 0.035, zz, this.dark);
    }
  }
  private tower(z = 0.85, two = false) {
    const xs = two ? [-0.9, 0.9] : [0.52];
    for (const x of xs) {
      this.box(0.065, 2.12, 0.075, x, 1.06, z);
      this.box(0.52, 0.06, 0.62, x, 0.03, z - 0.05, this.dark);
      this.box(0.25, 0.46, 0.18, x, 0.31, z, this.dark);
      for (let i = 0; i < 7; i++)
        this.box(0.26, 0.012, 0.19, x, 0.15 + i * 0.05, z, this.steel);
      const pulley = this.mesh(
        new T.TorusGeometry(0.055, 0.012, 8, 20),
        this.chrome,
      );
      pulley.position.set(x, 2.0, z);
      pulley.rotation.y = Math.PI / 2;
    }
    if (two) this.box(1.87, 0.065, 0.07, 0, 2.09, z);
  }
  private seat(y = 0.48, z = 0.04) {
    this.box(0.37, 0.1, 0.45, 0, y, z, this.pad);
    this.box(0.08, y, 0.08, 0, y / 2, z);
    this.box(0.65, 0.055, 0.55, 0, 0.025, z, this.dark);
  }
  private barbell(small = false) {
    const g = new T.Group();
    this.group.add(g);
    this.tube(this.v(-0.82, 0, 0), this.v(0.82, 0, 0), 0.014, this.chrome, g);
    for (const sign of [-1, 1]) {
      for (let i = 0; i < (small ? 1 : 2); i++) {
        const plate = this.mesh(
          new T.CylinderGeometry(
            small ? 0.13 : 0.205,
            small ? 0.13 : 0.205,
            0.045,
            32,
          ),
          i === 0 ? this.dark : this.steel,
          g,
        );
        plate.rotation.z = Math.PI / 2;
        plate.position.x = sign * (0.62 + i * 0.05);
      }
      const collar = this.mesh(
        new T.CylinderGeometry(0.032, 0.032, 0.04, 16),
        this.accent,
        g,
      );
      collar.rotation.z = Math.PI / 2;
      collar.position.x = sign * 0.75;
    }
    return g;
  }
  private dumbbell() {
    const g = new T.Group();
    this.group.add(g);
    this.tube(this.v(-0.13, 0, 0), this.v(0.13, 0, 0), 0.016, this.chrome, g);
    for (const sign of [-1, 1]) {
      const p = this.mesh(
        new T.CylinderGeometry(0.085, 0.085, 0.07, 12),
        this.dark,
        g,
      );
      p.rotation.z = Math.PI / 2;
      p.position.x = sign * 0.105;
      const cap = this.mesh(
        new T.CylinderGeometry(0.034, 0.034, 0.072, 16),
        this.accent,
        g,
      );
      cap.rotation.z = Math.PI / 2;
      cap.position.x = sign * 0.106;
    }
    return g;
  }
  private cable() {
    const m = this.tube(this.v(0, 0, 0), this.v(0, 1, 0), 0.005, this.chrome);
    this.cables.push(m);
    return m;
  }
  private build() {
    const k = this.key;
    if (k === 'mat') {
      this.box(0.95, 0.025, 2.25, 0, 0.014, -0.06, this.pad);
    }
    if (k === 'bench-bar' || k === 'incline-dumbbells') {
      this.bench(k.startsWith('incline'));
      if (k === 'bench-bar')
        for (const x of [-0.65, 0.65]) {
          this.box(0.06, 1.32, 0.06, x, 0.66, -0.65);
          this.box(0.42, 0.05, 0.5, x, 0.025, -0.65, this.dark);
          this.box(0.06, 0.04, 0.2, x, 1.18, -0.58);
        }
    }
    if (k === 'single-row') {
      this.bench(false, 0.04, 0.52);
      this.group.children.forEach((n) => (n.position.x -= 0.3));
    }
    if (k === 'split-bench') this.bench(false, -0.6, 0.43);
    if (k === 'hipthrust') {
      this.bench(false, -0.65, 0.49);
      this.dynamicBar = this.barbell();
    }
    if (['bench-bar', 'barbell', 'squat-bar'].includes(k))
      this.dynamicBar = this.barbell();
    if (
      ['dumbbells', 'incline-dumbbells', 'single-row', 'wrist-bench'].includes(
        k,
      )
    )
      this.bells = Array.from({ length: k === 'single-row' ? 1 : 2 }, () =>
        this.dumbbell(),
      );
    if (k === 'goblet' || k === 'overhead-bell') {
      this.dynamicBar = this.dumbbell();
      this.dynamicBar.rotation.z = Math.PI / 2;
    }
    if (k === 'kettlebell') {
      const g = new T.Group();
      this.group.add(g);
      const ball = this.mesh(new T.SphereGeometry(0.115, 24, 18), this.dark, g);
      ball.scale.set(1, 0.95, 0.85);
      ball.position.y = -0.15;
      const handle = this.mesh(
        new T.TorusGeometry(0.068, 0.013, 10, 24),
        this.chrome,
        g,
      );
      handle.position.y = -0.035;
      this.dynamicBar = g;
    }
    if (k === 'wrist-bench') this.seat(0.48, 0);
    if (
      [
        'lat',
        'row',
        'face-cable',
        'pushdown',
        'crunch-cable',
        'ankle-cable',
        'cable-fly',
      ].includes(k)
    ) {
      this.tower(
        k === 'lat' ? 0.85 : k === 'cable-fly' ? -0.22 : 1.15,
        k === 'cable-fly',
      );
      this.cable();
      if (k === 'cable-fly' || k === 'face-cable') this.cable();
      if (k === 'crunch-cable') { this.cable(); this.cable(); }
      if (k === 'lat') {
        // Front-mounted weight stack with an overhead arm reaching above the athlete.
        this.box(0.07, 2.12, 0.075, -0.52, 1.06, 0.85);
        this.box(1.11, 0.065, 0.075, 0, 2.09, 0.85);
        this.box(0.065, 0.065, 0.91, 0, 2.09, 0.43);
        const pulley = this.mesh(new T.TorusGeometry(0.055, 0.012, 8, 20), this.chrome);
        pulley.position.set(0, 2.04, 0.02);
        pulley.rotation.y = Math.PI / 2;
        this.seat();
        this.box(0.54, 0.07, 0.14, 0, 0.67, 0.29, this.pad);
        this.dynamicBar = new T.Group();
        this.group.add(this.dynamicBar);
        this.tube(
          this.v(-0.30, 0.026, 0),
          this.v(0.30, 0.026, 0),
          0.017,
          this.chrome,
          this.dynamicBar,
        );
        for (const sign of [-1, 1])
          this.tube(
            this.v(sign * 0.30, 0.026, 0),
            this.v(sign * 0.55, -0.024, 0),
            0.023,
            this.dark,
            this.dynamicBar,
          );
      }
      if (k === 'row') {
        this.seat();
        this.box(0.62, 0.08, 0.24, 0, 0.1, 0.67, this.dark);
      }
      if (k === 'row' || k === 'pushdown') {
        this.dynamicBar = new T.Group();
        this.group.add(this.dynamicBar);
        this.tube(
          this.v(-0.2, 0, 0),
          this.v(0.2, 0, 0),
          0.02,
          this.chrome,
          this.dynamicBar,
        );
      }
    }
    if (k === 'pullup' || k === 'dip') {
      for (const x of [-0.65, 0.65]) {
        this.box(
          0.065,
          k === 'pullup' ? 2.16 : 1.1,
          0.065,
          x,
          k === 'pullup' ? 1.08 : 0.55,
          0,
        );
        this.box(0.5, 0.05, 0.8, x, 0.025, 0, this.dark);
      }
      if (k === 'pullup')
        this.tube(
          this.v(-0.76, 2.12, 0),
          this.v(0.76, 2.12, 0),
          0.025,
          this.chrome,
        );
      else
        for (const x of [-0.3, 0.3]) {
          this.tube(
            this.v(x, 1.05, -0.42),
            this.v(x, 1.05, 0.5),
            0.028,
            this.chrome,
          );
          this.tube(this.v(x, 0, 0), this.v(x, 1.05, 0));
        }
    }
    if (k === 'preacher') {
      this.seat();
      const pad = this.box(0.65, 0.09, 0.45, 0, 0.84, 0.24, this.pad);
      pad.rotation.x = 0.6;
      this.tube(this.v(0, 0.1, 0.22), this.v(0, 0.8, 0.22));
      this.bells = [this.dumbbell(), this.dumbbell()];
    }
    if (k === 'legpress') {
      this.seat(0.38, -0.35);
      const back = this.box(0.43, 0.85, 0.1, 0, 0.74, -0.6, this.pad);
      back.rotation.x = -0.55;
      for (const x of [-0.42, 0.42])
        this.tube(this.v(x, 0.12, -0.45), this.v(x, 1.47, 0.9), 0.035);
      this.moving = new T.Group();
      this.group.add(this.moving);
      const plate = this.box(
        0.66,
        0.045,
        0.46,
        0,
        0,
        0,
        this.dark,
        this.moving,
      );
      plate.rotation.x = -Math.PI / 4;
    }
    if (k === 'legextension' || k === 'legcurl') {
      if (k === 'legcurl') {
        this.bench(false, -0.12, 0.5);
        for (const x of [-0.25, 0.25])
          this.tube(
            this.v(x, 0.55, 0.55),
            this.v(x, 0.55, 0.75),
            0.018,
            this.chrome,
          );
      } else {
        this.seat();
        this.box(0.4, 0.67, 0.07, 0, 0.83, -0.13, this.pad);
      }
      this.roller = this.tube(
        this.v(-0.32, 0.1, 0.5),
        this.v(0.32, 0.1, 0.5),
        0.075,
        this.pad,
      );
    }
    if (k === 'calf' || k === 'seated-calf') {
      if (k === 'seated-calf') {
        this.seat();
        this.box(0.5, 0.08, 0.2, 0, 0.67, 0.3, this.pad);
      }
      this.box(
        0.65,
        0.06,
        0.19,
        0,
        0.03,
        k === 'calf' ? 0.21 : 0.53,
        this.dark,
      );
    }
    if (k === 'bike') {
      for (const z of [-0.48, 0.67]) {
        const wheel = this.mesh(
          new T.CylinderGeometry(0.27, 0.27, 0.12, 36),
          this.dark,
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(0, 0.29, z);
        this.box(0.66, 0.05, 0.1, 0, 0.025, z, this.steel);
      }
      this.tube(this.v(0, 0.3, -0.48), this.v(0, 0.98, -0.24), 0.035);
      this.tube(this.v(0, 0.3, 0.67), this.v(0, 0.65, -0.24), 0.035);
      this.tube(this.v(0, 0.3, 0.67), this.v(0, 1.1, 0.48), 0.03);
      this.box(0.24, 0.06, 0.3, 0, 1.01, -0.23, this.pad);
      this.tube(
        this.v(-0.3, 1.15, 0.48),
        this.v(0.3, 1.15, 0.48),
        0.023,
        this.dark,
      );
      this.crank = [
        this.tube(
          this.v(-0.16, 0.36, 0.18),
          this.v(-0.16, 0.5, 0.18),
          0.012,
          this.chrome,
        ),
        this.tube(
          this.v(0.16, 0.36, 0.18),
          this.v(0.16, 0.2, 0.18),
          0.012,
          this.chrome,
        ),
      ];
    }
    if (k === 'rower') {
      this.box(0.17, 0.1, 1.85, 0, 0.24, 0.15);
      this.moving = new T.Group();
      this.group.add(this.moving);
      this.box(0.34, 0.09, 0.31, 0, 0, 0, this.pad, this.moving);
      const wheel = this.mesh(
        new T.CylinderGeometry(0.23, 0.23, 0.19, 32),
        this.dark,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0, 0.33, 0.98);
      this.box(0.7, 0.06, 0.3, 0, 0.035, 0.9);
      this.box(0.5, 0.06, 0.3, 0, 0.035, -0.67);
      this.box(0.55, 0.08, 0.22, 0, 0.13, 0.56, this.dark);
      this.cable();
    }
    if (k === 'treadmill') {
      this.box(0.79, 0.12, 1.75, 0, -0.035, 0, this.dark);
      this.box(0.66, 0.012, 1.62, 0, 0.031, 0, this.pad);
      for (const x of [-0.4, 0.4])
        this.tube(this.v(x, 0, 0.75), this.v(x, 1.1, 0.85), 0.03);
      this.box(0.87, 0.1, 0.24, 0, 1.12, 0.85, this.dark);
      this.box(0.34, 0.13, 0.04, 0, 1.24, 0.87, this.accent);
    }
    if (k === 'rope') for (let i = 0; i < 30; i++) this.cable();
  }
  update(p: ExercisePose, rig: AthleteRig, t: number) {
    const k = this.key,
      mid = rig.hands[0].clone().add(rig.hands[1]).multiplyScalar(0.5);
    if (this.dynamicBar) {
      this.dynamicBar.position.copy(mid);
      if (k === 'squat-bar')
        this.dynamicBar.position.fromArray(local(p, [0, 0.45, -0.14]));
      if (k === 'hipthrust')
        this.dynamicBar.position.set(0, p.hip[1] + 0.09, p.hip[2] + 0.02);
    }
    this.bells.forEach((bell, i) => {
      const hand = k === 'single-row' ? 1 : i;
      bell.position.copy(rig.hands[hand]);
      bell.quaternion.copy(rig.handRotations[hand]);
    });
    if (this.cables.length && k !== 'rope') {
      if (k === 'cable-fly')
        for (let i = 0; i < 2; i++)
          this.link(
            this.cables[i],
            this.v(i === 0 ? -0.9 : 0.9, 1.35, -0.22),
            rig.hands[i],
          );
      else if (k === 'crunch-cable') {
        const knot = mid.clone().add(this.v(0, .18, .3));
        this.link(this.cables[0], this.v(.52, 2, 1.15), knot);
        this.link(this.cables[1], knot, rig.hands[0]);
        this.link(this.cables[2], knot, rig.hands[1]);
      }
      else if (k === 'face-cable')
        for (let i = 0; i < 2; i++)
          this.link(this.cables[i], this.v(0.52, 1.7, 1.15), rig.hands[i]);
      else {
        const anchor =
          k === 'lat'
            ? this.v(0, 2.04, 0.02)
            : k === 'row'
              ? this.v(0.52, 0.86, 1.15)
              : k === 'rower'
                ? this.v(0, 0.55, 0.98)
                : k === 'ankle-cable'
                  ? this.v(0.52, 0.12, 1.15)
                  : this.v(0.52, 2, 1.15);
        this.link(
          this.cables[0],
          anchor,
          k === 'ankle-cable' ? rig.feet[1] : mid,
        );
      }
    }
    const feetMid = rig.feet[0].clone().add(rig.feet[1]).multiplyScalar(0.5);
    if (this.roller) {
      this.roller.position.copy(feetMid);
      if (k === 'legextension') this.roller.position.add(this.v(0, 0.05, 0.11));
      else this.roller.position.y += 0.09;
    }
    if (this.moving) {
      if (k === 'rower') this.moving.position.set(0, 0.48, p.hip[2]);
      else this.moving.position.copy(feetMid).add(this.v(0, -0.07, 0.07));
    }
    this.crank?.forEach((c, i) =>
      this.link(
        c,
        this.v(i ? 0.16 : -0.16, 0.36, 0.18),
        rig.feet[i].clone().add(this.v(0, -0.06, 0.08)),
      ),
    );
    if (k === 'rope') {
      const angle = t * Math.PI * 2,
        points: T.Vector3[] = [];
      for (let i = 0; i <= 30; i++) {
        const u = (i / 30) * Math.PI;
        points.push(
          this.v(
            -0.34 * Math.cos(u),
            mid.y - 0.97 * Math.sin(u) * Math.cos(angle),
            mid.z + 0.97 * Math.sin(u) * Math.sin(angle),
          ),
        );
      }
      this.cables.forEach((c, i) => this.link(c, points[i], points[i + 1]));
    }
  }
  dispose() {
    disposeObject(this.group);
    this.steel.dispose();
    this.dark.dispose();
    this.pad.dispose();
    this.accent.dispose();
    this.chrome.dispose();
  }
}
