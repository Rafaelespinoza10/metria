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
import { parseDecimal } from '../../goals/helpers';
import { useLogMeasurement, useMeasurementTypes } from '../hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'LogMeasurement'>;

export function LogMeasurementScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const typesQuery = useMeasurementTypes();
  const logMutation = useLogMeasurement();
  const [typeId, setTypeId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const parsedValue = parseDecimal(value);
  const selectedType = (typesQuery.data ?? []).find((type) => type.id === typeId);
  const canSubmit = typeId !== null && parsedValue !== null;

  const submit = () => {
    if (!canSubmit || !typeId || parsedValue === null || logMutation.isPending) return;
    logMutation.mutate(
      {
        typeId,
        value: parsedValue,
        measuredAt: new Date().toISOString(),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
      { onSuccess: () => navigation.goBack() },
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('measurements.log')} />

          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
              {t('measurements.selectType')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {(typesQuery.data ?? []).map((type) => (
                <Chip
                  key={type.id}
                  label={t(`measurements.type.${type.key}`)}
                  selected={typeId === type.id}
                  onPress={() => setTypeId(type.id)}
                />
              ))}
            </View>

            <View className="mt-6 gap-4">
              <AuthTextField
                label={
                  selectedType
                    ? `${t('measurements.value')} (${selectedType.unit})`
                    : t('measurements.value')
                }
                placeholder="82.5"
                keyboardType="decimal-pad"
                value={value}
                onChangeText={setValue}
              />
              <AuthTextField
                label={t('measurements.notes')}
                placeholder={t('measurements.notesPlaceholder')}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {logMutation.isError ? (
              <Text className="mt-4 text-sm text-metric-heart">{t('common.error')}</Text>
            ) : null}

            <View className="mt-8">
              <AuthSubmitButton
                label={t('measurements.save')}
                loading={logMutation.isPending}
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
