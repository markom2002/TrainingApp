import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api.config';
export interface Profile {
  displayName: string;
  email: string;
  gender: string;
  role: string;
  bio: string;
  goal: string;
  experience: string;
  weeklyGoal: number;
  memberSince: string;
  totalWorkouts: number;
  totalMinutes: number;
  totalCalories: number;
  weeklyWorkouts: number;
}
export type ProfileUpdate = Pick<
  Profile,
  'displayName' | 'bio' | 'goal' | 'experience' | 'weeklyGoal'
>;
@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private http: HttpClient) {}
  get() {
    return this.http.get<Profile>(`${API_BASE_URL}/profile`);
  }
  update(profile: ProfileUpdate) {
    return this.http.put<void>(`${API_BASE_URL}/profile`, profile);
  }
}
