import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../theme';
import { PressableScale } from './PressableScale';

interface ScreenHeaderProps {
  /** Small uppercase-style line above the title. */
  kicker?: string;
  title: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export function ScreenHeader({ kicker, title, showBack = false, right }: ScreenHeaderProps) {
  const navigation = useNavigation();

  return (
    <Animated.View entering={FadeInDown.springify()} className="mt-2">
      {showBack ? (
        <PressableScale
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-ink-800"
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.content.secondary} />
        </PressableScale>
      ) : null}
      <View className="flex-row items-end justify-between">
        <View className="flex-1 pr-3">
          {kicker ? <Text className="text-sm text-content-secondary">{kicker}</Text> : null}
          <Text className="mt-1 text-3xl font-bold text-content-primary">{title}</Text>
        </View>
        {right}
      </View>
    </Animated.View>
  );
}
