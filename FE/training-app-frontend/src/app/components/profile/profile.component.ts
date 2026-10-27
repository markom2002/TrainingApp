import { AuthService } from '../../services/auth.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, finalize, switchMap } from 'rxjs';
import {
  Profile,
  ProfileService,
  ProfileUpdate,
} from '../../services/profile.service';
import { apiErrorMessage } from '../../services/api-error';
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: [
    './profile-layout.css',
    './profile.component.css',
    './profile-impact.css',
  ],
})
export class ProfileComponent implements OnInit, OnDestroy {
  profile?: Profile;
  model: ProfileUpdate = {
    displayName: '',
    bio: '',
    goal: 'Stay consistent',
    experience: 'Beginner',
    weeklyGoal: 3,
  };
  loading = false;
  saving = false;
  errorMessage = '';
  saved = false;
  readonly goals = [
    'Stay consistent',
    'Build strength',
    'Improve endurance',
    'Improve mobility',
  ];
  readonly levels = ['Beginner', 'Intermediate', 'Advanced'];
  private request?: Subscription;
  private saveRequest?: Subscription;
  constructor(
    private service: ProfileService,
    public authService: AuthService,
  ) {}
  ngOnInit() {
    this.load();
  }
  ngOnDestroy() {
    this.request?.unsubscribe();
    this.saveRequest?.unsubscribe();
  }
  get initials() {
    return (this.profile?.displayName || 'You')
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0])
      .join('')
      .toUpperCase();
  }
  get progress() {
    return this.profile
      ? Math.min(
          100,
          (this.profile.weeklyWorkouts / this.profile.weeklyGoal) * 100,
        )
      : 0;
  }
  private assign(profile: Profile) {
    this.profile = profile;
    this.model = {
      displayName: profile.displayName,
      bio: profile.bio,
      goal: profile.goal,
      experience: profile.experience,
      weeklyGoal: profile.weeklyGoal,
    };
  }
  load() {
    this.request?.unsubscribe();
    this.loading = true;
    this.errorMessage = '';
    this.request = this.service
      .get()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (profile) => this.assign(profile),
        error: (error) => (this.errorMessage = apiErrorMessage(error)),
      });
  }
  save(form: NgForm) {
    if (form.invalid || this.saving || !this.model.displayName.trim()) {
      form.control.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.saved = false;
    this.saveRequest = this.service
      .update({ ...this.model, displayName: this.model.displayName.trim() })
      .pipe(
        switchMap(() => this.service.get()),
        finalize(() => (this.saving = false)),
      )
      .subscribe({
        next: (profile) => {
          this.assign(profile);
          this.saved = true;
          form.form.markAsPristine();
        },
        error: (error) => (this.errorMessage = apiErrorMessage(error)),
      });
  }
}
