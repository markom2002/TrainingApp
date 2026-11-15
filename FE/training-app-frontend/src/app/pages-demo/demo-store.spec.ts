import { HttpRequest } from '@angular/common/http';
import { DemoStore, DEMO_STORAGE_KEY } from './demo-store';

describe('Browser-only portfolio demo', () => {
  let store: DemoStore;
  const request = (method: string, path: string, body?: unknown) =>
    store.handle(new HttpRequest(method, '/api' + path, body ?? null)) as any;
  beforeEach(() => { localStorage.removeItem(DEMO_STORAGE_KEY); store = new DemoStore(); });
  afterEach(() => localStorage.removeItem(DEMO_STORAGE_KEY));

  it('requires demo entry and restores a local session without credentials', () => {
    expect(() => request('POST', '/auth/refresh')).toThrow();
    expect(request('POST', '/auth/demo').token).toBeTruthy();
    store = new DemoStore();
    expect(request('POST', '/auth/refresh').token).toBeTruthy();
    expect(request('GET', '/trainings').totalCount).toBe(12);
    request('POST', '/auth/logout');
    expect(() => request('GET', '/trainings')).toThrow();
  });

  it('preserves original set units through save, edit, reload and delete', () => {
    request('POST', '/auth/demo');
    const payload = { clientId: 'stable-retry', trainingDate: new Date().toISOString(), exerciseType: 'Strength',
      durationMinutes: 35, intensity: 7, fatigue: 5, calories: 0, notes: 'Browser demo test', exercises: [
        { exerciseId: 'lat-pulldown', sets: 1, reps: 8, weightUnit: 'lbs', weightValue: 30, weightKg: 13.61,
          setEntries: [{ reps: 8, weightValue: 30, weightKg: 13.61 }] },
        { exerciseId: 'seated-cable-row', sets: 1, reps: 10, weightUnit: 'kg', weightValue: 20, weightKg: 20 }
      ] };
    const saved = request('POST', '/trainings', payload);
    expect(request('POST', '/trainings', payload).id).toBe(saved.id);
    store = new DemoStore();
    expect(request('GET', `/trainings/${saved.id}`).exercises[0].setEntries[0].weightValue).toBe(30);
    request('PUT', `/trainings/${saved.id}`, { ...saved, durationMinutes: 50 });
    expect(request('GET', `/trainings/${saved.id}`).exercises[1].weightUnit).toBe('kg');
    expect(request('GET', '/trainings').totalCount).toBe(13);
    request('DELETE', `/trainings/${saved.id}`);
    expect(request('GET', '/trainings').totalCount).toBe(12);
  });

  it('recomputes summary and achievements from changes instead of fixed snapshots', () => {
    request('POST', '/auth/demo');
    const before = request('GET', '/journey');
    const saved = request('POST', '/trainings', { trainingDate: new Date().toISOString(), durationMinutes: 30,
      exerciseType: 'Strength', intensity: 7, fatigue: 5, calories: 0, exercises: [] });
    const after = request('GET', '/journey');
    expect(after.totalWorkouts).toBe(before.totalWorkouts + 1);
    expect(after.xp).toBeGreaterThan(before.xp);
    request('DELETE', `/trainings/${saved.id}`);
    expect(request('GET', '/journey').totalWorkouts).toBe(before.totalWorkouts);
  });

  it('resets only the demo dataset and rejects unsupported API actions', () => {
    localStorage.setItem('unrelated-app-data', 'keep');
    request('POST', '/auth/demo');
    expect(() => request('GET', '/admin/summary')).toThrow();
    expect(() => request('POST', '/auth/login', { email: 'x', password: 'x' })).toThrow();
    store.reset();
    expect(localStorage.getItem('unrelated-app-data')).toBe('keep');
    expect(() => request('POST', '/auth/refresh')).toThrow();
    localStorage.removeItem('unrelated-app-data');
  });

  it('does not report success when browser storage cannot persist a write', () => {
    spyOn(localStorage, 'setItem').and.throwError('Quota exceeded');
    expect(() => request('POST', '/auth/demo')).toThrow();
  });
});
