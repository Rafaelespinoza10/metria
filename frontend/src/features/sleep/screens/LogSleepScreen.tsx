import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { ApiError } from '../../../services/api';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { Button } from '../../../components/Button';
import { editedSleepInstants, formatMinutes, sleepInstants, toTimeText } from '../helpers';
import { useCreateSleep, useDeleteSleep, useUpdateSleep } from '../hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'LogSleep'>;

export function LogSleepScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const editing = route.params?.entry;
  const createMutation = useCreateSleep();
  const updateMutation = useUpdateSleep();
  const deleteMutation = useDeleteSleep();
  const [bedtime, setBedtime] = useState(editing ? toTimeText(editing.bedtime) : '');
  const [wakeTime, setWakeTime] = useState(editing ? toTimeText(editing.wakeTime) : '');
  const [quality, setQuality] = useState<number | null>(editing?.quality ?? null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Editing keeps the night anchored to the entry's original wake-up day.
  const instants = editing
    ? editedSleepInstants(editing.wakeTime, bedtime, wakeTime)
    : sleepInstants(bedtime, wakeTime);
  const previewMinutes = instants
    ? Math.round((instants.wakeTime.getTime() - instants.bedtime.getTime()) / 60000)
    : null;

  const saving = createMutation.isPending || updateMutation.isPending;

  const submit = () => {
    if (!instants || saving) return;
    if (editing) {
      updateMutation.mutate(
        {
          id: editing.id,
          changes: {
            bedtime: instants.bedtime.toISOString(),
            wakeTime: instants.wakeTime.toISOString(),
            quality,
          },
        },
        { onSuccess: () => navigation.goBack() },
      );
      return;
    }
    createMutation.mutate(
      {
        bedtime: instants.bedtime.toISOString(),
        wakeTime: instants.wakeTime.toISOString(),
        ...(quality !== null ? { quality } : {}),
      },
      { onSuccess: () => navigation.goBack() },
    );
  };

  const remove = () => {
    if (!editing) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteMutation.mutate(editing.id, { onSuccess: () => navigation.goBack() });
  };

  const errorKey =
    createMutation.error instanceof ApiError && createMutation.error.code === 'CONFLICT'
      ? 'sleep.alreadyLogged'
      : 'common.error';

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t(editing ? 'sleep.edit' : 'sleep.log')} />

          <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-8 gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <AuthTextField
                  label={t('sleep.bedtime')}
                  placeholder="23:00"
                  keyboardType="numbers-and-punctuation"
                  value={bedtime}
                  onChangeText={setBedtime}
                />
              </View>
              <View className="flex-1">
                <AuthTextField
                  label={t('sleep.wakeTime')}
                  placeholder="06:34"
                  keyboardType="numbers-and-punctuation"
                  value={wakeTime}
                  onChangeText={setWakeTime}
                />
              </View>
            </View>

            {previewMinutes !== null ? (
              <Text className="text-sm text-content-secondary">
                {t('sleep.durationPreview', { duration: formatMinutes(previewMinutes) })}
              </Text>
            ) : null}

            <Text className="mt-2 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
              {t('sleep.quality')}
            </Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <Chip
                  key={value}
                  label={String(value)}
                  selected={quality === value}
                  onPress={() => setQuality(quality === value ? null : value)}
                />
              ))}
            </View>

            {createMutation.isError || updateMutation.isError || deleteMutation.isError ? (
              <Text className="text-sm text-metric-heart">{t(errorKey)}</Text>
            ) : null}

            <View className="mt-4">
              <AuthSubmitButton
                label={t('sleep.save')}
                loading={saving}
                disabled={!instants}
                onPress={submit}
              />
            </View>

            {editing ? (
              <Button
                label={t(confirmingDelete ? 'common.confirmDelete' : 'sleep.deleteEntry')}
                variant="destructive"
                loading={deleteMutation.isPending}
                onPress={remove}
              />
            ) : null}
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
