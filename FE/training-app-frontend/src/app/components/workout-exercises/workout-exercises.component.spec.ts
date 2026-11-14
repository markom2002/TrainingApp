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
  it('shows legacy pounds approximately without rewriting the saved kilogram weight',()=>{
    localStorage.setItem('form.exerciseWeightUnits',JSON.stringify({'lat-pulldown':'lbs'}));
    const e=exercise('lbs');delete e.weightUnit;delete e.weightValue;
    expect(component().weightText(e)).toBe('≈ 30 lbs');expect(e.weightKg).toBe(13.61);
    localStorage.removeItem('form.exerciseWeightUnits');expect(component().weightText(e)).toBe('13.61 kg');
  });
});
