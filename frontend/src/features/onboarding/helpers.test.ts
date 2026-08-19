import { buildOnboardingPlan } from './helpers';

const emptyTargets = { calories: '', protein: '', steps: '', sleepHours: '' };
const emptyGoal = { currentWeight: '', targetWeight: '' };

describe('buildOnboardingPlan', () => {
  it('returns an all-null plan when everything is blank', () => {
    expect(buildOnboardingPlan(emptyTargets, emptyGoal)).toEqual({
      nutrition: null,
      activity: null,
      sleepMinutes: null,
      goal: null,
    });
  });

  it('saves only the filled targets, converting sleep hours to minutes', () => {
    const plan = buildOnboardingPlan(
      { calories: '2200', protein: '', steps: '8000', sleepHours: '7,5' },
      emptyGoal,
    );
    expect(plan.nutrition).toEqual({ calories: 2200 });
    expect(plan.activity).toEqual({ steps: 8000 });
    expect(plan.sleepMinutes).toBe(450);
    expect(plan.goal).toBeNull();
  });

  it('builds the weight goal only with two distinct parseable values', () => {
    expect(
      buildOnboardingPlan(emptyTargets, { currentWeight: '90', targetWeight: '80' }).goal,
    ).toEqual({ startValue: 90, targetValue: 80 });
    expect(
      buildOnboardingPlan(emptyTargets, { currentWeight: '80', targetWeight: '80' }).goal,
    ).toBeNull();
    expect(
      buildOnboardingPlan(emptyTargets, { currentWeight: 'abc', targetWeight: '80' }).goal,
    ).toBeNull();
  });

  it('ignores zero, negative, and out-of-range values', () => {
    const plan = buildOnboardingPlan(
      { calories: '0', protein: '-5', steps: '', sleepHours: '20' },
      emptyGoal,
    );
    expect(plan).toEqual({ nutrition: null, activity: null, sleepMinutes: null, goal: null });
  });
});
