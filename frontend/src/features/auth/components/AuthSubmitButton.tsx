import { ActivityIndicator, Text } from 'react-native';
import { PressableScale } from '../../../components/PressableScale';
import { theme } from '../../../theme';

interface AuthSubmitButtonProps {
  label: string;
  loading: boolean;
  onPress: () => void;
}

export function AuthSubmitButton({ label, loading, onPress }: AuthSubmitButtonProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      className={`rounded-2xl bg-brand py-4 ${loading ? 'opacity-70' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.ink[950]} />
      ) : (
        <Text className="text-center text-base font-semibold text-ink-950">{label}</Text>
      )}
    </PressableScale>
  );
}
