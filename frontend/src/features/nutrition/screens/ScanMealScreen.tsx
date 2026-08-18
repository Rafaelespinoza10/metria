import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PressableScale } from '../../../components/PressableScale';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { SkeletonBlock } from '../../../components/SkeletonBlock';
import type { AppStackParamList } from '../../../navigation/types';
import { theme } from '../../../theme';
import { useAnalyzeMealPhoto } from '../hooks';

type Props = NativeStackScreenProps<AppStackParamList, 'ScanMeal'>;

export function ScanMealScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const analyzeMutation = useAnalyzeMealPhoto();

  const pickAndAnalyze = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    analyzeMutation.mutate(
      {
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        fileName: asset.fileName ?? 'meal.jpg',
      },
      {
        onSuccess: ({ analysis }) => {
          if (analysis.status === 'completed') {
            navigation.replace('ReviewAnalysis', { analysisId: analysis.id });
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
        <ScreenHeader showBack title={t('nutrition.scanTitle')} />

        {analyzeMutation.isPending ? (
          <Animated.View entering={FadeInDown.springify()} className="mt-8">
            <SkeletonBlock className="h-64 rounded-3xl" />
            <Text className="mt-4 text-sm leading-relaxed text-content-secondary">
              {t('nutrition.analyzing')}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(60).springify()} className="mt-8">
            <View className="items-start rounded-3xl border border-black/5 bg-ink-900 p-5">
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

            <View className="mt-8">
              <PressableScale
                onPress={() => void pickAndAnalyze()}
                accessibilityRole="button"
                className="rounded-2xl bg-charcoal py-4"
              >
                <Text className="text-center text-base font-semibold text-white">
                  {t('nutrition.pickPhoto')}
                </Text>
              </PressableScale>
            </View>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}
