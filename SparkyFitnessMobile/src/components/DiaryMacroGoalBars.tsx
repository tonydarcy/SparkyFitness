import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text } from 'react-native';
import { useCSSVariable } from 'uniwind';
import {
  macroGoalFill,
  macroGoalStatus,
  type MacroGoalStatus,
} from '@workspace/shared';

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

const MACRO_COLOR_VARS = {
  protein: '--color-macro-protein',
  carbs: '--color-macro-carbs',
  fat: '--color-macro-fat',
} as const;

/**
 * Thin protein / carbs / fat bars under the Diary calorie bar: just enough to
 * see when a macro is way off its goal. The Dashboard keeps the detail.
 */
const DiaryMacroGoalBars: React.FC<DiaryMacroGoalBarsProps> = ({
  macros,
  dayIsOver,
}) => {
  const { t } = useTranslation();
  const [proteinColor, carbsColor, fatColor, trackColor, lowColor, highColor] =
    useCSSVariable([
      MACRO_COLOR_VARS.protein,
      MACRO_COLOR_VARS.carbs,
      MACRO_COLOR_VARS.fat,
      '--color-progress-track',
      '--color-icon-warning',
      '--color-icon-danger',
    ]) as [string, string, string, string, string, string];
  const macroColor = {
    protein: proteinColor,
    carbs: carbsColor,
    fat: fatColor,
  };

  const statusColor = (status: MacroGoalStatus, key: DiaryMacroGoal['key']) =>
    status === 'low'
      ? lowColor
      : status === 'high'
        ? highColor
        : macroColor[key];

  return (
    <View className="flex-row gap-3 mt-3" testID="diary-macro-goal-bars">
      {macros.map(({ key, label, consumed, goal }) => {
        const status = macroGoalStatus(consumed, goal, dayIsOver);
        const color = statusColor(status, key);
        const consumedText = String(Math.round(consumed));
        const goalText = String(Math.round(goal));
        const flagged = status === 'low' || status === 'high';
        const statusText =
          status === 'low'
            ? t('diarySummary.macroLow', { defaultValue: 'Low' })
            : status === 'high'
              ? t('diarySummary.macroHigh', { defaultValue: 'High' })
              : '';
        return (
          <View
            key={key}
            className="flex-1"
            accessible
            accessibilityLabel={[
              status === 'noGoal'
                ? t('diarySummary.macroNoGoalA11y', {
                    defaultValue: '{{label}} {{consumed}} grams',
                    label,
                    consumed: consumedText,
                  })
                : t('diarySummary.macroA11y', {
                    defaultValue: '{{label}} {{consumed}} of {{goal}} grams',
                    label,
                    consumed: consumedText,
                    goal: goalText,
                  }),
              statusText,
            ]
              .filter(Boolean)
              .join(', ')}
            testID={`diary-macro-${key}`}
          >
            <View className="flex-row justify-between items-baseline mb-1">
              <Text className="text-xs text-text-secondary" numberOfLines={1}>
                {label}
              </Text>
              {flagged && (
                <Text
                  className="text-[10px] font-bold"
                  style={{ color }}
                  testID={`diary-macro-${key}-status`}
                >
                  {statusText}
                </Text>
              )}
            </View>
            <View
              className="h-[5px] rounded-full overflow-hidden"
              style={{ backgroundColor: trackColor }}
            >
              <View
                className="h-[5px] rounded-full"
                style={{
                  width: `${macroGoalFill(consumed, goal) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </View>
            <Text
              className={`text-xs mt-1 ${flagged ? 'font-bold' : 'text-text-primary font-semibold'}`}
              style={flagged ? { color } : undefined}
              numberOfLines={1}
            >
              {status === 'noGoal'
                ? t('diarySummary.macroGrams', {
                    defaultValue: '{{consumed}}g',
                    consumed: consumedText,
                  })
                : t('diarySummary.macroOfGoal', {
                    defaultValue: '{{consumed}} / {{goal}}g',
                    consumed: consumedText,
                    goal: goalText,
                  })}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export default DiaryMacroGoalBars;
