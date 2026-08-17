import { Pressable, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface PressableScaleProps extends PressableProps {
  /** NativeWind classes applied to the animated wrapper. */
  className?: string;
  children?: React.ReactNode;
}

/** Standard press feedback: springs to 0.97 scale. Use for every tappable card/button. */
export function PressableScale({ className, children, ...props }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      {...props}
      onPressIn={(event) => {
        scale.set(withSpring(0.97, { damping: 20, stiffness: 300 }));
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, { damping: 20, stiffness: 300 }));
        props.onPressOut?.(event);
      }}
    >
      <Animated.View style={animatedStyle} className={className}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
