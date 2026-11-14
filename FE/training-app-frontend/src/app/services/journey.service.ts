import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api.config';
import { tap } from 'rxjs';
import { ProgressionService } from './progression.service';
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  xp: number;
  progress: number;
  target: number;
  unlocked: boolean;
}
export interface PersonalRecord {
  exerciseId: string;
  name: string;
  weightKg: number;
  previousKg: number;
  achievedOn: string;
}
export interface Measurement {
  id: number;
  measuredOn: string;
  weightKg: number;
}
export interface Journey {
  startingWeightKg?:number|null;targetWeightKg?:number|null;goalProgressPercent?:number;
  accountId?: number;
  currentStreak: number;
  bestStreak: number;
  totalWorkouts: number;
  xp: number;
  level: number;
  levelXp: number;
  nextLevelXp: number;
  trainedToday: boolean;
  streakDeadline: string | null;
  week: { date: string; trained: boolean }[];
  achievements: Achievement[];
  personalRecords: PersonalRecord[];
  bodyGoal: string;
  measurements: Measurement[];
  weightChangeKg: number | null;
}
@Injectable({ providedIn: 'root' })
export class JourneyService {
  constructor(
    private http: HttpClient,
    private progression: ProgressionService,
  ) {}
  get() {
    return this.http
      .get<Journey>(`${API_BASE_URL}/journey`)
      .pipe(tap((journey) => this.progression.observe(journey)));
  }
  weighIn(weightKg: number, measuredOn: string) {
    return this.http.put(`${API_BASE_URL}/journey/measurements`, {
      weightKg,
      measuredOn,
    });
  }
  removeMeasurement(id: number) {
    return this.http.delete(`${API_BASE_URL}/journey/measurements/${id}`);
  }
  setBodyGoal(goal: string, startingWeightKg:number|null=null,targetWeightKg:number|null=null) {
    return this.http.put(`${API_BASE_URL}/journey/body-goal`, { goal,startingWeightKg,targetWeightKg });
  }
}
