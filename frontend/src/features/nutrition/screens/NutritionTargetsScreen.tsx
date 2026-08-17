import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { parseDecimal } from '../../goals/helpers';
import { useNutritionTargets, usePutTargets } from '../hooks';
import type { NutritionTargets } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'NutritionTargets'>;

// Mounted only once targets are loaded, so state initializes from them without effects.
function TargetsForm({ initial, onSaved }: { initial: NutritionTargets; onSaved: () => void }) {
  const { t } = useTranslation();
  const putTargetsMutation = usePutTargets();
  const [calories, setCalories] = useState(initial.calories?.toString() ?? '');
  const [protein, setProtein] = useState(initial.protein?.toString() ?? '');
  const [carbohydrates, setCarbohydrates] = useState(initial.carbohydrates?.toString() ?? '');
  const [fats, setFats] = useState(initial.fats?.toString() ?? '');

  const fields = { calories, protein, carbohydrates, fats };
  const parsed = Object.fromEntries(
    Object.entries(fields)
      .filter(([, text]) => text.trim() !== '')
      .map(([key, text]) => [key, parseDecimal(text)]),
  ) as Record<string, number | null>;
  const values = Object.values(parsed);
  const canSubmit = values.length > 0 && values.every((value) => value !== null);

  const submit = () => {
    if (!canSubmit || putTargetsMutation.isPending) return;
    putTargetsMutation.mutate(parsed as Record<string, number>, { onSuccess: onSaved });
  };

  return (
    <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-8 gap-4">
      <Text className="text-sm leading-relaxed text-content-secondary">
        {t('nutrition.targetsHint')}
      </Text>
      <AuthTextField
        label={`${t('nutrition.calories')} (kcal)`}
        placeholder="2200"
        keyboardType="number-pad"
        value={calories}
        onChangeText={setCalories}
      />
      <AuthTextField
        label={`${t('nutrition.protein')} (g)`}
        placeholder="170"
        keyboardType="number-pad"
        value={protein}
        onChangeText={setProtein}
      />
      <AuthTextField
        label={`${t('nutrition.carbohydrates')} (g)`}
        placeholder="220"
        keyboardType="number-pad"
        value={carbohydrates}
        onChangeText={setCarbohydrates}
      />
      <AuthTextField
        label={`${t('nutrition.fats')} (g)`}
        placeholder="70"
        keyboardType="number-pad"
        value={fats}
        onChangeText={setFats}
      />

      {putTargetsMutation.isError ? (
        <Text className="text-sm text-metric-heart">{t('common.error')}</Text>
      ) : null}

      <View className="mt-4">
        <AuthSubmitButton
          label={t('nutrition.saveTargets')}
          loading={putTargetsMutation.isPending}
          onPress={submit}
        />
      </View>
    </Animated.View>
  );
}

export function NutritionTargetsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const targetsQuery = useNutritionTargets();

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('nutrition.targets')} />
          {targetsQuery.isPending ? (
            <View className="mt-8 gap-4">
              <SkeletonBlock className="h-14 rounded-2xl" />
              <SkeletonBlock className="h-14 rounded-2xl" />
              <SkeletonBlock className="h-14 rounded-2xl" />
              <SkeletonBlock className="h-14 rounded-2xl" />
            </View>
          ) : (
            <TargetsForm initial={targetsQuery.data ?? {}} onSaved={() => navigation.goBack()} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
