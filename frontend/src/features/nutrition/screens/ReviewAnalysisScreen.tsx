import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { aiFoodsToItems, foodConfidences } from '../ai-helpers';
import { MealItemsEditor } from '../components/MealItemsEditor';
import { useAnalysis, useConfirmAnalysis } from '../hooks';
import type { MealCategory, MealEstimation, MealItemInput } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'ReviewAnalysis'>;

const CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// Mounted once the draft is loaded, so state seeds from the AI estimation without effects.
function ReviewForm({
  analysisId,
  estimation,
  onConfirmed,
}: {
  analysisId: string;
  estimation: MealEstimation;
  onConfirmed: () => void;
}) {
  const { t } = useTranslation();
  const confirmMutation = useConfirmAnalysis(analysisId);
  const [category, setCategory] = useState<MealCategory>('lunch');
  const [name, setName] = useState(estimation.foods[0]?.name ?? '');
  const [items, setItems] = useState<MealItemInput[]>(aiFoodsToItems(estimation.foods));

  // Confidence badges only make sense while the AI-seeded rows are untouched.
  const initialCount = estimation.foods.length;
  const confidences = items.length === initialCount ? foodConfidences(estimation.foods) : undefined;

  const canSubmit = name.trim().length > 0 && items.length > 0;

  const submit = () => {
    if (!canSubmit || confirmMutation.isPending) return;
    confirmMutation.mutate(
      {
        category,
        name: name.trim(),
        eatenAt: new Date().toISOString(),
        items,
      },
      { onSuccess: onConfirmed },
    );
  };

  return (
    <Animated.View entering={FadeInDown.delay(60).springify()}>
      <View className="mt-6 rounded-2xl border border-brand/30 bg-brand-soft p-4">
        <Text className="text-sm leading-relaxed text-content-primary">
          {t('nutrition.estimateDisclaimer')}
        </Text>
        {estimation.overallConfidence !== undefined ? (
          <Text className="mt-1 text-xs text-content-secondary">
            {t('nutrition.confidence', {
              percent: Math.round(estimation.overallConfidence * 100),
            })}
          </Text>
        ) : null}
      </View>

      <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
        {t('nutrition.selectCategory')}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <Chip
            key={item}
            label={t(`nutrition.category.${item}`)}
            selected={category === item}
            onPress={() => setCategory(item)}
          />
        ))}
      </View>

      <View className="mt-6">
        <AuthTextField
          label={t('nutrition.mealName')}
          placeholder={t('nutrition.mealNamePlaceholder')}
          value={name}
          onChangeText={setName}
        />
      </View>

      <MealItemsEditor
        items={items}
        onChange={setItems}
        {...(confidences ? { confidences } : {})}
      />

      {confirmMutation.isError ? (
        <Text className="mt-4 text-sm text-metric-heart">{t('common.error')}</Text>
      ) : null}

      <View className="mt-8">
        <AuthSubmitButton
          label={t('nutrition.confirmMeal')}
          loading={confirmMutation.isPending}
          disabled={!canSubmit}
          onPress={submit}
        />
      </View>
    </Animated.View>
  );
}

export function ReviewAnalysisScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const analysisQuery = useAnalysis(route.params.analysisId);
  const analysis = analysisQuery.data;

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('nutrition.reviewTitle')} />
          {route.params.photoUri ? (
            <Animated.View entering={FadeInDown.delay(30).springify()}>
              <Image
                source={{ uri: route.params.photoUri }}
                className="mt-6 h-48 w-full rounded-3xl bg-ink-800"
                accessibilityIgnoresInvertColors
              />
            </Animated.View>
          ) : null}
          {analysisQuery.isPending ? (
            <View className="mt-8 gap-4">
              <SkeletonBlock className="h-20 rounded-2xl" />
              <SkeletonBlock className="h-48 rounded-3xl" />
            </View>
          ) : analysis?.status === 'completed' && analysis.result ? (
            <ReviewForm
              analysisId={analysis.id}
              estimation={analysis.result}
              onConfirmed={() => navigation.navigate('Tabs', { screen: 'Nutrition' })}
            />
          ) : (
            <Animated.View
              entering={FadeInDown.delay(60).springify()}
              className="mt-8 items-start rounded-3xl border border-black/5 bg-ink-900 p-5"
            >
              <Text className="text-6xl font-extrabold tracking-tighter text-content-tertiary">
                —
              </Text>
              <Text className="mt-3 text-sm leading-relaxed text-content-secondary">
                {t('nutrition.analysisFailed')}
              </Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
