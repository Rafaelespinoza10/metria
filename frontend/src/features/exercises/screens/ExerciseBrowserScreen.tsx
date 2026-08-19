import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Chip } from '../../../components/Chip';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { theme } from '../../../theme';
import { HumanBody, type BodySide } from '../../../components/HumanBody';
import { useExerciseDetail, useExercises } from '../hooks';
import { regionForPart } from '../body-regions-map';
import type { BodyRegion } from '../regions';
import type { CatalogExercise, ExerciseLevel } from '../types';

type Props = NativeStackScreenProps<AppStackParamList, 'ExerciseBrowser'>;

const LEVELS: ExerciseLevel[] = ['beginner', 'intermediate', 'expert'];

function ExerciseCard({
  exercise,
  expanded,
  picker,
  onToggle,
  onUse,
}: {
  exercise: CatalogExercise;
  expanded: boolean;
  picker: boolean;
  onToggle: () => void;
  onUse: () => void;
}) {
  const { t } = useTranslation();
  const detailQuery = useExerciseDetail(expanded ? exercise.id : null);

  return (
    <View className="mt-3 overflow-hidden rounded-3xl border border-black/5 bg-ink-900">
      <PressableScale onPress={onToggle} accessibilityRole="button">
        <View className="flex-row items-center gap-3 p-4">
          {exercise.imageUrls[0] ? (
            <Image
              source={{ uri: exercise.imageUrls[0] }}
              className="h-16 w-16 rounded-2xl bg-ink-800"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft">
              <Ionicons name="barbell-outline" size={22} color={theme.colors.brand.DEFAULT} />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-base font-semibold text-content-primary" numberOfLines={2}>
              {exercise.name}
            </Text>
            <Text className="mt-1 text-xs uppercase tracking-widest text-content-tertiary">
              {t(`exercises.level.${exercise.level}`)}
              {exercise.equipment ? `  ·  ${exercise.equipment}` : ''}
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.content.tertiary}
          />
        </View>
      </PressableScale>

      {expanded ? (
        <View className="border-t border-black/5 px-4 pb-4">
          {detailQuery.isPending ? (
            <SkeletonBlock className="mt-4 h-20 rounded-2xl" />
          ) : detailQuery.data ? (
            <>
              {detailQuery.data.imageUrls[1] ? (
                <Image
                  source={{ uri: detailQuery.data.imageUrls[1] }}
                  className="mt-4 h-40 w-full rounded-2xl bg-ink-800"
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              <Text className="mt-4 text-xs font-semibold uppercase tracking-widest text-content-tertiary">
                {t('exercises.instructions')}
              </Text>
              {detailQuery.data.instructions.slice(0, 5).map((step, index) => (
                <Text key={index} className="mt-2 text-sm leading-relaxed text-content-secondary">
                  {index + 1}. {step}
                </Text>
              ))}
            </>
          ) : (
            <Text className="mt-4 text-sm text-content-secondary">{t('common.error')}</Text>
          )}
          {picker ? (
            <PressableScale
              onPress={onUse}
              accessibilityRole="button"
              className="mt-4 rounded-2xl bg-charcoal py-3.5"
            >
              <Text className="text-center text-sm font-semibold text-white">
                {t('exercises.useExercise')}
              </Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function ExerciseBrowserScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const picker = route.params?.picker ?? false;
  const [side, setSide] = useState<BodySide>('front');
  const [region, setRegion] = useState<BodyRegion | null>(null);
  const [level, setLevel] = useState<ExerciseLevel | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const exercisesQuery = useExercises(region ?? 'chest', '', level);
  const exercises = region ? (exercisesQuery.data ?? []) : [];

  const pickExercise = (exercise: CatalogExercise) => {
    if (!region) return;
    navigation.popTo('AddWorkout', {
      pickedExercise: { name: exercise.name, muscleGroup: t(`exercises.region.${region}`) },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('exercises.title')} />

          <Animated.View
            entering={FadeInDown.delay(60).springify()}
            className="mt-6 rounded-3xl border border-black/5 bg-ink-900 p-5"
          >
            <HumanBody
              side={side}
              onSideChange={setSide}
              keyFor={(part) => regionForPart(part)}
              selectedKey={region}
              onSelect={(key) => setRegion(key as BodyRegion)}
              labelFor={(key) => t(`exercises.region.${key}`)}
            />
            <Text className="mt-2 text-center text-sm font-semibold text-content-primary">
              {region ? t(`exercises.region.${region}`) : t('exercises.tapHint')}
            </Text>
          </Animated.View>

          {region ? (
            <Animated.View entering={FadeInDown.delay(100).springify()} className="mt-6">
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  label={t('exercises.allLevels')}
                  selected={level === undefined}
                  onPress={() => setLevel(undefined)}
                />
                {LEVELS.map((item) => (
                  <Chip
                    key={item}
                    label={t(`exercises.level.${item}`)}
                    selected={level === item}
                    onPress={() => setLevel(item)}
                  />
                ))}
              </View>

              {exercisesQuery.isPending ? (
                <>
                  <SkeletonBlock className="mt-3 h-24 rounded-3xl" />
                  <SkeletonBlock className="mt-3 h-24 rounded-3xl" />
                </>
              ) : exercises.length > 0 ? (
                exercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    expanded={expandedId === exercise.id}
                    picker={picker}
                    onToggle={() => setExpandedId(expandedId === exercise.id ? null : exercise.id)}
                    onUse={() => pickExercise(exercise)}
                  />
                ))
              ) : (
                <Text className="mt-4 text-sm leading-relaxed text-content-secondary">
                  {t('exercises.empty')}
                </Text>
              )}
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
