import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { MealItemsEditor } from '../components/MealItemsEditor';
import { useCreateMeal } from '../hooks';
import type { MealCategory, MealItemInput } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'AddMeal'>;

const CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function AddMealScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const createMealMutation = useCreateMeal();
  const [category, setCategory] = useState<MealCategory>('breakfast');
  const [name, setName] = useState('');
  const [items, setItems] = useState<MealItemInput[]>([]);

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

            <MealItemsEditor items={items} onChange={setItems} />

            {createMealMutation.isError ? (
              <Text className="mt-4 text-sm text-metric-heart">{t('common.error')}</Text>
            ) : null}

            <View className="mt-8">
              <AuthSubmitButton
                label={t('nutrition.saveMeal')}
                loading={createMealMutation.isPending}
                disabled={!canSubmit}
                onPress={submit}
              />
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
