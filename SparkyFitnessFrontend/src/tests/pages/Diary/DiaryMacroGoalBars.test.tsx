import { render, screen } from '@testing-library/react';
import DiaryMacroGoalBars, {
  type DiaryMacroGoal,
} from '@/pages/Diary/DiaryMacroGoalBars';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      fallback: string,
      vars: Record<string, string> = {}
    ): string =>
      fallback.replace(/\{\{(\w+)\}\}/g, (_m, k: string) => vars[k] ?? ''),
  }),
}));

const macros: DiaryMacroGoal[] = [
  { key: 'protein', label: 'Protein', consumed: 80, goal: 150 },
  { key: 'carbs', label: 'Carbs', consumed: 240, goal: 250 },
  { key: 'fat', label: 'Fat', consumed: 100, goal: 67 },
];

describe('DiaryMacroGoalBars', () => {
  it('flags a finished day that is well off its macro goals', () => {
    render(<DiaryMacroGoalBars macros={macros} dayIsOver />);
    expect(screen.getByText('80 / 150g')).toBeTruthy();
    expect(screen.getByText('Low')).toBeTruthy();
    expect(screen.getByText('High')).toBeTruthy();
  });

  it('does not call an unfinished day low', () => {
    render(<DiaryMacroGoalBars macros={macros} dayIsOver={false} />);
    expect(screen.queryByText('Low')).toBeNull();
    expect(screen.getByText('High')).toBeTruthy();
  });
});
