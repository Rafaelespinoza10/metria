import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '../../../components/Button';
import { theme } from '../../../theme';
import { sectionImages } from '../../../theme/images';
import { useAuthStore } from '../../../store/auth';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { usePutActivityTargets } from '../../activity/hooks';
import { useCreateGoal } from '../../goals/hooks';
import { usePutTargets } from '../../nutrition/hooks';
import { usePutSleepTarget } from '../../sleep/hooks';
import { buildOnboardingPlan } from '../helpers';

type Step = 'welcome' | 'targets' | 'goal';

export function OnboardingScreen() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const nutritionMutation = usePutTargets();
  const activityMutation = usePutActivityTargets();
  const sleepMutation = usePutSleepTarget();
  const goalMutation = useCreateGoal();

  const [step, setStep] = useState<Step>('welcome');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [steps, setSteps] = useState('');
  const [sleepHours, setSleepHours] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const finish = async () => {
    if (saving) return;
    const plan = buildOnboardingPlan(
      { calories, protein, steps, sleepHours },
      { currentWeight, targetWeight },
    );
    setSaving(true);
    setFailed(false);
    try {
      if (plan.nutrition) await nutritionMutation.mutateAsync(plan.nutrition);
      if (plan.activity) await activityMutation.mutateAsync(plan.activity);
      if (plan.sleepMinutes !== null) await sleepMutation.mutateAsync(plan.sleepMinutes);
      if (plan.goal) {
        await goalMutation.mutateAsync({
          category: plan.goal.targetValue < plan.goal.startValue ? 'lose_fat' : 'gain_muscle',
          metric: 'weight',
          startValue: plan.goal.startValue,
          targetValue: plan.goal.targetValue,
        });
      }
      completeOnboarding();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <View className="mt-4 flex-row gap-1.5">
            {(['welcome', 'targets', 'goal'] as Step[]).map((item) => (
              <View
                key={item}
                className={`h-1.5 flex-1 rounded-full ${item === step ? 'bg-brand' : 'bg-black/10'}`}
              />
            ))}
          </View>

          {step === 'welcome' ? (
            <Animated.View entering={FadeInDown.springify()} className="mt-6">
              <Image
                source={sectionImages.authHero}
                className="h-52 w-full rounded-3xl bg-ink-800"
                accessibilityIgnoresInvertColors
              />
              <Text className="mt-6 text-xs font-semibold uppercase tracking-widest text-brand">
                {t('common.appName')}
              </Text>
              <Text className="mt-3 text-3xl font-bold text-content-primary">
                {t('onboarding.welcomeTitle', { name: user?.name ?? '' })}
              </Text>
              <Text className="mt-3 text-sm leading-relaxed text-content-secondary">
                {t('onboarding.welcomeBody')}
              </Text>
              <View className="mt-8">
                <Button label={t('onboarding.start')} onPress={() => setStep('targets')} />
              </View>
            </Animated.View>
          ) : null}

          {step === 'targets' ? (
            <Animated.View entering={FadeInDown.springify()} className="mt-6">
              <Text className="text-3xl font-bold text-content-primary">
                {t('onboarding.targetsTitle')}
              </Text>
              <Text className="mt-2 text-sm leading-relaxed text-content-secondary">
                {t('onboarding.targetsBody')}
              </Text>
              <View className="mt-6 gap-4">
                <AuthTextField
                  label={t('nutrition.calories')}
                  placeholder="2200"
                  keyboardType="number-pad"
                  value={calories}
                  onChangeText={setCalories}
                />
                <AuthTextField
                  label={t('nutrition.protein')}
                  placeholder="140"
                  keyboardType="number-pad"
                  value={protein}
                  onChangeText={setProtein}
                />
                <AuthTextField
                  label={t('activity.steps')}
                  placeholder="8000"
                  keyboardType="number-pad"
                  value={steps}
                  onChangeText={setSteps}
                />
                <AuthTextField
                  label={t('onboarding.sleepHours')}
                  placeholder="8"
                  keyboardType="decimal-pad"
                  value={sleepHours}
                  onChangeText={setSleepHours}
                />
              </View>
              <View className="mt-8">
                <Button label={t('common.continue')} onPress={() => setStep('goal')} />
              </View>
            </Animated.View>
          ) : null}

          {step === 'goal' ? (
            <Animated.View entering={FadeInDown.springify()} className="mt-6">
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
                <Ionicons name="flag-outline" size={26} color={theme.colors.brand.DEFAULT} />
              </View>
              <Text className="mt-4 text-3xl font-bold text-content-primary">
                {t('onboarding.goalTitle')}
              </Text>
              <Text className="mt-2 text-sm leading-relaxed text-content-secondary">
                {t('onboarding.goalBody')}
              </Text>
              <View className="mt-6 flex-row gap-3">
                <View className="flex-1">
                  <AuthTextField
                    label={t('onboarding.currentWeight')}
                    placeholder="82"
                    keyboardType="decimal-pad"
                    value={currentWeight}
                    onChangeText={setCurrentWeight}
                  />
                </View>
                <View className="flex-1">
                  <AuthTextField
                    label={t('onboarding.targetWeight')}
                    placeholder="76"
                    keyboardType="decimal-pad"
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                  />
                </View>
              </View>
              {failed ? (
                <Text className="mt-4 text-sm text-metric-heart">{t('common.error')}</Text>
              ) : null}
              <View className="mt-8">
                <Button
                  label={t('onboarding.finish')}
                  loading={saving}
                  onPress={() => void finish()}
                />
              </View>
            </Animated.View>
          ) : null}

          {step !== 'welcome' ? (
            <Pressable
              onPress={completeOnboarding}
              hitSlop={8}
              className="mt-6 self-center"
              accessibilityRole="button"
            >
              <Text className="text-sm font-semibold text-content-tertiary">
                {t('onboarding.skip')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
