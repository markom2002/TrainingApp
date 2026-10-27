export interface ExerciseDefinition {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  timed: boolean;
}
export interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  reps: number | null;
  durationSeconds: number | null;
  weightKg: number;
  position?: number;
}
