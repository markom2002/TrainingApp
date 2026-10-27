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
