import { render } from '@testing-library/react-native';
import { MacroBar } from './MacroBar';

describe('MacroBar', () => {
  it('renders label, value, target, and unit', async () => {
    const { getByText } = await render(
      <MacroBar label="Protein" value={147} target={170} unit="g" color="#FACC15" />,
    );

    expect(getByText('Protein')).toBeTruthy();
    expect(getByText(/147/)).toBeTruthy();
    expect(getByText(/\/ 170 g/)).toBeTruthy();
  });

  it('omits the target segment when no target is set', async () => {
    const { getByText, queryByText } = await render(
      <MacroBar label="Carbs" value={42} unit="g" color="#38BDF8" />,
    );

    expect(getByText(/42/)).toBeTruthy();
    expect(queryByText(/\//)).toBeNull();
  });
});
