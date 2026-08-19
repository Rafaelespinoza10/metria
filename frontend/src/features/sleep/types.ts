export interface SleepEntry {
  id: string;
  bedtime: string;
  wakeTime: string;
  durationMinutes: number;
  localDate: string;
  quality: number | null;
  notes: string | null;
}

export interface SleepTargets {
  sleep_minutes?: number;
}

export interface CreateSleepInput {
  bedtime: string;
  wakeTime: string;
  quality?: number;
  notes?: string;
}

export interface UpdateSleepInput {
  bedtime?: string;
  wakeTime?: string;
  quality?: number | null;
  notes?: string | null;
}
