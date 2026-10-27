import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  provideHttpClientTesting,
  HttpTestingController,
} from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ProfileComponent } from './profile.component';
import { API_BASE_URL } from '../../api.config';

const profile = {
  displayName: 'Marko',
  email: 'marko@example.com',
  gender: 'Male',
  role: 'User',
  bio: '',
  goal: 'Build strength',
  experience: 'Beginner',
  weeklyGoal: 3,
  memberSince: '2026-01-01',
  totalWorkouts: 12,
  totalMinutes: 540,
  totalCalories: 3000,
  weeklyWorkouts: 4,
};
describe('Personal profile', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    const fixture = TestBed.createComponent(ProfileComponent);
    const requests = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    requests.expectOne(`${API_BASE_URL}/profile`).flush(profile);
    fixture.detectChanges();
    return { fixture, requests };
  }
  it('renders account data and caps the weekly ring at 100 percent', () => {
    const { fixture, requests } = setup();
    expect(
      fixture.nativeElement.querySelector('.identity h2').textContent,
    ).toContain('Marko');
    expect(fixture.componentInstance.progress).toBe(100);
    expect(
      fixture.nativeElement.querySelector('#profile-email').readOnly,
    ).toBeTrue();
    requests.verify();
    fixture.destroy();
  });
  it('sends only editable fields and confirms the persisted profile', async () => {
    const { fixture, requests } = setup();
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector(
      '#display-name',
    ) as HTMLInputElement;
    input.value = 'New name';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    const save = requests.expectOne(`${API_BASE_URL}/profile`);
    expect(save.request.method).toBe('PUT');
    expect(save.request.body.displayName).toBe('New name');
    expect(save.request.body.email).toBeUndefined();
    expect(save.request.body.role).toBeUndefined();
    save.flush(null, { status: 204, statusText: 'No Content' });
    requests
      .expectOne(`${API_BASE_URL}/profile`)
      .flush({ ...profile, displayName: 'New name' });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.save-note').textContent,
    ).toContain('Profile saved');
    requests.verify();
    fixture.destroy();
  });
});
