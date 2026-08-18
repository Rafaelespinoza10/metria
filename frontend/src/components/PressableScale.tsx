import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface PressableScaleProps extends PressableProps {
  /** NativeWind classes applied to the animated wrapper. */
  className?: string;
  children?: React.ReactNode;
}

// Stiff spring so the press-in reads as immediate; the release keeps a hint of bounce.
const PRESS_SPRING = { damping: 26, stiffness: 520 };

/** Standard press feedback: springs to 0.96 scale. Use for every tappable card/button. */
export function PressableScale({ className, children, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        scale.set(withSpring(0.96, PRESS_SPRING));
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, PRESS_SPRING));
        props.onPressOut?.(event);
      }}
    >
      <Animated.View style={animatedStyle} className={className}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
