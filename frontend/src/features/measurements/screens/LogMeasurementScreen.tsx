import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { HumanBody, type BodySide } from '../../../components/HumanBody';
import { ScreenHeader } from '../../../components/ScreenHeader';
import type { AppStackParamList } from '../../../navigation/types';
import { AuthSubmitButton } from '../../auth/components/AuthSubmitButton';
import { AuthTextField } from '../../auth/components/AuthTextField';
import { parseDecimal } from '../../goals/helpers';
import { useLogMeasurement, useMeasurementTypes } from '../hooks';
import { measurementKeyForPart, NON_SITE_TYPE_KEYS } from '../measurement-sites';

type Props = NativeStackScreenProps<AppStackParamList, 'LogMeasurement'>;

/** Front view unless the tapped site only exists on the back. */
const BACK_ONLY_KEYS = ['left_triceps', 'right_triceps'];

export function LogMeasurementScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const typesQuery = useMeasurementTypes();
  const logMutation = useLogMeasurement();
  const presetKey = route.params?.typeKey ?? null;
  const [typeKey, setTypeKey] = useState<string | null>(presetKey);
  const [side, setSide] = useState<BodySide>(
    presetKey && BACK_ONLY_KEYS.includes(presetKey) ? 'back' : 'front',
  );
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const types = typesQuery.data ?? [];
  const parsedValue = parseDecimal(value);
  const selectedType = types.find((type) => type.key === typeKey);
  const canSubmit = selectedType !== undefined && parsedValue !== null;

  const submit = () => {
    if (!canSubmit || parsedValue === null || logMutation.isPending) return;
    logMutation.mutate(
      {
        typeId: selectedType.id,
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
              {t('measurements.wholeBody')}
            </Text>
            <View className="flex-row gap-2">
              {NON_SITE_TYPE_KEYS.filter((key) => types.some((type) => type.key === key)).map(
                (key) => (
                  <Chip
                    key={key}
                    label={t(`measurements.type.${key}`)}
                    selected={typeKey === key}
                    onPress={() => setTypeKey(key)}
                  />
                ),
              )}
            </View>

            <Text className="mb-3 mt-6 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
              {t('measurements.tapSite')}
            </Text>
            <View className="items-center rounded-3xl border border-black/5 bg-ink-900 py-5">
              <HumanBody
                side={side}
                onSideChange={setSide}
                keyFor={measurementKeyForPart}
                selectedKey={typeKey}
                onSelect={setTypeKey}
                labelFor={(key) => t(`measurements.type.${key}`)}
                width={220}
              />
            </View>

            <View className="mt-6 gap-4">
              <AuthTextField
                label={
                  selectedType
                    ? `${t(`measurements.type.${selectedType.key}`)} (${selectedType.unit})`
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
