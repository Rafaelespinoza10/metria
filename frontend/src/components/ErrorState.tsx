import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../theme';
import { Button } from './Button';

interface ErrorStateProps {
  onRetry: () => void;
}

/** Failed-request card with a retry action — a network failure must never be
 *  indistinguishable from an empty state. */
export function ErrorState({ onRetry }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <Animated.View
      entering={FadeInDown.springify()}
      className="mt-3 items-start rounded-3xl border border-black/5 bg-ink-900 p-5"
    >
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft">
        <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.brand.DEFAULT} />
      </View>
      <Text className="mt-3 text-sm leading-relaxed text-content-secondary">
        {t('common.loadFailed')}
      </Text>
      <View className="mt-4 self-stretch">
        <Button label={t('common.retry')} variant="secondary" onPress={onRetry} />
      </View>
    </Animated.View>
  );
}
