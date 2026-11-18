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

const queryState = (note: string | null) => ({
  data: { date: '2026-11-18', note, updated_at: null },
  isError: false,
  refetch: jest.fn(),
});

const setup = (note: string | null, readOnly = false) => {
  (useFoodDiaryNoteQuery as jest.Mock).mockReturnValue(queryState(note));
  (useSaveFoodDiaryNoteMutation as jest.Mock).mockReturnValue({
    mutate,
    reset: jest.fn(),
    isPending: false,
    isSuccess: false,
  });
  const view = render(
    <DayNoteCard date="2026-11-18" userId="u1" readOnly={readOnly} />
  );
  return { box: screen.getByRole('textbox'), ...view };
};

beforeEach(() => {
  mutate.mockReset();
});

describe('DayNoteCard', () => {
  it("shows the day's saved note", () => {
    expect(setup('Dinner out').box).toHaveValue('Dinner out');
  });

  it('saves an edited note when the box loses focus', () => {
    const { box } = setup(null);
    fireEvent.change(box, { target: { value: 'Felt unwell' } });
    fireEvent.blur(box);
    expect(mutate).toHaveBeenCalledWith('Felt unwell', expect.anything());
  });

  it('sends an emptied note so the server deletes it', () => {
    const { box } = setup('Old note');
    fireEvent.change(box, { target: { value: '' } });
    fireEvent.blur(box);
    expect(mutate).toHaveBeenCalledWith('', expect.anything());
  });

  it('does not save when nothing changed', () => {
    const { box } = setup('Same');
    fireEvent.blur(box);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('never saves for someone who can only read the diary', () => {
    const { box } = setup('Read only', true);
    fireEvent.change(box, { target: { value: 'Changed' } });
    fireEvent.blur(box);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('keeps newer typing when an earlier save comes back', () => {
    const { box, rerender } = setup('A');
    fireEvent.change(box, { target: { value: 'B' } });
    fireEvent.blur(box);
    fireEvent.change(box, { target: { value: 'C' } });
    (useFoodDiaryNoteQuery as jest.Mock).mockReturnValue(queryState('B'));
    rerender(<DayNoteCard date="2026-11-18" userId="u1" />);
    expect(box).toHaveValue('C');
  });

  it('saves a change back to the saved text while another save is pending', () => {
    const { box } = setup('A');
    fireEvent.change(box, { target: { value: 'B' } });
    fireEvent.blur(box);
    fireEvent.change(box, { target: { value: 'A' } });
    fireEvent.blur(box);
    expect(mutate.mock.calls.map((call) => call[0])).toEqual(['B', 'A']);
  });
});
