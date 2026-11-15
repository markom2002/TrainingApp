import { of } from 'rxjs';
import { WorkoutExercisesComponent } from './workout-exercises.component';
import { ExerciseService } from '../../services/exercise.service';
import { WorkoutExercise } from '../../models/exercise.model';
describe('Recorded workout weight units', () => {
  const exercise = (unit: 'kg' | 'lbs'): WorkoutExercise => ({exerciseId:'lat-pulldown',sets:1,reps:8,durationSeconds:null,weightKg:13.61,weightUnit:unit,weightValue:unit==='lbs'?30:13.61});
  let original: string | null;
  beforeEach(()=>{original=localStorage.getItem('form.exerciseWeightUnits');});
  afterEach(()=>{if(original===null)localStorage.removeItem('form.exerciseWeightUnits');else localStorage.setItem('form.exerciseWeightUnits',original);});
  const component = () => new WorkoutExercisesComponent({getCatalog:()=>of([])} as unknown as ExerciseService);
  it('shows the exact entered pounds for summary and individual sets',()=>{
    const c=component(), e=exercise('lbs');
    expect(c.weightText(e)).toBe('30 lbs');
    expect(c.weightText(e,{weightKg:61.46,weightValue:135.5})).toBe('135.5 lbs');
  });
  it('uses the saved unit even when the current preference has changed',()=>{
    localStorage.setItem('form.exerciseWeightUnits',JSON.stringify({'lat-pulldown':'kg'}));
    expect(component().weightText(exercise('lbs'))).toBe('30 lbs');
    expect(component().weightText(exercise('kg'))).toBe('13.61 kg');
  });
  it('recovers the screenshot series as approximate whole pounds on every device',()=>{
    const e=exercise('lbs');delete e.weightUnit;delete e.weightValue;
    e.setEntries=[13.61,18.14,22.68,29.48,27.22].map(weightKg=>({weightKg,reps:8,durationSeconds:null}));
    for(const preference of ['kg','lbs']) {
      localStorage.setItem('form.exerciseWeightUnits',JSON.stringify({'lat-pulldown':preference}));
      expect(e.setEntries.map(set=>component().weightText(e,set))).toEqual(['\u2248 30 lbs','\u2248 40 lbs','\u2248 50 lbs','\u2248 65 lbs','\u2248 60 lbs']);
    }
    expect(e.setEntries[0].weightKg).toBe(13.61);
  });
  it('keeps explicit kilograms and fractional entered pounds exactly as recorded',()=>{
    const e=exercise('kg');
    e.setEntries=[13.61,18.14].map(weightKg=>({weightKg,weightValue:weightKg,reps:8,durationSeconds:null}));
    expect(component().weightText(e,e.setEntries[0])).toBe('13.61 kg');
    expect(component().weightText(exercise('lbs'),{weightKg:13.72,weightValue:30.25})).toBe('30.25 lbs');
    expect(component().weightText(exercise('kg'),{weightKg:40,weightValue:40})).toBe('40 kg');
  });
  it('does not use device preferences to convert unmarked kilograms',()=>{
    localStorage.setItem('form.exerciseWeightUnits',JSON.stringify({'lat-pulldown':'lbs'}));
    const e=exercise('kg');delete e.weightUnit;delete e.weightValue;
    expect(component().weightText(e)).toBe('13.61 kg');
    e.setEntries=[20,22.5,25].map(weightKg=>({weightKg,reps:8,durationSeconds:null}));
    expect(component().weightText(e,e.setEntries[1])).toBe('22.5 kg');
  });
});
