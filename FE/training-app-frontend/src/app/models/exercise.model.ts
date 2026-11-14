export interface ExerciseDefinition {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  timed: boolean;
}
export interface WorkoutExercise {
  weightUnit?: 'kg' | 'lbs' | null;
  weightValue?: number | null;
  setEntries?: WorkoutSet[];
  exerciseId: string;
  sets: number;
  reps: number | null;
  durationSeconds: number | null;
  weightKg: number;
  position?: number;
}
export interface WorkoutSet {
  weightValue?: number | null;
  reps: number | null;
  durationSeconds: number | null;
  weightKg: number;
  position?: number;
}
