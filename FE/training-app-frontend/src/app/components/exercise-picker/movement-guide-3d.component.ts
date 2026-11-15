import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { ExerciseDefinition } from '../../models/exercise.model';
import { MOVEMENT_GUIDES } from './movement-guides';
import { EXERCISE_MOTIONS } from './motion-3d';
import type { MovementScene } from './movement-scene';
@Component({
  selector: 'app-movement-guide',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './movement-guide-3d.component.html',
  styleUrls: ['./movement-guide-3d.css'],
})
export class MovementGuideComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() exercise?: ExerciseDefinition;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('viewport') viewport!: ElementRef<HTMLElement>;
  readonly ready = signal(false);
  readonly error = signal(false);
  readonly progress = signal(0.12);
  readonly paused = signal(
    matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  readonly phaseLabel = signal('Controlled movement');
  speed = 1;
  view = 'three-quarter';
  private engine?: MovementScene;
  private controller?: AbortController;
  private visibility?: IntersectionObserver;
  private resize?: ResizeObserver;
  private visible = false;
  private destroyed = false;
  private loading = false;
  private raf = 0;
  private clock = 0;
  private last = 0;
  private lastRender = 0;
  private lastUi = 0;
  private motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  private preferenceChanged = (event: MediaQueryListEvent) => {
    if (event.matches) this.paused.set(true);
  };
  constructor(private zone: NgZone) {
    this.motionPreference.addEventListener('change', this.preferenceChanged);
  }
  get guide() {
    return (
      MOVEMENT_GUIDES[this.exercise?.id ?? ''] ?? MOVEMENT_GUIDES['bench-press']
    );
  }
  get motion() {
    return (
      EXERCISE_MOTIONS[this.exercise?.id ?? 'bench-press'] ??
      EXERCISE_MOTIONS['bench-press']
    );
  }
  ngOnChanges() {
    this.clock = Math.acos(1 - 2 * 0.12) / (Math.PI * 2);
    this.progress.set(0.12);
    this.view = 'three-quarter';
    this.phaseLabel.set('Start position');
    if (this.exercise && this.engine) {
      this.engine.setExercise(this.exercise.id, this.exercise.muscleGroup);
      this.engine.setView(this.view);
      this.engine.render(this.progress());
    }
  }
  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.visibility = new IntersectionObserver((entries) => {
        this.visible = entries[0]?.isIntersecting ?? false;
        if (this.visible && !this.engine && !this.loading && !this.error())
          void this.load();
      });
      this.visibility.observe(this.viewport.nativeElement);
      this.resize = new ResizeObserver(() => {
        const r = this.viewport.nativeElement.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          this.engine?.resize(r.width, r.height);
          this.engine?.render(this.progress());
        }
      });
      this.resize.observe(this.viewport.nativeElement);
      const tick = (now: number) => {
        if (this.destroyed) return;
        this.raf = requestAnimationFrame(tick);
        const delta = this.last ? Math.min((now - this.last) / 1000, 0.08) : 0;
        this.last = now;
        if (!this.engine || !this.visible || document.hidden || this.paused())
          return;
        this.clock += (delta * this.speed) / this.motion.seconds;
        if (now - this.lastRender < 33) return;
        this.lastRender = now;
        const cycle = this.clock % 1;
        const p = this.motion.continuous
          ? cycle
          : (1 - Math.cos(cycle * Math.PI * 2)) / 2;
        this.engine.render(p);
        if (now - this.lastUi > 100) {
          this.progress.set(p);
          this.phaseLabel.set(this.motion.phase[cycle < 0.5 ? 1 : 0]);
          this.lastUi = now;
        }
      };
      this.raf = requestAnimationFrame(tick);
    });
  }
  private async load() {
    this.loading = true;
    this.error.set(false);
    this.controller = new AbortController();
    try {
      const { MovementScene } = await import('./movement-scene');
      if (this.destroyed) return;
      const engine = await MovementScene.create(
        this.canvas.nativeElement,
        this.controller.signal,
      );
      if (this.destroyed) {
        engine.dispose();
        return;
      }
      this.engine = engine;
      if (this.exercise)
        engine.setExercise(this.exercise.id, this.exercise.muscleGroup);
      const r = this.viewport.nativeElement.getBoundingClientRect();
      engine.resize(r.width, r.height);
      engine.setView(this.view);
      engine.render(this.progress());
      this.ready.set(true);
    } catch (error) {
      if (!this.destroyed && (error as Error).name !== 'AbortError')
        this.error.set(true);
    } finally {
      this.loading = false;
    }
  }
  retry() {
    this.zone.runOutsideAngular(() => void this.load());
  }
  toggle() {
    this.paused.update((value) => !value);
  }
  seek(value: string) {
    const p = Math.max(0, Math.min(1, Number(value)));
    this.paused.set(true);
    this.progress.set(p);
    this.clock = this.motion.continuous
      ? p
      : Math.acos(1 - 2 * p) / (Math.PI * 2);
    this.phaseLabel.set(
      p < 0.03
        ? 'Start position'
        : p > 0.97
          ? 'End position'
          : 'Inspect the movement',
    );
    this.engine?.render(p);
  }
  setView(view: string) {
    this.view = view;
    this.engine?.setView(view);
    this.engine?.render(this.progress());
  }
  ngOnDestroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.controller?.abort();
    this.motionPreference.removeEventListener('change', this.preferenceChanged);
    this.visibility?.disconnect();
    this.resize?.disconnect();
    this.engine?.dispose();
  }
}
