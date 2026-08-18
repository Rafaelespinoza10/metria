import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MacroBar } from '../../../components/MacroBar';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { TabScreenProps } from '../../../navigation/types';
import { API_URL } from '../../../services/api';
import { useAuthStore } from '../../../store/auth';
import { mealCategoryImages } from '../../../theme/images';
import { theme } from '../../../theme';
import { addDays, todayISO } from '../helpers';
import { useAlternatives, useDaySummary, useMeals } from '../hooks';
import type { Meal, MealCategory } from '../types';

type Props = TabScreenProps<'Nutrition'>;

const CATEGORY_ORDER: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function MealRow({ meal, onSuggest }: { meal: Meal; onSuggest: (meal: Meal) => void }) {
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.token);
  return (
    <View className="border-t border-black/5 py-3">
      <View className="flex-row items-center justify-between">
        {meal.imageUrl ? (
          <Image
            source={{
              uri: `${API_URL}${meal.imageUrl}`,
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }}
            className="mr-3 h-14 w-14 rounded-2xl bg-ink-800"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Image
            source={mealCategoryImages[meal.category]}
            className="mr-3 h-14 w-14 rounded-2xl bg-ink-800"
            accessibilityIgnoresInvertColors
          />
        )}
        <View className="flex-1 pr-3">
          <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
            {t(`nutrition.category.${meal.category}`)}
          </Text>
          <Text className="mt-0.5 text-base font-semibold text-content-primary">{meal.name}</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <PressableScale
            onPress={() => onSuggest(meal)}
            accessibilityRole="button"
            accessibilityLabel={t('nutrition.suggestAlternatives')}
            className="h-9 w-9 items-center justify-center rounded-full bg-ink-800"
          >
            <Ionicons name="sparkles-outline" size={16} color={theme.colors.brand.DEFAULT} />
          </PressableScale>
          <View className="items-end">
            <Text className="text-lg font-bold text-content-primary">{meal.totals.calories}</Text>
            <Text className="text-xs text-content-secondary">kcal</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function NutritionScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayISO());
  const summaryQuery = useDaySummary(date);
  const mealsQuery = useMeals(date);
  const alternativesMutation = useAlternatives();
  const [suggestionsFor, setSuggestionsFor] = useState<string | null>(null);

  const requestAlternatives = (meal: Meal) => {
    setSuggestionsFor(meal.name);
    alternativesMutation.mutate(meal.id);
  };

  const isToday = date === todayISO();
  const summary = summaryQuery.data;
  const meals = mealsQuery.data ?? [];
  const orderedMeals = CATEGORY_ORDER.flatMap((category) =>
    meals.filter((meal) => meal.category === category),
  );

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <View className="flex-1 px-5">
        <ScreenHeader
          title={t('nutrition.title')}
          right={
            <PressableScale
              onPress={() => navigation.navigate('NutritionTargets')}
              accessibilityRole="button"
              accessibilityLabel={t('nutrition.targets')}
              className="h-11 w-11 items-center justify-center rounded-full bg-ink-800"
            >
              <Ionicons name="options-outline" size={20} color={theme.colors.content.secondary} />
            </PressableScale>
          }
        />

        <Animated.View
          entering={FadeInDown.delay(40).springify()}
          className="mt-6 flex-row items-center justify-between"
        >
          <PressableScale
            onPress={() => setDate(addDays(date, -1))}
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full bg-ink-900"
          >
            <Ionicons name="chevron-back" size={18} color={theme.colors.content.secondary} />
          </PressableScale>
          <Text className="text-sm font-semibold text-content-primary">
            {isToday ? t('nutrition.today') : date}
          </Text>
          <PressableScale
            onPress={() => setDate(addDays(date, 1))}
            disabled={isToday}
            accessibilityRole="button"
            className={`h-10 w-10 items-center justify-center rounded-full bg-ink-900 ${
              isToday ? 'opacity-40' : ''
            }`}
          >
            <Ionicons name="chevron-forward" size={18} color={theme.colors.content.secondary} />
          </PressableScale>
        </Animated.View>

        <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false}>
          {summaryQuery.isPending || !summary ? (
            <SkeletonBlock className="h-56 rounded-3xl" />
          ) : (
            <Animated.View
              entering={FadeInDown.delay(80).springify()}
              className="rounded-3xl border border-black/5 bg-ink-900 p-5"
            >
              <Text className="text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                {t('nutrition.calories')}
              </Text>
              <View className="mt-1 flex-row items-baseline gap-2">
                <Text className="text-6xl font-extrabold tracking-tighter text-content-primary">
                  {Math.round(summary.totals.calories)}
                </Text>
                <Text className="text-base font-medium text-content-secondary">
                  {summary.targets.calories !== undefined
                    ? `/ ${summary.targets.calories} kcal`
                    : 'kcal'}
                </Text>
              </View>
              <View className="mt-5 gap-4">
                <MacroBar
                  label={t('nutrition.protein')}
                  value={summary.totals.protein}
                  target={summary.targets.protein}
                  unit="g"
                  color={theme.colors.metric.protein}
                />
                <MacroBar
                  label={t('nutrition.carbohydrates')}
                  value={summary.totals.carbohydrates}
                  target={summary.targets.carbohydrates}
                  unit="g"
                  color={theme.colors.metric.hydro}
                />
                <MacroBar
                  label={t('nutrition.fats')}
                  value={summary.totals.fats}
                  target={summary.targets.fats}
                  unit="g"
                  color={theme.colors.metric.heart}
                />
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.delay(140).springify()} className="mt-8">
            <Text className="text-lg font-semibold text-content-primary">
              {t('nutrition.meals')}
            </Text>
            {mealsQuery.isPending ? (
              <SkeletonBlock className="mt-3 h-32 rounded-3xl" />
            ) : orderedMeals.length > 0 ? (
              <View className="mt-3 rounded-3xl border border-black/5 bg-ink-900 px-5 pb-1 pt-2">
                {orderedMeals.map((meal) => (
                  <MealRow key={meal.id} meal={meal} onSuggest={requestAlternatives} />
                ))}
              </View>
            ) : (
              <View className="mt-3 items-start overflow-hidden rounded-3xl border border-black/5 bg-ink-900">
                <Image
                  source={mealCategoryImages.breakfast}
                  className="h-36 w-full bg-ink-800"
                  accessibilityIgnoresInvertColors
                />
                <Text className="p-5 text-sm leading-relaxed text-content-secondary">
                  {t('nutrition.empty')}
                </Text>
              </View>
            )}
          </Animated.View>

          {suggestionsFor !== null ? (
            <Animated.View entering={FadeInDown.springify()} className="mt-8">
              <Text className="text-lg font-semibold text-content-primary">
                {t('nutrition.alternativesFor', { meal: suggestionsFor })}
              </Text>
              {alternativesMutation.isPending ? (
                <SkeletonBlock className="mt-3 h-24 rounded-3xl" />
              ) : alternativesMutation.isError ? (
                <Text className="mt-3 text-sm text-metric-heart">
                  {t('nutrition.alternativesUnavailable')}
                </Text>
              ) : (
                <View className="mt-3 rounded-3xl border border-black/5 bg-ink-900 px-5">
                  {(alternativesMutation.data?.suggestions ?? []).map((suggestion, index) => (
                    <View
                      key={suggestion.title}
                      className={`py-4 ${index > 0 ? 'border-t border-black/5' : ''}`}
                    >
                      <Text className="text-base font-semibold text-content-primary">
                        {suggestion.title}
                      </Text>
                      <Text className="mt-1 text-sm leading-relaxed text-content-secondary">
                        {suggestion.description}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          ) : null}
          <View className="h-28" />
        </ScrollView>

        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          className="absolute inset-x-5 bottom-6 flex-row gap-3"
        >
          <View className="flex-1">
            <PressableScale
              onPress={() => navigation.navigate('AddMeal')}
              accessibilityRole="button"
              className="rounded-2xl bg-charcoal py-4"
            >
              <Text className="text-center text-base font-semibold text-white">
                {t('nutrition.addMeal')}
              </Text>
            </PressableScale>
          </View>
          <PressableScale
            onPress={() => navigation.navigate('ScanMeal')}
            accessibilityRole="button"
            accessibilityLabel={t('nutrition.scanTitle')}
            className="h-[52px] w-[52px] items-center justify-center rounded-2xl border border-brand/40 bg-ink-900"
          >
            <Ionicons name="camera-outline" size={22} color={theme.colors.brand.DEFAULT} />
          </PressableScale>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
