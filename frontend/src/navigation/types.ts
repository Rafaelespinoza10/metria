import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** Bottom tab sections (reference-style bar with the orange active pill). */
export type TabParamList = {
  Home: undefined;
  Nutrition: undefined;
  ScanMeal: undefined;
  Workouts: undefined;
  Insights: undefined;
};

/** Detail screens pushed above the tabs. */
export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;
  Goals: undefined;
  CreateGoal: undefined;
  Measurements: undefined;
  LogMeasurement: undefined;
  AddMeal: undefined;
  NutritionTargets: undefined;
  ReviewAnalysis: { analysisId: string; photoUri?: string };
  Activity: undefined;
  ActivityTargets: undefined;
  AddWorkout: { pickedExercise?: { name: string; muscleGroup: string } } | undefined;
  Sleep: undefined;
  LogSleep: undefined;
  SleepTarget: undefined;
  Achievements: undefined;
  Settings: undefined;
  DeleteAccount: undefined;
  ExerciseBrowser: { picker?: boolean } | undefined;
  WorkoutDetail: { id: string };
};

/** Props for tab screens: tab navigation plus the parent stack's routes. */
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<AppStackParamList>
>;
