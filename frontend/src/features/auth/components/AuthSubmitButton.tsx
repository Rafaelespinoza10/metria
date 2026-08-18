import { Button } from '../../../components/Button';

interface AuthSubmitButtonProps {
  label: string;
  loading: boolean;
  onPress: () => void;
  disabled?: boolean;
}

/** Primary form CTA — thin wrapper kept for its historical name across form screens. */
export function AuthSubmitButton({
  label,
  loading,
  onPress,
  disabled = false,
}: AuthSubmitButtonProps) {
  return <Button label={label} loading={loading} disabled={disabled} onPress={onPress} />;
}
