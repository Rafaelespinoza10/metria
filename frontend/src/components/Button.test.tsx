import { fireEvent, render } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('renders the label and fires onPress', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button label="Save" onPress={onPress} />);

    await fireEvent.press(getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('blocks presses when disabled', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Button label="Save" disabled onPress={onPress} />);

    await fireEvent.press(getByText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('hides the label and blocks presses while loading', async () => {
    const onPress = jest.fn();
    const { queryByText, getByRole } = await render(
      <Button label="Save" loading onPress={onPress} />,
    );

    expect(queryByText('Save')).toBeNull();
    await fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
