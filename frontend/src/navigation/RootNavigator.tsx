import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBlock } from '../components/SkeletonBlock';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { RegisterScreen } from '../features/auth/screens/RegisterScreen';
import { HomeScreen } from '../features/dashboard/screens/HomeScreen';
import { CreateGoalScreen } from '../features/goals/screens/CreateGoalScreen';
import { GoalsScreen } from '../features/goals/screens/GoalsScreen';
import { LogMeasurementScreen } from '../features/measurements/screens/LogMeasurementScreen';
import { MeasurementsScreen } from '../features/measurements/screens/MeasurementsScreen';
import { ActivityScreen } from '../features/activity/screens/ActivityScreen';
import { ActivityTargetsScreen } from '../features/activity/screens/ActivityTargetsScreen';
import { AddMealScreen } from '../features/nutrition/screens/AddMealScreen';
import { NutritionScreen } from '../features/nutrition/screens/NutritionScreen';
import { NutritionTargetsScreen } from '../features/nutrition/screens/NutritionTargetsScreen';
import { ReviewAnalysisScreen } from '../features/nutrition/screens/ReviewAnalysisScreen';
import { ScanMealScreen } from '../features/nutrition/screens/ScanMealScreen';
import { LogSleepScreen } from '../features/sleep/screens/LogSleepScreen';
import { SleepScreen } from '../features/sleep/screens/SleepScreen';
import { SleepTargetScreen } from '../features/sleep/screens/SleepTargetScreen';
import { AddWorkoutScreen } from '../features/workouts/screens/AddWorkoutScreen';
import { WorkoutsScreen } from '../features/workouts/screens/WorkoutsScreen';
import { useAuthStore } from '../store/auth';
import { theme } from '../theme';
import type { AppStackParamList, AuthStackParamList } from './types';

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: theme.colors.brand.DEFAULT,
    background: theme.colors.ink[950],
    card: theme.colors.ink[900],
    text: theme.colors.content.primary,
    border: theme.colors.ink[700],
  },
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

/** Shown while the stored session is being restored — shaped like the Home layout. */
function HydrationSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <View className="flex-1 px-5">
        <View className="mt-2">
          <SkeletonBlock className="h-4 w-24 rounded-full" />
          <SkeletonBlock className="mt-2 h-8 w-40 rounded-full" />
        </View>
        <SkeletonBlock className="mt-8 h-44 rounded-3xl" />
      </View>
    </SafeAreaView>
  );
}

export function RootNavigator() {
  const status = useAuthStore((state) => state.status);

  return (
    <NavigationContainer theme={navigationTheme}>
      {status === 'loading' ? (
        <HydrationSkeleton />
      ) : status === 'signedIn' ? (
        <AppStack.Navigator screenOptions={{ headerShown: false }}>
          <AppStack.Screen name="Home" component={HomeScreen} />
          <AppStack.Screen name="Goals" component={GoalsScreen} />
          <AppStack.Screen name="CreateGoal" component={CreateGoalScreen} />
          <AppStack.Screen name="Measurements" component={MeasurementsScreen} />
          <AppStack.Screen name="LogMeasurement" component={LogMeasurementScreen} />
          <AppStack.Screen name="Nutrition" component={NutritionScreen} />
          <AppStack.Screen name="AddMeal" component={AddMealScreen} />
          <AppStack.Screen name="NutritionTargets" component={NutritionTargetsScreen} />
          <AppStack.Screen name="ScanMeal" component={ScanMealScreen} />
          <AppStack.Screen name="ReviewAnalysis" component={ReviewAnalysisScreen} />
          <AppStack.Screen name="Activity" component={ActivityScreen} />
          <AppStack.Screen name="ActivityTargets" component={ActivityTargetsScreen} />
          <AppStack.Screen name="Workouts" component={WorkoutsScreen} />
          <AppStack.Screen name="AddWorkout" component={AddWorkoutScreen} />
          <AppStack.Screen name="Sleep" component={SleepScreen} />
          <AppStack.Screen name="LogSleep" component={LogSleepScreen} />
          <AppStack.Screen name="SleepTarget" component={SleepTargetScreen} />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
