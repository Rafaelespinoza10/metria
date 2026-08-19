import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '../../../components/Button';
import { HumanBody, type BodySide } from '../../../components/HumanBody';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { API_URL } from '../../../services/api';
import { useAuthStore } from '../../../store/auth';
import { theme } from '../../../theme';
import { useLatestMeasurements, usePhotos, useUploadPhoto } from '../hooks';
import { measurementKeyForPart } from '../measurement-sites';

type Props = NativeStackScreenProps<AppStackParamList, 'Measurements'>;

export function MeasurementsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.token);
  const latestQuery = useLatestMeasurements();
  const photosQuery = usePhotos();
  const uploadMutation = useUploadPhoto();
  const [side, setSide] = useState<BodySide>('front');

  // Latest reading per type key, so a measured site can show its value on the figure.
  const latestByKey = new Map(
    (latestQuery.data ?? []).map((entry) => [
      entry.type.key,
      `${entry.measurement.value} ${entry.type.unit}`,
    ]),
  );

  const pickAndUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    uploadMutation.mutate({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
      fileName: asset.fileName ?? 'photo.jpg',
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-12">
          <ScreenHeader showBack title={t('measurements.title')} />

          <Animated.View
            entering={FadeInDown.delay(60).springify()}
            className="mt-6 items-center rounded-3xl border border-black/5 bg-ink-900 py-5"
          >
            {latestQuery.isPending ? (
              <SkeletonBlock className="h-96 w-64 rounded-3xl" />
            ) : (
              <>
                <HumanBody
                  side={side}
                  onSideChange={setSide}
                  keyFor={measurementKeyForPart}
                  selectedKey={null}
                  onSelect={(typeKey) => navigation.navigate('LogMeasurement', { typeKey })}
                  badgeFor={(typeKey) => latestByKey.get(typeKey) ?? null}
                  labelFor={(typeKey) => t(`measurements.type.${typeKey}`)}
                />
                <Text className="mt-4 px-6 text-center text-sm leading-relaxed text-content-secondary">
                  {t('measurements.bodyHint')}
                </Text>
              </>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).springify()} className="mt-8">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-content-primary">
                {t('measurements.latest')}
              </Text>
            </View>

            {latestQuery.isPending ? (
              <SkeletonBlock className="mt-3 h-40 rounded-3xl" />
            ) : latestQuery.data && latestQuery.data.length > 0 ? (
              <View className="mt-3 rounded-3xl border border-black/5 bg-ink-900 px-5">
                {latestQuery.data.map((entry, index) => (
                  <View
                    key={entry.type.id}
                    className={`flex-row items-center justify-between py-4 ${
                      index > 0 ? 'border-t border-black/5' : ''
                    }`}
                  >
                    <Text className="text-sm text-content-secondary">
                      {t(`measurements.type.${entry.type.key}`)}
                    </Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="text-2xl font-bold tracking-tight text-content-primary">
                        {entry.measurement.value}
                      </Text>
                      <Text className="text-sm font-medium text-content-secondary">
                        {entry.type.unit}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="mt-3 items-start rounded-3xl border border-black/5 bg-ink-900 p-5">
                <Text className="text-6xl font-extrabold tracking-tighter text-content-tertiary">
                  —
                </Text>
                <Text className="mt-3 text-sm leading-relaxed text-content-secondary">
                  {t('measurements.empty')}
                </Text>
              </View>
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(180).springify()} className="mt-8">
            <Text className="text-lg font-semibold text-content-primary">
              {t('measurements.photos')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              <View className="flex-row gap-3">
                <PressableScale
                  onPress={() => void pickAndUpload()}
                  accessibilityRole="button"
                  accessibilityLabel={t('measurements.addPhoto')}
                  className="h-40 w-28 items-center justify-center rounded-3xl border border-black/5 bg-ink-900"
                >
                  {uploadMutation.isPending ? (
                    <ActivityIndicator color={theme.colors.brand.DEFAULT} />
                  ) : (
                    <Ionicons name="add" size={28} color={theme.colors.brand.DEFAULT} />
                  )}
                </PressableScale>
                {(photosQuery.data ?? []).map((photo) => (
                  <Image
                    key={photo.id}
                    source={{
                      uri: `${API_URL}${photo.fileUrl}`,
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    }}
                    className="h-40 w-28 rounded-3xl bg-ink-800"
                    accessibilityIgnoresInvertColors
                  />
                ))}
              </View>
            </ScrollView>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).springify()} className="mt-10">
            <Button
              label={t('measurements.log')}
              onPress={() => navigation.navigate('LogMeasurement')}
            />
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
