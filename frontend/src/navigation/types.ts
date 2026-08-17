export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Home: undefined;
  Goals: undefined;
  CreateGoal: undefined;
  Measurements: undefined;
  LogMeasurement: undefined;
  Nutrition: undefined;
  AddMeal: undefined;
  ScanMeal: undefined;
  ReviewAnalysis: { analysisId: string };
  NutritionTargets: undefined;
  Activity: undefined;
  ActivityTargets: undefined;
  Workouts: undefined;
  AddWorkout: undefined;
  Sleep: undefined;
  LogSleep: undefined;
  SleepTarget: undefined;
};
