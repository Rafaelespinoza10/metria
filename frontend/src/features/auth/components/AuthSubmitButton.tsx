import { ActivityIndicator, Text } from 'react-native';
import { PressableScale } from '../../../components/PressableScale';

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
      className={`rounded-2xl bg-charcoal py-4 ${loading ? 'opacity-70' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-center text-base font-semibold text-white">{label}</Text>
      )}
    </PressableScale>
  );
}
