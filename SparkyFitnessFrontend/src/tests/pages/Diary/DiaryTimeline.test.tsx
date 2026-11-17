import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DiaryTimeline from '@/pages/Diary/DiaryTimeline';
import type { FoodEntry } from '@/types/food';
import type { FoodEntryMeal } from '@/types/meal';

jest.mock('react-i18next', () =>
  jest.requireActual('@/tests/mocks/reactI18next')
);

jest.mock('@/contexts/PreferencesContext', () => ({
  usePreferences: () => ({
    timeFormat: '24h',
    energyUnit: 'kcal',
    convertEnergy: (value: number) => value,
    getDateRelationToToday: () => 'today',
  }),
}));

jest.mock('@/components/FoodSearch/FoodSearch', () => ({
  __esModule: true,
  default: () => null,
}));

const food = (id: string, name: string, time: string) =>
  ({
    id,
    food_name: name,
    meal_type: 'breakfast',
    meal_type_id: 'b',
    entry_date: '2026-05-15',
    entry_time: time,
    quantity: 1,
    unit: 'g',
  }) as unknown as FoodEntry;

const loggedMeal = {
  id: 'm1',
  name: 'Smoothie bowl',
  meal_type: 'breakfast',
  meal_type_id: 'b',
  entry_date: '2026-05-15',
  entry_time: '08:30',
  quantity: 1,
  unit: 'serving',
} as unknown as FoodEntryMeal;

describe('DiaryTimeline select and copy', () => {
  it('copies only the picked foods and leaves logged meals out', () => {
    const onCopyEntries = jest.fn();
    const onEditEntry = jest.fn();
    const foods = [
      food('f1', 'Coffee', '08:00'),
      food('f2', 'Toast', '08:10'),
      food('f3', 'Apple', '10:00'),
    ];
    render(
      <DiaryTimeline
        selectedDate="2026-05-15"
        foodEntries={foods}
        foodEntryMeals={[loggedMeal]}
        mealTypes={[
          { name: 'breakfast', sort_order: 0, default_time: '08:00' },
        ]}
        onFoodSelect={jest.fn()}
        onEditEntry={onEditEntry}
        onRemoveEntry={jest.fn()}
        getEntryNutrition={() => ({
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        })}
        onCopyEntries={onCopyEntries}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Select/ }));
    expect(
      screen.getByRole('checkbox', { name: 'Select Smoothie bowl' })
    ).toBeDisabled();

    fireEvent.click(screen.getByText('Coffee'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Apple' }));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(onEditEntry).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^Copy$/ }));
    expect(onCopyEntries).toHaveBeenCalledWith([foods[0], foods[2]]);
    // Copying ends select mode.
    expect(screen.queryByText('2 selected')).toBeNull();
  });
});
