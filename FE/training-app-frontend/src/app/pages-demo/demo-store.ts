import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { DEMO_CATALOG } from './catalog';
import type { WorkoutExercise } from '../models/exercise.model';
import type { Achievement, Journey, Measurement, PersonalRecord } from '../services/journey.service';
import type { ProfileUpdate } from '../services/profile.service';

export const DEMO_STORAGE_KEY = 'training.pages-demo.v1';
const ACCOUNT = 700001;
const DAY = 86400000;
type DemoTraining = {
  id: number; userId: number; clientId?: string; exerciseType: string | number;
  durationMinutes: number; calories: number; intensity: number; fatigue: number;
  trainingDate: string; notes: string; trainingVariant: string; exercises: WorkoutExercise[];
};
type DemoState = {
  version: 1; signedIn: boolean; nextId: number; workouts: DemoTraining[];
  profile: ProfileUpdate; measurements: Measurement[];
  bodyGoal: string; startingWeightKg: number | null; targetWeightKg: number | null;
};
const dateKey = (date: string | Date) => new Date(date).toISOString().slice(0, 10);
const today = () => new Date(dateKey(new Date()) + 'T00:00:00Z');
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const round = (value: number) => Math.round(value * 100) / 100;
const typeName = (type: string | number) => typeof type === 'number' ? ['Cardio', 'Strength', 'Flexibility'][type] : type;
const problem = (status: number, detail: string) => new HttpErrorResponse({ status, error: { status, title: 'Browser demo', detail } });

function seed(): DemoState {
  const workouts: DemoTraining[] = Array.from({ length: 12 }, (_, index) => {
    const load = 20 + index * 2.5;
    const pounds = index % 2 === 0;
    const date = new Date(today().getTime() - (11 - index) * 3 * DAY + 10 * 3600000);
    return {
      id: index + 1, userId: ACCOUNT, exerciseType: 'Strength', durationMinutes: 40 + index % 4 * 5,
      calories: 0, intensity: 6 + index % 3, fatigue: 4, trainingDate: date.toISOString(),
      trainingVariant: 'Unisex', notes: 'Sample workout. Try editing or repeating this session.',
      exercises: [
        { exerciseId: 'lat-pulldown', sets: 3, reps: 10, durationSeconds: null,
          weightUnit: pounds ? 'lbs' : 'kg', weightValue: pounds ? 50 + index * 5 : load,
          weightKg: pounds ? round((50 + index * 5) * 0.45359237) : load, position: 0 },
        { exerciseId: 'seated-cable-row', sets: 3, reps: 12, durationSeconds: null,
          weightUnit: 'kg', weightValue: load, weightKg: load, position: 1 },
      ],
    };
  });
  return { version: 1, signedIn: false, nextId: 13, workouts,
    profile: { displayName: 'Demo Athlete', bio: 'A sample profile. Make this demo your own.',
      goal: 'Build strength', experience: 'Intermediate', weeklyGoal: 3 },
    measurements: [], bodyGoal: 'Track', startingWeightKg: null, targetWeightKg: null };
}

@Injectable({ providedIn: 'root' })
export class DemoStore {
  private load(): DemoState {
    const stored = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!stored) return seed();
    try {
      const state = JSON.parse(stored);
      if (state.version === 1 && Array.isArray(state.workouts) && Array.isArray(state.measurements)
        && state.profile && Number.isInteger(state.nextId)) return state;
    } catch { /* A damaged demo can be reset without touching other app storage. */ }
    throw problem(409, 'The saved demo could not be read. Use Reset demo to restore sample data.');
  }

  private save(state: DemoState) {
    try { localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state)); }
    catch { throw problem(507, 'Browser storage is full or unavailable. No changes were saved.'); }
  }

  reset() {
    this.save(seed());
    // Only this synthetic account's achievement baseline is reset.
    localStorage.removeItem(`form.progression.v1.${ACCOUNT}`);
  }

  private token() {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return { token: `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: String(ACCOUNT), exp: Math.floor(Date.now() / 1000) + 900, role: 'User', email: 'demo@example.invalid' })}.browser-demo`,
      expiresAtUtc: new Date(Date.now() + 900000).toISOString() };
  }

  handle(request: HttpRequest<unknown>): unknown {
    const path = request.url.replace(/^\/api/, '');
    const method = request.method;
    // This metadata never requires storage, so reset and entry remain available.
    if (path === '/auth/demo' && method === 'GET') return { enabled: true };
    const state = this.load();
    if (path === '/auth/demo' && method === 'POST') {
      state.signedIn = true; this.save(state); return this.token();
    }
    if (path === '/auth/refresh') {
      if (!state.signedIn) throw problem(401, 'Open the interactive demo to continue.');
      return this.token();
    }
    if (path === '/auth/logout') { state.signedIn = false; this.save(state); return null; }
    if (path.startsWith('/auth/')) throw problem(400, 'No account or password is needed. Select Explore browser demo.');
    if (!state.signedIn) throw problem(401, 'Open the interactive demo to continue.');
    if (method === 'GET' && path === '/exercises') return DEMO_CATALOG;
    if (path === '/profile') {
      if (method === 'PUT') {
        const body = request.body as ProfileUpdate;
        state.profile = { displayName: body.displayName, bio: body.bio, goal: body.goal,
          experience: body.experience, weeklyGoal: body.weeklyGoal };
        this.save(state); return null;
      }
      if (method === 'GET') {
        const weekStart = today().getTime() - (today().getUTCDay() + 6) % 7 * DAY;
        return { ...state.profile, email: 'demo@example.invalid', gender: 'Other', role: 'User',
          memberSince: state.workouts[0]?.trainingDate ?? today().toISOString(),
          totalWorkouts: state.workouts.length, totalMinutes: sum(state.workouts.map(w => w.durationMinutes)),
          totalCalories: sum(state.workouts.map(w => w.calories)),
          weeklyWorkouts: state.workouts.filter(w => new Date(w.trainingDate).getTime() >= weekStart
            && new Date(w.trainingDate).getTime() < weekStart + 7 * DAY).length };
      }
    }
    if (path === '/journey' && method === 'GET') return this.journey(state);
    if (path === '/journey/measurements' && method === 'PUT') {
      const body = request.body as { weightKg: number; measuredOn: string };
      const existing = state.measurements.find(m => dateKey(m.measuredOn) === dateKey(body.measuredOn));
      if (existing) existing.weightKg = body.weightKg;
      else state.measurements.push({ id: state.nextId++, weightKg: body.weightKg, measuredOn: dateKey(body.measuredOn) + 'T00:00:00Z' });
      state.measurements.sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
      this.save(state); return null;
    }
    if (path.startsWith('/journey/measurements/') && method === 'DELETE') {
      state.measurements = state.measurements.filter(m => m.id !== Number(path.split('/').at(-1)));
      this.save(state); return null;
    }
    if (path === '/journey/body-goal' && method === 'PUT') {
      const body = request.body as { goal: string; startingWeightKg: number | null; targetWeightKg: number | null };
      state.bodyGoal = body.goal; state.startingWeightKg = body.startingWeightKg; state.targetWeightKg = body.targetWeightKg;
      this.save(state); return null;
    }
    const month = () => {
      const year = Number(request.params.get('year') ?? today().getUTCFullYear());
      const selectedMonth = Number(request.params.get('month') ?? today().getUTCMonth() + 1);
      return { year, selectedMonth, items: state.workouts.filter(w => {
        const date = new Date(w.trainingDate); return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === selectedMonth;
      }) };
    };
    if (path === '/journey/calendar' && method === 'GET') return month().items;
    if (path === '/trainings/month' && method === 'GET') return this.weeks(month().items);
    if (path === '/trainings/overview' && method === 'GET') {
      const { year, selectedMonth, items } = month();
      const previousDate = new Date(Date.UTC(year, selectedMonth - 2, 1));
      const previous = state.workouts.filter(w => {
        const date = new Date(w.trainingDate);
        return date.getUTCFullYear() === previousDate.getUTCFullYear() && date.getUTCMonth() === previousDate.getUTCMonth();
      }).length;
      return { year, month: selectedMonth, workouts: items.length, minutes: sum(items.map(w => w.durationMinutes)),
        calories: sum(items.map(w => w.calories)), averageIntensity: this.average(items.map(w => w.intensity)),
        averageFatigue: this.average(items.map(w => w.fatigue)), previousWorkouts: previous,
        workoutChangePercent: previous ? round((items.length - previous) / previous * 100) : null,
        weeklyActivity: this.weeks(items).map(w => ({ week: w.week, workouts: w.count, minutes: w.totalDuration })),
        exerciseBreakdown: [...new Set(items.map(w => typeName(w.exerciseType)))].map(type => {
          const group = items.filter(w => typeName(w.exerciseType) === type);
          return { exerciseType: type, workouts: group.length, minutes: sum(group.map(w => w.durationMinutes)) };
        }) };
    }
    if (path === '/trainings' && method === 'GET') {
      let items = [...state.workouts];
      const from = request.params.get('from'), to = request.params.get('to'), type = request.params.get('exerciseType');
      if (from) items = items.filter(w => dateKey(w.trainingDate) >= from);
      if (to) items = items.filter(w => dateKey(w.trainingDate) <= to);
      if (type) items = items.filter(w => typeName(w.exerciseType) === type || String(w.exerciseType) === type);
      const allowed = ['trainingDate', 'durationMinutes', 'calories', 'intensity'] as const;
      const key = allowed.find(key => key === request.params.get('sortBy')) ?? 'trainingDate';
      const direction = request.params.get('sortDirection') === 'asc' ? 1 : -1;
      items.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * direction || a.id - b.id);
      const page = Math.max(1, Number(request.params.get('page') ?? 1));
      const pageSize = Math.min(100, Math.max(1, Number(request.params.get('pageSize') ?? 10)));
      return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize,
        totalCount: items.length, totalPages: Math.ceil(items.length / pageSize) };
    }
    if (path === '/trainings' && method === 'POST') {
      const body = request.body as DemoTraining;
      const duplicate = body.clientId && state.workouts.find(w => w.clientId === body.clientId);
      if (duplicate) return duplicate;
      const workout = { ...body, exerciseType: typeName(body.exerciseType),
        trainingDate: new Date(body.trainingDate).toISOString(), id: state.nextId++, userId: ACCOUNT };
      state.workouts.push(workout); this.save(state); return workout;
    }
    const match = /^\/trainings\/(\d+)$/.exec(path);
    if (match) {
      const index = state.workouts.findIndex(w => w.id === Number(match[1]));
      if (index < 0) throw problem(404, 'This sample workout could not be found.');
      if (method === 'GET') return state.workouts[index];
      if (method === 'PUT') {
        const body = request.body as DemoTraining;
        state.workouts[index] = { ...body, exerciseType: typeName(body.exerciseType),
          trainingDate: new Date(body.trainingDate).toISOString(), id: Number(match[1]), userId: ACCOUNT };
        this.save(state); return state.workouts[index];
      }
      if (method === 'DELETE') { state.workouts.splice(index, 1); this.save(state); return null; }
    }
    // Never fall through to a network request on an unimplemented demo route.
    throw problem(404, 'This action is not available in the browser demo.');
  }

  private average(values: number[]) { return values.length ? round(sum(values) / values.length) : 0; }
  private weeks(workouts: DemoTraining[]) {
    const groups = new Map<number, DemoTraining[]>();
    for (const workout of workouts) {
      const week = Math.floor((new Date(workout.trainingDate).getUTCDate() - 1) / 7) + 1;
      groups.set(week, [...groups.get(week) ?? [], workout]);
    }
    return [...groups].sort(([a], [b]) => a - b).map(([week, items]) => ({ week,
      count: items.length, totalDuration: sum(items.map(w => w.durationMinutes)),
      avgIntensity: this.average(items.map(w => w.intensity)), avgFatigue: this.average(items.map(w => w.fatigue)) }));
  }

  private journey(state: DemoState): Journey {
    const workouts = state.workouts.filter(w => dateKey(w.trainingDate) <= dateKey(today()))
      .sort((a, b) => a.trainingDate.localeCompare(b.trainingDate) || a.id - b.id);
    const days = [...new Set(workouts.map(w => dateKey(w.trainingDate)))].sort();
    let run = 0, best = 0;
    days.forEach((day, i) => { run = i && new Date(day).getTime() - new Date(days[i - 1]).getTime() <= 3 * DAY ? run + 1 : 1; best = Math.max(best, run); });
    const current = days.length && today().getTime() - new Date(days.at(-1)!).getTime() <= 3 * DAY ? run : 0;
    const records: PersonalRecord[] = [], loads = new Map<string, number>();
    for (const day of days) {
      const daily = new Map<string, number>();
      workouts.filter(w => dateKey(w.trainingDate) === day).flatMap(w => w.exercises ?? []).forEach(e =>
        daily.set(e.exerciseId, Math.max(daily.get(e.exerciseId) ?? 0, e.weightKg)));
      daily.forEach((load, exerciseId) => {
        const previous = loads.get(exerciseId);
        if (previous !== undefined && load > previous) records.push({ exerciseId,
          name: DEMO_CATALOG.find(e => e.id === exerciseId)?.name ?? exerciseId,
          weightKg: load, previousKg: previous, achievedOn: day + 'T00:00:00Z' });
        loads.set(exerciseId, Math.max(previous ?? 0, load));
      });
    }
    const measurements = state.measurements.filter(m => dateKey(m.measuredOn) <= dateKey(today()));
    const baseline = state.startingWeightKg ?? measurements[0]?.weightKg;
    const change = measurements.length && baseline != null ? round(measurements.at(-1)!.weightKg - baseline) : null;
    const progress = state.bodyGoal === 'Gain' ? Math.max(0, change ?? 0) : state.bodyGoal === 'Lose' ? Math.max(0, -(change ?? 0)) : 0;
    const distance = state.startingWeightKg != null && state.targetWeightKg != null ? Math.abs(state.targetWeightKg - state.startingWeightKg) : null;
    const goalPercent = distance ? Math.min(100, progress / distance * 100) : 0;
    const achievements: Achievement[] = [];
    const add = (id: string, name: string, description: string, icon: string, color: string, xp: number, value: number, target: number) =>
      achievements.push({ id, name, description, icon, color, xp, progress: Math.min(value, target), target, unlocked: value >= target });
    add('first-step', 'The first rep', 'Save your first completed workout.', 'dumbbell', 'violet', 100, workouts.length, 1);
    for (const [target, id, name, xp] of [[3, 'spark', 'Spark', 150], [10, 'unstoppable', 'Unstoppable', 350], [21, 'twenty-one', 'A different you', 600]] as const)
      add(id, name, `Build a ${target}-workout-day streak, recovery included.`, 'flame', 'orange', xp, best, target);
    add('new-pr', 'Raise the bar', "Beat an earlier day's added-weight best.", 'up', 'mint', 200, records.length, 1);
    add('five-prs', 'Built, not born', 'Set 5 new daily added-weight records.', 'dumbbell', 'gold', 400, records.length, 5);
    const variety = new Set(workouts.flatMap(w => w.exercises ?? []).map(e => e.exerciseId)).size;
    add('explorer', 'Move differently', 'Try 10 different exercises.', 'target', 'mint', 200, variety, 10);
    add('ten-hours', 'Time well spent', 'Log 600 minutes of training.', 'clock', 'violet', 250, sum(workouts.map(w => w.durationMinutes)), 600);
    add('fifty', 'The long game', 'Complete 50 workouts.', 'trophy', 'gold', 700, workouts.length, 50);
    if (distance == null || distance >= 2) add('body-goal', 'Your own direction', 'Move 2 kg toward your chosen direction.', 'scale', 'mint', 200, progress, 2);
    for (const target of [5, 15, 25, 75, 100, 200]) add(`sessions-${target}`, `The ${target} club`, `Complete ${target} workouts.`, 'dumbbell', 'violet', target * 5, workouts.length, target);
    for (const target of [5, 7, 14, 30]) add(`streak-${target}`, `Momentum ${target}`, `Build a ${target}-workout-day streak.`, 'flame', 'orange', target * 15, best, target);
    for (const target of [3, 10, 20]) add(`records-${target}`, `Limit breaker ${target}`, `Set ${target} daily records.`, 'up', 'gold', target * 35, records.length, target);
    for (const target of [5, 20, 35]) add(`moves-${target}`, `Movement explorer ${target}`, `Log ${target} different exercises.`, 'target', 'mint', target * 10, variety, target);
    for (const target of [50, 100, 250, 500]) add(`sets-${target}`, `Rep by rep · ${target}`, `Log ${target} working sets.`, 'dumbbell', 'violet', target, sum(workouts.flatMap(w => w.exercises ?? []).map(e => e.sets)), target);
    for (const group of ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Cardio', 'Mobility']) {
      const count = workouts.filter(w => w.exercises?.some(e => DEMO_CATALOG.find(c => c.id === e.exerciseId)?.muscleGroup === group)).length;
      add(`muscle-${group.toLowerCase()}`, `${group} specialist`, `Complete 5 sessions with ${group.toLowerCase()} movements.`, 'target', 'mint', 150, count, 5);
    }
    if (state.bodyGoal !== 'Track') {
      for (const target of [.5, 1, 3, 5]) if (distance == null || target <= distance)
        add(`body-${state.bodyGoal.toLowerCase()}-${target}`, `Your direction · ${target} kg`, `Move ${target} kg toward your goal.`, 'scale', 'mint', target * 100, progress, target);
      if (distance) for (const target of [25, 50, 75, 100])
        add(`goal-${target}`, `Your journey · ${target}%`, `Reach ${target}% of your chosen goal.`, 'target', 'mint', target * 3, goalPercent, target);
    }
    const xp = workouts.length * 40 + records.length * 50 + sum(achievements.filter(a => a.unlocked).map(a => a.xp));
    const weekStart = today().getTime() - (today().getUTCDay() + 6) % 7 * DAY;
    return { accountId: ACCOUNT, currentStreak: current, bestStreak: best, totalWorkouts: workouts.length,
      xp, level: Math.floor(xp / 500) + 1, levelXp: xp % 500, nextLevelXp: 500,
      trainedToday: days.includes(dateKey(today())), streakDeadline: current ? new Date(new Date(days.at(-1)!).getTime() + 3 * DAY).toISOString() : null,
      week: Array.from({ length: 7 }, (_, i) => { const date = new Date(weekStart + i * DAY).toISOString(); return { date, trained: days.includes(dateKey(date)) }; }),
      achievements, personalRecords: records.reverse().slice(0, 12), bodyGoal: state.bodyGoal, measurements,
      weightChangeKg: change, startingWeightKg: state.startingWeightKg, targetWeightKg: state.targetWeightKg, goalProgressPercent: goalPercent };
  }
}
