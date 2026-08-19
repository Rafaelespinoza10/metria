import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '../../../components/Button';
import { Chip } from '../../../components/Chip';
import { DateTimeField } from '../../../components/DateTimeField';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { MealItemsEditor } from '../components/MealItemsEditor';
import { mealToItemsInput } from '../helpers';
import { useCreateMeal, useDeleteMeal, useUpdateMeal } from '../hooks';
import type { MealCategory, MealItemInput } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'AddMeal'>;

const CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function AddMealScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const editing = route.params?.meal;
  const createMealMutation = useCreateMeal();
  const updateMealMutation = useUpdateMeal();
  const deleteMealMutation = useDeleteMeal();
  const [category, setCategory] = useState<MealCategory>(editing?.category ?? 'breakfast');
  const [name, setName] = useState(editing?.name ?? '');
  const [items, setItems] = useState<MealItemInput[]>(editing ? mealToItemsInput(editing) : []);
  const [eatenAt, setEatenAt] = useState<Date>(editing ? new Date(editing.eatenAt) : new Date());
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canSubmit = name.trim().length > 0 && items.length > 0;
  const saving = createMealMutation.isPending || updateMealMutation.isPending;

  const submit = () => {
    if (!canSubmit || saving) return;
    const payload = { category, name: name.trim(), eatenAt: eatenAt.toISOString(), items };
    if (editing) {
      updateMealMutation.mutate(
        { id: editing.id, changes: payload },
        { onSuccess: () => navigation.goBack() },
      );
    } else {
      createMealMutation.mutate(payload, { onSuccess: () => navigation.goBack() });
    }
  };

  const remove = () => {
    if (!editing) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteMealMutation.mutate(editing.id, { onSuccess: () => navigation.goBack() });
  };

  const failed =
    createMealMutation.isError || updateMealMutation.isError || deleteMealMutation.isError;

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t(editing ? 'nutrition.editMeal' : 'nutrition.addMeal')} />

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

            <View className="mt-6 gap-4">
              <AuthTextField
                label={t('nutrition.mealName')}
                placeholder={t('nutrition.mealNamePlaceholder')}
                value={name}
                onChangeText={setName}
              />
              <DateTimeField
                label={t('nutrition.eatenAt')}
                value={eatenAt}
                onChange={setEatenAt}
                maximumDate={new Date()}
              />
            </View>

            <MealItemsEditor items={items} onChange={setItems} />

            {failed ? (
              <Text className="mt-4 text-sm text-metric-heart">{t('common.error')}</Text>
            ) : null}

            <View className="mt-8">
              <AuthSubmitButton
                label={t('nutrition.saveMeal')}
                loading={saving}
                disabled={!canSubmit}
                onPress={submit}
              />
            </View>

            {editing ? (
              <View className="mt-4">
                <Button
                  label={t(confirmingDelete ? 'common.confirmDelete' : 'nutrition.deleteMeal')}
                  variant="destructive"
                  loading={deleteMealMutation.isPending}
                  onPress={remove}
                />
              </View>
            ) : null}
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
