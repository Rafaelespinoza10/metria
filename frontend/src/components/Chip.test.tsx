import { fireEvent, render } from '@testing-library/react-native';
import { Chip } from './Chip';

describe('Chip', () => {
  it('renders its label and fires onPress', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Chip label="Active" selected={false} onPress={onPress} />);

    await fireEvent.press(getByText('Active'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes the selected state for accessibility', async () => {
    const { getByRole } = await render(<Chip label="Active" selected onPress={jest.fn()} />);
    expect(getByRole('button', { selected: true })).toBeTruthy();
  });
});
