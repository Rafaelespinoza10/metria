export interface ActivityEntry {
  localDate: string;
  steps: number;
  activeMinutes: number;
  notes: string | null;
}

export interface ActivityTargets {
  steps?: number;
  active_minutes?: number;
}

export interface PutActivityInput {
  steps?: number;
  activeMinutes?: number;
  notes?: string | null;
}
