export enum ExerciseType {
  Cardio = 0,
  Strength = 1,
  Flexibility = 2
}

export interface Training {
  id?: number;
  userId?: number;
  exerciseType: ExerciseType;
  durationMinutes: number;
  calories: number;
  intensity: number;
  fatigue: number;
  notes?: string;
  trainingDate: Date;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface TrainingQuery {
  page: number;
  pageSize: number;
  exerciseType?: string;
  from?: string;
  to?: string;
  sortBy: string;
  sortDirection: string;
}

export interface DashboardOverview {
  year: number;
  month: number;
  workouts: number;
  minutes: number;
  calories: number;
  averageIntensity: number;
  averageFatigue: number;
  previousWorkouts: number;
  workoutChangePercent: number | null;
  weeklyActivity: { week: number; workouts: number; minutes: number }[];
  exerciseBreakdown: { exerciseType: string; workouts: number; minutes: number }[];
}

export interface MonthlyTrainingStats {
  week: number;
  totalDuration: number;
  count: number;
  avgIntensity: number;
  avgFatigue: number;
}
