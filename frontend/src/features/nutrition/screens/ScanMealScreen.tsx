import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button } from '../../../components/Button';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { TabScreenProps } from '../../../navigation/types';
import { theme } from '../../../theme';
import { useAnalyzeMealPhoto } from '../hooks';

type Props = TabScreenProps<'ScanMeal'>;

export function ScanMealScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const analyzeMutation = useAnalyzeMealPhoto();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickAndAnalyze = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setPhotoUri(asset.uri);
    analyzeMutation.mutate(
      {
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileName: asset.fileName ?? 'meal.jpg',
      },
      {
        onSuccess: ({ analysis }) => {
          if (analysis.status === 'completed') {
            navigation.navigate('ReviewAnalysis', {
              analysisId: analysis.id,
              photoUri: asset.uri,
            });
          }
        },
      },
    );
  };

  const failed =
    analyzeMutation.isError ||
    (analyzeMutation.isSuccess && analyzeMutation.data.analysis.status === 'failed');

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <View className="flex-1 px-5">
        <ScreenHeader title={t('nutrition.scanTitle')} />

        {analyzeMutation.isPending && photoUri ? (
          <Animated.View entering={FadeInDown.springify()} className="mt-8">
            <View className="overflow-hidden rounded-3xl border border-black/5">
              <Image
                source={{ uri: photoUri }}
                className="h-72 w-full bg-ink-800"
                accessibilityIgnoresInvertColors
              />
              <View className="absolute inset-0 items-center justify-end p-5">
                <View className="w-full rounded-2xl bg-ink-900 p-4">
                  <SkeletonBlock className="h-2.5 w-2/3 rounded-full" />
                  <SkeletonBlock className="mt-2 h-2.5 w-1/2 rounded-full" />
                </View>
              </View>
            </View>
            <Text className="mt-4 text-sm leading-relaxed text-content-secondary">
              {t('nutrition.analyzing')}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-8">
            <View className="items-start overflow-hidden rounded-3xl border border-black/5 bg-ink-900">
              {photoUri ? (
                <Image
                  source={{ uri: photoUri }}
                  className="h-44 w-full bg-ink-800"
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              <View className="p-5">
                <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
                  <Ionicons name="camera-outline" size={26} color={theme.colors.brand.DEFAULT} />
                </View>
                <Text className="mt-4 text-2xl font-bold tracking-tight text-content-primary">
                  {t('nutrition.scanHeadline')}
                </Text>
                <Text className="mt-2 text-sm leading-relaxed text-content-secondary">
                  {t('nutrition.scanHint')}
                </Text>
                {failed ? (
                  <Text className="mt-3 text-sm text-metric-heart">
                    {t('nutrition.analysisFailed')}
                  </Text>
                ) : null}
              </View>
            </View>

            <View className="mt-8">
              <Button label={t('nutrition.pickPhoto')} onPress={() => void pickAndAnalyze()} />
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
