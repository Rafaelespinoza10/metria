import { Text } from 'react-native';
import { PressableScale } from './PressableScale';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Extra classes on the pressable (e.g. flex-1 for evenly distributed rows). */
  className?: string;
}

export function Chip({ label, selected, onPress, className }: ChipProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-full border px-4 py-2 ${
        selected ? 'border-brand bg-brand-soft' : 'border-black/5 bg-ink-900'
      } ${className ?? ''}`}
    >
      <Text
        numberOfLines={1}
        className={`text-center text-sm font-semibold ${
          selected ? 'text-brand' : 'text-content-secondary'
        }`}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
