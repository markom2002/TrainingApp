import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AthleteRig } from './athlete-rig';
import { GymEquipment3D, disposeObject } from './gym-equipment-3d';
import { EXERCISE_MOTIONS, type ExerciseMotion } from './motion-3d';
export class MovementScene {
  private scene = new T.Scene();
  private camera = new T.OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.05, 30);
  private renderer: T.WebGLRenderer;
  private rig?: AthleteRig;
  private equipment?: GymEquipment3D;
  private motion: ExerciseMotion = EXERCISE_MOTIONS['bench-press'];
  private view = 'three-quarter';
  private rearMuscles = false;
  private width = 1;
  private height = 1;
  private constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new T.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.scene.add(new T.HemisphereLight('#f3f0e9', '#24252d', 1.0));
    const key = new T.DirectionalLight('#fff6e9', 3.0);
    key.position.set(2.5, 4.5, 3.5);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.left = -2;
    key.shadow.camera.right = 2;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -2;
    key.shadow.normalBias = 0.03;
    this.scene.add(key);
    const rim = new T.DirectionalLight('#f0ede6', 2.7);
    rim.position.set(-3, 2, -2);
    this.scene.add(rim);
    const fill = new T.DirectionalLight('#e4edf7', 0.45);
    fill.position.set(2, 1, -3);
    this.scene.add(fill);
    const floor = new T.Mesh(
      new T.CircleGeometry(1.85, 64),
      new T.MeshStandardMaterial({ color: '#161b24', roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.027;
    floor.receiveShadow = true;
    this.scene.add(floor);
    const grid = new T.GridHelper(3.2, 16, '#343644', '#262b35');
    grid.position.y = -0.025;
    for (const m of Array.isArray(grid.material)
      ? grid.material
      : [grid.material]) {
      m.transparent = true;
      m.opacity = 0.32;
    }
    this.scene.add(grid);
  }
  static async create(canvas: HTMLCanvasElement, signal: AbortSignal) {
    const stage = new MovementScene(canvas);
    try {
      const response = await fetch('/models/athlete-v3.glb', { signal });
      if (!response.ok) throw new Error('Athlete asset unavailable');
      const gltf = await new GLTFLoader().parseAsync(
        await response.arrayBuffer(),
        '',
      );
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      stage.rig = new AthleteRig(gltf.scene);
      stage.scene.add(gltf.scene);
      canvas.dataset['renderer'] = 'webgl2';
      return stage;
    } catch (error) {
      stage.dispose();
      throw error;
    }
  }
  setExercise(id: string, group: string) {
    this.rearMuscles =
      ['Back', 'Hamstrings', 'Glutes', 'Triceps', 'Calves'].includes(group) ||
      ['thoracic-rotation','reverse-fly','face-pull'].includes(id);
    this.motion = EXERCISE_MOTIONS[id] ?? EXERCISE_MOTIONS['bench-press'];
    if (this.equipment) {
      this.scene.remove(this.equipment.group);
      this.equipment.dispose();
    }
    this.equipment = new GymEquipment3D(this.motion.equipment);
    this.scene.add(this.equipment.group);
    this.rig?.highlight(group, id);
    this.canvas.dataset['exercise'] = id;
    this.setView(this.view);
  }
  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.setView(this.view);
  }
  setView(view: string) {
    this.view = view;
    const focus = new T.Vector3(...this.motion.focus);
    let position = new T.Vector3(...this.motion.camera);
    if (view === 'three-quarter' && this.rearMuscles)
      position.z = -Math.abs(position.z);
    if (view === 'side')
      position.set(
        4.4,
        this.motion.focus[1] + 0.75,
        this.motion.focus[2] + 0.05,
      );
    if (view === 'back') position.set(-2.8, this.motion.focus[1] + 1, -3.6);
    const aspect = this.width / this.height,
      span = this.motion.span * Math.max(1,0.95/aspect);
    this.camera.left = (-span * aspect) / 2;
    this.camera.right = (span * aspect) / 2;
    this.camera.top = span / 2;
    this.camera.bottom = -span / 2;
    this.camera.position.copy(position);
    this.camera.lookAt(focus);
    this.camera.updateProjectionMatrix();
  }
  render(progress: number) {
    if (!this.rig) return;
    const pose = this.motion.sample(progress);
    this.rig.contract(progress);
    this.rig.update(pose);
    this.equipment?.update(pose, this.rig, progress);
    this.renderer.render(this.scene, this.camera);
    this.canvas.dataset['progress'] = progress.toFixed(4);
    this.canvas.dataset['triangles'] = String(
      this.renderer.info.render.triangles,
    );
  }
  dispose() {
    this.rig?.dispose();
    this.equipment?.dispose();
    this.equipment = undefined;
    disposeObject(this.scene);
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
