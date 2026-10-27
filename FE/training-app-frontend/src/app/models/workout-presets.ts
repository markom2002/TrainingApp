import { ExerciseDefinition, WorkoutExercise } from './exercise.model';

export const WORKOUT_PRESETS: Record<string, readonly string[]> = {
  Upper: [
    'bench-press',
    'seated-row',
    'shoulder-press',
    'biceps-curl',
    'triceps-pushdown',
  ],
  Lower: [
    'goblet-squat',
    'romanian-deadlift',
    'hip-thrust',
    'standing-calf-raise',
  ],
  'Full body': ['goblet-squat', 'push-up', 'dumbbell-row', 'plank'],
};
export function presetEntries(
  key: string,
  catalog: ExerciseDefinition[],
): WorkoutExercise[] {
  return (WORKOUT_PRESETS[key] ?? []).flatMap((id) => {
    const exercise = catalog.find((e) => e.id === id);
    return exercise
      ? [
          {
            exerciseId: id,
            sets: 3,
            reps: exercise.timed ? null : 10,
            durationSeconds: exercise.timed ? 30 : null,
            weightKg: 0,
          },
        ]
      : [];
  });
}
