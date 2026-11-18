import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import DayNoteCard from '../../src/components/DayNoteCard';
import {
  useFoodDiaryNote,
  useSaveFoodDiaryNote,
} from '../../src/hooks/useFoodDiaryNote';

jest.mock('../../src/components/Icon', () => 'Icon');
jest.mock('uniwind', () => ({
  useCSSVariable: jest.fn(() => '#000'),
}));
jest.mock('../../src/hooks/useFoodDiaryNote', () => ({
  useFoodDiaryNote: jest.fn(),
  useSaveFoodDiaryNote: jest.fn(),
}));

const mutate = jest.fn();

const setup = (state: {
  note: string | null;
  supported?: boolean;
  isLoaded?: boolean;
}) => {
  jest.mocked(useFoodDiaryNote).mockReturnValue({
    supported: true,
    isLoaded: true,
    refetch: jest.fn(),
    ...state,
  } as unknown as ReturnType<typeof useFoodDiaryNote>);
  jest
    .mocked(useSaveFoodDiaryNote)
    .mockReturnValue({ mutate } as unknown as ReturnType<
      typeof useSaveFoodDiaryNote
    >);
  return render(<DayNoteCard date="2026-11-18" />);
};

beforeEach(() => {
  mutate.mockReset();
});

describe('DayNoteCard', () => {
  test('renders nothing against a server without day notes', () => {
    const { toJSON } = setup({ note: null, supported: false });
    expect(toJSON()).toBeNull();
  });

  test("shows the day's note and saves an edit on blur", () => {
    const { getByLabelText } = setup({ note: 'Dinner out' });
    const box = getByLabelText('Day Note');
    expect(box.props.value).toBe('Dinner out');
    fireEvent.changeText(box, 'Dinner out, guessed portions');
    fireEvent(box, 'blur');
    expect(mutate).toHaveBeenCalledWith(
      'Dinner out, guessed portions',
      expect.anything()
    );
  });

  test('does not save an unchanged note', () => {
    const { getByLabelText } = setup({ note: 'Same' });
    fireEvent(getByLabelText('Day Note'), 'blur');
    expect(mutate).not.toHaveBeenCalled();
  });

  test('saves a change back to the saved text while another save is pending', () => {
    const { getByLabelText } = setup({ note: 'A' });
    const box = getByLabelText('Day Note');
    fireEvent.changeText(box, 'B');
    fireEvent(box, 'blur');
    fireEvent.changeText(box, 'A');
    fireEvent(box, 'blur');
    expect(mutate.mock.calls.map((call) => call[0])).toEqual(['B', 'A']);
  });

  test('keeps newer typing when an earlier save comes back', () => {
    const { getByLabelText, rerender } = setup({ note: 'A' });
    const box = getByLabelText('Day Note');
    fireEvent.changeText(box, 'B');
    fireEvent(box, 'blur');
    fireEvent.changeText(box, 'C');
    jest.mocked(useFoodDiaryNote).mockReturnValue({
      note: 'B',
      supported: true,
      isLoaded: true,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useFoodDiaryNote>);
    rerender(<DayNoteCard date="2026-11-18" />);
    expect(getByLabelText('Day Note').props.value).toBe('C');
  });
});
