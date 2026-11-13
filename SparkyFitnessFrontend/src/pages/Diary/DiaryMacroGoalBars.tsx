import { useTranslation } from 'react-i18next';
import { macroGoalFill, macroGoalStatus } from '@workspace/shared';
import { CENTRAL_NUTRIENT_CONFIG } from '@/constants/nutrients';

export interface DiaryMacroGoal {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  consumed: number;
  goal: number;
}

interface DiaryMacroGoalBarsProps {
  macros: DiaryMacroGoal[];
  /** True for a day before today, so a short day is flagged as low. */
  dayIsOver: boolean;
}

const LOW_COLOR = '#f59e0b'; // amber-500
const HIGH_COLOR = '#ef4444'; // red-500

/**
 * Thin protein / carbs / fat bars in the Diary's Daily Energy Goal card: just
 * enough to see when a macro is way off its goal. The Dashboard keeps the
 * detailed view.
 */
const DiaryMacroGoalBars = ({ macros, dayIsOver }: DiaryMacroGoalBarsProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-3 gap-3" data-testid="diary-macro-goal-bars">
      {macros.map(({ key, label, consumed, goal }) => {
        const status = macroGoalStatus(consumed, goal, dayIsOver);
        const flagged = status === 'low' || status === 'high';
        const color =
          status === 'low'
            ? LOW_COLOR
            : status === 'high'
              ? HIGH_COLOR
              : CENTRAL_NUTRIENT_CONFIG[key]?.chartColor;
        const consumedText = String(Math.round(consumed));
        const goalText = String(Math.round(goal));
        const statusText =
          status === 'low'
            ? t('diary.macroGoal.low', 'Low')
            : status === 'high'
              ? t('diary.macroGoal.high', 'High')
              : null;
        return (
          <div key={key} className="min-w-0" data-testid={`diary-macro-${key}`}>
            <div className="flex items-baseline justify-between gap-1 text-xs">
              <span className="truncate text-gray-500">{label}</span>
              {statusText && (
                <span className="font-bold" style={{ color }}>
                  {statusText}
                </span>
              )}
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 dark:bg-slate-700">
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${macroGoalFill(consumed, goal) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <div
              className={`mt-1 text-xs whitespace-nowrap ${flagged ? 'font-bold' : 'font-semibold'}`}
              style={flagged ? { color } : undefined}
            >
              {status === 'noGoal'
                ? t('diary.macroGoal.grams', '{{consumed}}g', {
                    consumed: consumedText,
                  })
                : t('diary.macroGoal.ofGoal', '{{consumed}} / {{goal}}g', {
                    consumed: consumedText,
                    goal: goalText,
                  })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DiaryMacroGoalBars;
