import { fireEvent, render } from '@testing-library/react-native';
import i18n from '../i18n';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('shows the failure copy and fires the retry action', async () => {
    const onRetry = jest.fn();
    const { getByText } = await render(<ErrorState onRetry={onRetry} />);

    expect(getByText(i18n.t('common.loadFailed'))).toBeTruthy();
    await fireEvent.press(getByText(i18n.t('common.retry')));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
