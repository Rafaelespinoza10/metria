import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { parseDecimal } from '../../goals/helpers';
import { theme } from '../../../theme';
import { sumMealItems } from '../helpers';
import { useCreateMeal } from '../hooks';
import type { MealCategory, MealItemInput } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'AddMeal'>;

const CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const EMPTY_DRAFT = { name: '', grams: '', calories: '', protein: '', carbohydrates: '', fat: '' };

export function AddMealScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const createMealMutation = useCreateMeal();
  const [category, setCategory] = useState<MealCategory>('breakfast');
  const [name, setName] = useState('');
  const [items, setItems] = useState<MealItemInput[]>([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const parseMacro = (text: string): number | null => (text.trim() === '' ? 0 : parseDecimal(text));

  const draftCalories = parseMacro(draft.calories);
  const draftProtein = parseMacro(draft.protein);
  const draftCarbs = parseMacro(draft.carbohydrates);
  const draftFat = parseMacro(draft.fat);
  const draftGrams = draft.grams.trim() === '' ? undefined : parseDecimal(draft.grams);
  const draftValid =
    draft.name.trim().length > 0 &&
    draftCalories !== null &&
    draftProtein !== null &&
    draftCarbs !== null &&
    draftFat !== null &&
    draftGrams !== null;

  const addItem = () => {
    if (!draftValid) return;
    setItems((current) => [
      ...current,
      {
        name: draft.name.trim(),
        ...(draftGrams !== undefined && draftGrams !== null ? { grams: draftGrams } : {}),
        calories: draftCalories ?? 0,
        protein: draftProtein ?? 0,
        carbohydrates: draftCarbs ?? 0,
        fat: draftFat ?? 0,
      },
    ]);
    setDraft(EMPTY_DRAFT);
  };

  const removeItem = (index: number) => {
    setItems((current) => current.filter((_, i) => i !== index));
  };

  const totals = sumMealItems(items);
  const canSubmit = name.trim().length > 0 && items.length > 0;

  const submit = () => {
    if (!canSubmit || createMealMutation.isPending) return;
    createMealMutation.mutate(
      {
        category,
        name: name.trim(),
        eatenAt: new Date().toISOString(),
        items,
      },
      { onSuccess: () => navigation.goBack() },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('nutrition.addMeal')} />

          <Animated.View entering={FadeInDown.delay(60).springify()}>
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

            {items.length > 0 ? (
              <View className="mt-6 rounded-3xl border border-white/5 bg-ink-900 px-5">
                {items.map((item, index) => (
                  <View
                    key={`${item.name}-${index}`}
                    className={`flex-row items-center justify-between py-3 ${
                      index > 0 ? 'border-t border-white/5' : ''
                    }`}
                  >
                    <View className="flex-1 pr-3">
                      <Text className="text-base font-semibold text-content-primary">
                        {item.name}
                      </Text>
                      <Text className="mt-0.5 text-xs text-content-secondary">
                        {item.calories} kcal · P {item.protein} · C {item.carbohydrates} · G{' '}
                        {item.fat}
                      </Text>
                    </View>
                    <PressableScale
                      onPress={() => removeItem(index)}
                      accessibilityRole="button"
                      accessibilityLabel={t('nutrition.removeItem')}
                      className="h-9 w-9 items-center justify-center rounded-full bg-ink-800"
                    >
                      <Ionicons name="close" size={16} color={theme.colors.content.secondary} />
                    </PressableScale>
                  </View>
                ))}
                <View className="border-t border-white/5 py-3">
                  <Text className="text-sm text-content-secondary">
                    {t('nutrition.totalLabel')}{' '}
                    <Text className="font-bold text-content-primary">{totals.calories} kcal</Text>
                    {'  ·  P '}
                    {totals.protein}
                    {'  C '}
                    {totals.carbohydrates}
                    {'  G '}
                    {totals.fats}
                  </Text>
                </View>
              </View>
            ) : null}

            <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
              {t('nutrition.addItem')}
            </Text>
            <View className="gap-4 rounded-3xl border border-white/5 bg-ink-900 p-5">
              <AuthTextField
                label={t('nutrition.itemName')}
                placeholder={t('nutrition.itemNamePlaceholder')}
                value={draft.name}
                onChangeText={(text) => setDraft({ ...draft, name: text })}
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AuthTextField
                    label={t('nutrition.grams')}
                    placeholder="180"
                    keyboardType="decimal-pad"
                    value={draft.grams}
                    onChangeText={(text) => setDraft({ ...draft, grams: text })}
                  />
                </View>
                <View className="flex-1">
                  <AuthTextField
                    label={t('nutrition.calories')}
                    placeholder="297"
                    keyboardType="decimal-pad"
                    value={draft.calories}
                    onChangeText={(text) => setDraft({ ...draft, calories: text })}
                  />
                </View>
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <AuthTextField
                    label={t('nutrition.protein')}
                    placeholder="55"
                    keyboardType="decimal-pad"
                    value={draft.protein}
                    onChangeText={(text) => setDraft({ ...draft, protein: text })}
                  />
                </View>
                <View className="flex-1">
                  <AuthTextField
                    label={t('nutrition.carbohydrates')}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    value={draft.carbohydrates}
                    onChangeText={(text) => setDraft({ ...draft, carbohydrates: text })}
                  />
                </View>
                <View className="flex-1">
                  <AuthTextField
                    label={t('nutrition.fats')}
                    placeholder="6"
                    keyboardType="decimal-pad"
                    value={draft.fat}
                    onChangeText={(text) => setDraft({ ...draft, fat: text })}
                  />
                </View>
              </View>
              <PressableScale
                onPress={addItem}
                disabled={!draftValid}
                accessibilityRole="button"
                className={`rounded-2xl border border-brand/40 py-3 ${
                  draftValid ? '' : 'opacity-40'
                }`}
              >
                <Text className="text-center text-sm font-semibold text-brand">
                  {t('nutrition.addItemAction')}
                </Text>
              </PressableScale>
            </View>

            {createMealMutation.isError ? (
              <Text className="mt-4 text-sm text-metric-heart">{t('common.error')}</Text>
            ) : null}

            <View className="mt-8">
              <AuthSubmitButton
                label={t('nutrition.saveMeal')}
                loading={createMealMutation.isPending}
                onPress={submit}
              />
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
