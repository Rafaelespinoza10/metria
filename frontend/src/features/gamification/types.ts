export interface StreakState {
  current: number;
  longest: number;
}

export interface BadgeState {
  key: string;
  awardedAt: string | null;
}

export interface GamificationState {
  streaks: { tracking: StreakState; sleepGoal: StreakState };
  badges: BadgeState[];
}
