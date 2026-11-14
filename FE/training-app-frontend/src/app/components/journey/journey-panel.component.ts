import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Subscription, finalize, switchMap } from 'rxjs';
import { Journey, JourneyService } from '../../services/journey.service';
import { apiErrorMessage } from '../../services/api-error';
import { UiIconComponent } from '../ui-icon.component';
import { InstallAppComponent } from '../install-app.component';
import { ProgressionService } from '../../services/progression.service';
@Component({
  selector: 'app-journey-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    UiIconComponent,
    InstallAppComponent,
  ],
  templateUrl: './journey-panel.component.html',
  styleUrls: [
    './journey-panel.css',
    './journey-feedback.css',
    './journey-achievements.css',
    './journey-details.css',
    './journey-records.css',
    './journey-responsive.css',
  ],
})
export class JourneyPanelComponent implements OnInit, OnDestroy {
  @Input() expanded = false;
  data?: Journey;
  loading = false;
  saving = false;
  error = '';
  notice = '';
  filter = 'all';
  rewardCategory = 'all';
  showAllRewards = false;
  celebration = false;
  weightKg: number | null = null;
  readonly today = new Date().toISOString().slice(0, 10);
  measuredOn = this.today;
  bodyGoal = 'Track';
  startWeight: number | null = null;
  targetWeight: number | null = null;
  private read?: Subscription;
  private mutation?: Subscription;
  constructor(
    private service: JourneyService,
    private route: ActivatedRoute,
    public progression: ProgressionService,
  ) {}
  ngOnInit() {
    this.celebration = this.route.snapshot.queryParamMap.get('saved') === '1';
    this.load();
  }
  ngOnDestroy() {
    this.read?.unsubscribe();
    this.mutation?.unsubscribe();
  }
  get unlocked() {
    return this.data?.achievements.filter((a) => a.unlocked).length ?? 0;
  }
  get next() {
    return this.data?.achievements.find((a) => !a.unlocked);
  }
  get visible() {
    const list = this.data?.achievements ?? [];
    const filtered = this.expanded
      ? list.filter(
          (a) =>
            this.filter === 'all' ||
            (this.filter === 'unlocked' ? a.unlocked : !a.unlocked),
        )
      : list.slice(0, 5);
    const categorized = filtered.filter(
      (a) =>
        this.rewardCategory === 'all' ||
        (this.rewardCategory === 'body'
          ? a.id.startsWith('body') || a.id.startsWith('goal')
          : this.rewardCategory === 'strength'
            ? a.id.includes('pr') ||
              a.id.startsWith('records') ||
              a.id.startsWith('sets') ||
              a.id.startsWith('muscle')
            : !a.id.startsWith('body') && !a.id.startsWith('goal')),
    );
    return this.showAllRewards ? categorized : categorized.slice(0, 12);
  }
  get latest() {
    return this.data?.measurements.at(-1);
  }
  get chartPoints() {
    const values = this.data?.measurements.slice(-20) ?? [];
    if (values.length < 2) return '';
    const min = Math.min(...values.map((m) => m.weightKg)) - 0.5;
    const max = Math.max(...values.map((m) => m.weightKg)) + 0.5;
    return values
      .map(
        (m, i) =>
          `${10 + (i / (values.length - 1)) * 280},${90 - ((m.weightKg - min) / (max - min)) * 70}`,
      )
      .join(' ');
  }
  load() {
    this.read?.unsubscribe();
    this.loading = true;
    this.error = '';
    this.read = this.service
      .get()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (d) => {
          this.data = d;
          this.bodyGoal = d.bodyGoal;
          this.startWeight = d.startingWeightKg ?? null;
          this.targetWeight = d.targetWeightKg ?? null;
        },
        error: (e) => (this.error = apiErrorMessage(e)),
      });
  }
  saveWeight(form: NgForm) {
    if (form.invalid || this.weightKg === null || this.saving) {
      form.control.markAllAsTouched();
      return;
    }
    this.run(
      this.service.weighIn(this.weightKg, this.measuredOn),
      'Weigh-in saved. Your progress is up to date.',
    );
  }
  saveGoal() {
    this.run(
      this.service.setBodyGoal(
        this.bodyGoal,
        this.bodyGoal === 'Track' ? null : this.startWeight,
        this.bodyGoal === 'Track' ? null : this.targetWeight,
      ),
      'Your direction is saved.',
    );
  }
  removeWeight(id: number) {
    this.run(this.service.removeMeasurement(id), 'Weigh-in removed.');
  }
  private run(
    request: ReturnType<JourneyService['setBodyGoal']>,
    notice: string,
  ) {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    this.notice = '';
    this.mutation = request
      .pipe(
        switchMap(() => this.service.get()),
        finalize(() => (this.saving = false)),
      )
      .subscribe({
        next: (d) => {
          this.data = d;
          this.bodyGoal = d.bodyGoal;
          this.notice = notice;
        },
        error: (e) => (this.error = apiErrorMessage(e)),
      });
  }
}