import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DayNoteCard from '@/pages/Diary/DayNoteCard';
import {
  useFoodDiaryNoteQuery,
  useSaveFoodDiaryNoteMutation,
} from '@/hooks/Diary/useFoodDiaryNote';

jest.mock('react-i18next', () =>
  jest.requireActual('@/tests/mocks/reactI18next')
);

jest.mock('@/hooks/Diary/useFoodDiaryNote', () => ({
  useFoodDiaryNoteQuery: jest.fn(),
  useSaveFoodDiaryNoteMutation: jest.fn(),
}));

const mutate = jest.fn();

const setup = (note: string | null) => {
  (useFoodDiaryNoteQuery as jest.Mock).mockReturnValue({
    data: { date: '2026-11-18', note, updated_at: null },
    isLoading: false,
  });
  (useSaveFoodDiaryNoteMutation as jest.Mock).mockReturnValue({
    mutate,
    reset: jest.fn(),
    isPending: false,
    isSuccess: false,
  });
  render(<DayNoteCard date="2026-11-18" userId="u1" />);
  return screen.getByRole('textbox');
};

beforeEach(() => {
  mutate.mockReset();
});

describe('DayNoteCard', () => {
  it("shows the day's saved note", () => {
    expect(setup('Dinner out')).toHaveValue('Dinner out');
  });

  it('saves an edited note when the box loses focus', () => {
    const box = setup(null);
    fireEvent.change(box, { target: { value: 'Felt unwell' } });
    fireEvent.blur(box);
    expect(mutate).toHaveBeenCalledWith('Felt unwell');
  });

  it('sends an emptied note so the server deletes it', () => {
    const box = setup('Old note');
    fireEvent.change(box, { target: { value: '' } });
    fireEvent.blur(box);
    expect(mutate).toHaveBeenCalledWith('');
  });

  it('does not save when nothing changed', () => {
    const box = setup('Same');
    fireEvent.blur(box);
    expect(mutate).not.toHaveBeenCalled();
  });
});
