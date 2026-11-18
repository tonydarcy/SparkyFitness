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
    ...state,
  });
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
    expect(mutate).toHaveBeenCalledWith('Dinner out, guessed portions');
  });

  test('does not save an unchanged note', () => {
    const { getByLabelText } = setup({ note: 'Same' });
    fireEvent(getByLabelText('Day Note'), 'blur');
    expect(mutate).not.toHaveBeenCalled();
  });
});
