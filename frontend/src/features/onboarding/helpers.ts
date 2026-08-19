import { parseDecimal } from '../goals/helpers';

export interface OnboardingTargetsDraft {
  calories: string;
  protein: string;
  steps: string;
  sleepHours: string;
}

export interface OnboardingGoalDraft {
  currentWeight: string;
  targetWeight: string;
}

export interface OnboardingPlan {
  nutrition: { calories?: number; protein?: number } | null;
  activity: { steps?: number } | null;
  sleepMinutes: number | null;
  goal: { startValue: number; targetValue: number } | null;
}

/** Turns the free-text drafts into the API calls to make: only filled, parseable
 *  fields produce a save; everything is optional. Pure — the screen stays thin. */
export function buildOnboardingPlan(
  targets: OnboardingTargetsDraft,
  goal: OnboardingGoalDraft,
): OnboardingPlan {
  const calories = parsePositive(targets.calories);
  const protein = parsePositive(targets.protein);
  const steps = parsePositive(targets.steps);
  const sleepHours = parsePositive(targets.sleepHours);

  const currentWeight = parsePositive(goal.currentWeight);
  const targetWeight = parsePositive(goal.targetWeight);

  return {
    nutrition:
      calories !== null || protein !== null
        ? {
            ...(calories !== null ? { calories } : {}),
            ...(protein !== null ? { protein } : {}),
          }
        : null,
    activity: steps !== null ? { steps: Math.round(steps) } : null,
    sleepMinutes:
      sleepHours !== null && sleepHours >= 1 && sleepHours <= 16
        ? Math.round(sleepHours * 60)
        : null,
    goal:
      currentWeight !== null && targetWeight !== null && currentWeight !== targetWeight
        ? { startValue: currentWeight, targetValue: targetWeight }
        : null,
  };
}

function parsePositive(text: string): number | null {
  if (text.trim() === '') return null;
  const value = parseDecimal(text);
  return value !== null && value > 0 ? value : null;
}
