import { fireEvent, render } from '@testing-library/react-native';
import { AuthSubmitButton } from './AuthSubmitButton';

describe('AuthSubmitButton', () => {
  it('renders the label and fires onPress', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <AuthSubmitButton label="Sign in" loading={false} onPress={onPress} />,
    );

    await fireEvent.press(getByText('Sign in'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('hides the label and blocks presses while loading', async () => {
    const onPress = jest.fn();
    const { queryByText, getByRole } = await render(
      <AuthSubmitButton label="Sign in" loading onPress={onPress} />,
    );

    expect(queryByText('Sign in')).toBeNull();
    await fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
