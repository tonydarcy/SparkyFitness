import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UnitInput } from '@/components/ui/UnitInput';

const Harness = ({
  commitOnChange,
  unit = 'kg',
  onValue,
}: {
  commitOnChange?: boolean;
  unit?: string;
  onValue: (v: number | null) => void;
}) => {
  const [value, setValue] = useState<number | null>(null);
  return (
    <UnitInput
      aria-label="weight"
      type="weight"
      unit={unit}
      value={value}
      commitOnChange={commitOnChange}
      onChange={(v) => {
        setValue(v);
        onValue(v);
      }}
    />
  );
};

describe('UnitInput', () => {
  it('reports the value only on blur by default', () => {
    const onValue = jest.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByLabelText('weight');
    fireEvent.change(input, { target: { value: '85' } });
    expect(onValue).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onValue).toHaveBeenCalledWith(85);
  });

  it('reports each keystroke with commitOnChange and keeps the typed text', () => {
    const onValue = jest.fn();
    render(<Harness commitOnChange onValue={onValue} />);
    const input = screen.getByLabelText('weight');
    fireEvent.change(input, { target: { value: '85' } });
    expect(onValue).toHaveBeenLastCalledWith(85);
    fireEvent.change(input, { target: { value: '85.5' } });
    expect(onValue).toHaveBeenLastCalledWith(85.5);
    expect(input).toHaveValue(85.5);
    fireEvent.change(input, { target: { value: '' } });
    expect(onValue).toHaveBeenLastCalledWith(null);
  });

  it('converts pounds to kilograms as they are typed', () => {
    const onValue = jest.fn();
    render(<Harness commitOnChange unit="lbs" onValue={onValue} />);
    fireEvent.change(screen.getByLabelText('weight'), {
      target: { value: '200' },
    });
    expect(onValue.mock.calls.at(-1)?.[0]).toBeCloseTo(90.7185, 3);
    expect(screen.getByLabelText('weight')).toHaveValue(200);
  });
});
