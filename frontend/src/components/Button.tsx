import { ActivityIndicator, Text } from 'react-native';
import { theme } from '../theme';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  /** Extra classes on the pressable surface (e.g. width tweaks inside rows). */
  className?: string;
}

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-charcoal',
  secondary: 'border border-brand/40 bg-ink-900',
  destructive: 'bg-metric-heart',
};

const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-brand',
  destructive: 'text-white',
};

const SPINNER: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: theme.colors.brand.DEFAULT,
  destructive: '#FFFFFF',
};

/** Standard CTA. Fixed 52px height so the layout never jumps when `loading`
 *  swaps the label for a spinner. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  className,
}: ButtonProps) {
  const blocked = disabled || loading;

  return (
    <PressableScale
      onPress={onPress}
      disabled={blocked}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      className={`h-[52px] items-center justify-center rounded-2xl ${CONTAINER[variant]} ${
        disabled ? 'opacity-40' : loading ? 'opacity-70' : ''
      } ${className ?? ''}`}
    >
      {loading ? (
        <ActivityIndicator color={SPINNER[variant]} />
      ) : (
        <Text className={`text-base font-semibold ${LABEL[variant]}`}>{label}</Text>
      )}
    </PressableScale>
  );
}
