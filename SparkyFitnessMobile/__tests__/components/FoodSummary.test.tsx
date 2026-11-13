import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import FoodSummary from '../../src/components/FoodSummary';
import type { DailyGoals } from '../../src/types/goals';
import type { FoodEntry } from '../../src/types/foodEntries';
import type { MealType } from '../../src/types/mealTypes';

jest.mock('../../src/components/Icon', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ name }: { name: string }) => <View testID={`icon-${name}`} />,
  };
});

jest.mock('../../src/components/SwipeableFoodRow', () => {
  const { Pressable } = require('react-native');
  return {
    __esModule: true,
    default: ({
      entry,
      selectionMode,
      selected,
      onToggleSelect,
    }: {
      entry: { id: string };
      selectionMode?: boolean;
      selected?: boolean;
      onToggleSelect?: (e: { id: string }) => void;
    }) => (
      <Pressable
        testID="food-row"
        accessibilityLabel={`row-${entry.id}${selectionMode ? (selected ? '-on' : '-off') : ''}`}
        onPress={() => selectionMode && onToggleSelect?.(entry)}
      />
    ),
  };
});

const mockCopyFoods = jest.fn();
jest.mock('../../src/hooks/useCopySelectedFoods', () => ({
  useCopySelectedFoods: () => ({ copyFoods: mockCopyFoods, isPending: false }),
}));

const mockPresent = jest.fn();
jest.mock('../../src/components/CopyMealSheet', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    __esModule: true,
    default: React.forwardRef(
      (
        { onCopy }: { onCopy: (payloads: unknown[], target: unknown) => void },
        ref: React.Ref<unknown>
      ) => {
        React.useImperativeHandle(ref, () => ({
          present: mockPresent,
          dismiss: jest.fn(),
        }));
        return (
          <Pressable
            accessibilityLabel="sheet-copy"
            onPress={() =>
              onCopy(
                [{ targetDate: '2026-05-16' }, { targetDate: '2026-05-17' }],
                { targetMealTypeId: null, quickTarget: null }
              )
            }
          />
        );
      }
    ),
  };
});

const mealTypes: MealType[] = [
  {
    id: 'sys-b',
    name: 'breakfast',
    sort_order: 0,
    user_id: null,
    created_at: '',
    is_visible: true,
    show_in_quick_log: true,
  },
  {
    id: 'sys-l',
    name: 'lunch',
    sort_order: 1,
    user_id: null,
    created_at: '',
    is_visible: true,
    show_in_quick_log: true,
  },
  {
    id: 'custom-pw',
    name: 'Pre-Workout',
    sort_order: 0,
    user_id: 'user1',
    created_at: '',
    is_visible: true,
    show_in_quick_log: true,
  },
  {
    id: 'custom-ps',
    name: 'Post-Workout',
    sort_order: 5,
    user_id: 'user1',
    created_at: '',
    is_visible: true,
    show_in_quick_log: true,
  },
  // A CUSTOM category deliberately named like the system type.
  {
    id: 'custom-b',
    name: 'breakfast',
    sort_order: 0,
    user_id: 'user1',
    created_at: '',
    is_visible: true,
    show_in_quick_log: true,
  },
];

const entry = (
  id: string,
  meal_type_id: string,
  meal_type: string
): FoodEntry => ({ id, meal_type_id, meal_type }) as FoodEntry;

describe('FoodSummary', () => {
  it('renders custom meal types as their own sections (not merged into Other)', () => {
    const view = render(
      <FoodSummary
        foodEntries={[
          entry('1', 'custom-pw', 'Pre-Workout'),
          entry('2', 'custom-ps', 'Post-Workout'),
        ]}
        mealTypes={mealTypes}
      />
    );

    expect(view.getByText('Pre-Workout')).toBeTruthy();
    expect(view.getByText('Post-Workout')).toBeTruthy();
    expect(view.queryByText('Other')).toBeNull();
  });

  it('orders sections by sort_order and renders system labels with canonical English labels', () => {
    const view = render(
      <FoodSummary
        foodEntries={[
          entry('1', 'sys-l', 'lunch'),
          entry('2', 'sys-b', 'breakfast'),
          entry('3', 'custom-ps', 'Post-Workout'),
        ]}
        mealTypes={mealTypes}
      />
    );

    // breakfast (0), Pre-Workout (0), lunch (1), Post-Workout (5) — but only
    // sections with entries render; stable sort keeps breakfast before lunch.
    const texts = view
      .getAllByText(/Breakfast|Lunch|Post-Workout/)
      .map((n) => n.props.children);
    expect(texts).toEqual(['Breakfast', 'Lunch', 'Post-Workout']);
  });

  it('keeps hidden/deleted type entries visible in their own literal group', () => {
    const view = render(
      <FoodSummary
        foodEntries={[entry('1', 'gone-id', 'Deleted Meal')]}
        mealTypes={mealTypes}
      />
    );

    expect(view.getByText('Deleted Meal')).toBeTruthy();
    expect(view.queryByText('Other')).toBeNull();
  });

  it('passes the canonical meal type id and name when a section is pressed', () => {
    const onPressMealType = jest.fn();
    const view = render(
      <FoodSummary
        foodEntries={[entry('1', 'custom-pw', 'Pre-Workout')]}
        mealTypes={mealTypes}
        onPressMealType={onPressMealType}
      />
    );

    fireEvent.press(view.getByText('Pre-Workout'));
    expect(onPressMealType).toHaveBeenCalledWith(
      'custom-pw',
      'Pre-Workout',
      expect.any(Array)
    );
  });

  it('renders a custom category named breakfast literally (not the canonical Breakfast)', () => {
    const view = render(
      <FoodSummary
        foodEntries={[entry('1', 'custom-b', 'breakfast')]}
        mealTypes={mealTypes}
      />
    );

    expect(view.getByText('breakfast')).toBeTruthy();
    expect(view.queryByText('Breakfast')).toBeNull();
  });

  it('uses the neutral icon for a custom category named breakfast', () => {
    const view = render(
      <FoodSummary
        foodEntries={[entry('1', 'custom-b', 'breakfast')]}
        mealTypes={mealTypes}
      />
    );

    // The custom group renders the neutral snack icon, not the system
    // breakfast icon.
    expect(view.queryByTestId('icon-meal-breakfast')).toBeNull();
    expect(view.getByTestId('icon-meal-snack')).toBeTruthy();
  });

  it('system breakfast receives the configured target calories', () => {
    const goals = { breakfast_percentage: 25 } as DailyGoals;
    const { getByText } = render(
      <FoodSummary
        foodEntries={[entry('e1', 'sys-b', 'breakfast')]}
        mealTypes={mealTypes}
        goals={goals}
        calorieGoal={2000}
      />
    );
    // 25% of 2000 = 500 Cal target shown alongside the meal calories.
    expect(getByText(/\/ 500/)).toBeTruthy();
  });

  it('a CUSTOM type named breakfast never inherits the system target calories', () => {
    const goals = { breakfast_percentage: 25 } as DailyGoals;
    const { queryByText } = render(
      <FoodSummary
        foodEntries={[entry('e2', 'custom-b', 'breakfast')]}
        mealTypes={mealTypes}
        goals={goals}
        calorieGoal={2000}
      />
    );
    // No target chip — the custom category must not receive the system Breakfast target.
    expect(queryByText(/\/ 500/)).toBeNull();
    expect(queryByText(/\/ \d+/)).toBeNull();
  });

  it('a custom type shows the target calories configured for it', () => {
    const goals = {
      custom_meal_percentages: { 'pre-workout': 20 },
    } as DailyGoals;
    const { queryByText } = render(
      <FoodSummary
        foodEntries={[entry('e4', 'custom-pw', 'Pre-Workout')]}
        mealTypes={mealTypes}
        goals={goals}
        calorieGoal={2000}
      />
    );
    expect(queryByText(/\/ 400/)).not.toBeNull();
  });

  it('a historical (unresolved) group never inherits target calories', () => {
    const goals = { breakfast_percentage: 25 } as DailyGoals;
    const { queryByText } = render(
      <FoodSummary
        // A deleted/unknown custom name with no id: falls into its own literal
        // historical group (isSystem=false) and must not receive any target.
        foodEntries={[
          {
            id: 'e3',
            meal_type_id: null,
            meal_type: 'my deleted custom',
          } as FoodEntry,
        ]}
        mealTypes={mealTypes}
        goals={goals}
        calorieGoal={2000}
      />
    );
    expect(queryByText(/\/ 500/)).toBeNull();
  });

  it('copies the picked foods to each day, each keeping its own meal', () => {
    const foods = [
      { ...entry('e1', 'sys-b', 'breakfast'), entry_date: '2026-05-15' },
      { ...entry('e2', 'sys-l', 'lunch'), entry_date: '2026-05-15' },
      { ...entry('e3', 'sys-l', 'lunch'), entry_date: '2026-05-15' },
    ] as FoodEntry[];
    const { getByText, getByLabelText } = render(
      <FoodSummary foodEntries={foods} mealTypes={mealTypes} />
    );

    fireEvent.press(getByText('Select'));
    fireEvent.press(getByLabelText('row-e1-off'));
    fireEvent.press(getByLabelText('row-e3-off'));
    expect(getByText('2 selected')).toBeTruthy();

    fireEvent.press(getByText('Copy'));
    expect(mockPresent).toHaveBeenCalledWith('2026-05-15', null, '', {
      count: 2,
    });

    fireEvent.press(getByLabelText('sheet-copy'));
    expect(mockCopyFoods).toHaveBeenCalledWith([
      { entry: foods[0], targetDate: '2026-05-16', targetMealTypeId: 'sys-b' },
      { entry: foods[2], targetDate: '2026-05-16', targetMealTypeId: 'sys-l' },
      { entry: foods[0], targetDate: '2026-05-17', targetMealTypeId: 'sys-b' },
      { entry: foods[2], targetDate: '2026-05-17', targetMealTypeId: 'sys-l' },
    ]);
  });
});
