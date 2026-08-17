import { Text } from 'react-native';
import { PressableScale } from './PressableScale';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-full border px-4 py-2 ${
        selected ? 'border-brand bg-brand-soft' : 'border-white/5 bg-ink-900'
      }`}
    >
      <Text
        className={`text-sm font-semibold ${selected ? 'text-brand' : 'text-content-secondary'}`}
      >
        {label}
      </Text>
    </PressableScale>
  );
}
