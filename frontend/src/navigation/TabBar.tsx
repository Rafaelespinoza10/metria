import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '../components/PressableScale';
import { theme } from '../theme';

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Nutrition: 'restaurant-outline',
  ScanMeal: 'scan-outline',
  Workouts: 'barbell-outline',
  Insights: 'sparkles-outline',
};

/** White bottom bar with an orange pill on the active tab (reference style). */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-around border-t border-black/5 bg-ink-900 px-4 pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key] ?? { options: {} };

        return (
          <PressableScale
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? route.name}
            className={`h-12 w-12 items-center justify-center rounded-2xl ${
              focused ? 'bg-brand' : ''
            }`}
          >
            <Ionicons
              name={TAB_ICONS[route.name] ?? 'ellipse-outline'}
              size={22}
              color={focused ? '#FFFFFF' : theme.colors.content.tertiary}
            />
          </PressableScale>
        );
      })}
    </View>
  );
}
