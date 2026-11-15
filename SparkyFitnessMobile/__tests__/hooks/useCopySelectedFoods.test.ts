import { renderHook, waitFor, act } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import { useCopySelectedFoods } from '../../src/hooks/useCopySelectedFoods';
import { createFoodEntry } from '../../src/services/api/foodEntriesApi';
import {
  createFoodEntryMeal,
  getFoodEntryMealWithComponents,
} from '../../src/services/api/foodEntryMealsApi';
import type { FoodEntry } from '../../src/types/foodEntries';
import type { FoodEntryMeal } from '../../src/types/foodEntryMeals';
import {
  createTestQueryClient,
  createQueryWrapper,
  type QueryClient,
} from './queryTestUtils';

jest.mock('../../src/services/api/foodEntriesApi', () => ({
  createFoodEntry: jest.fn(),
}));

jest.mock('../../src/services/api/foodEntryMealsApi', () => ({
  createFoodEntryMeal: jest.fn(),
  getFoodEntryMealWithComponents: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

const mockCreateFoodEntry = createFoodEntry as jest.MockedFunction<
  typeof createFoodEntry
>;

const food = (id: string, mealTypeId: string) =>
  ({
    id,
    food_name: id,
    quantity: 1,
    unit: 'g',
    meal_type_id: mealTypeId,
    entry_date: '2026-05-15',
  }) as unknown as FoodEntry;

describe('useCopySelectedFoods', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  test('logs every copy and keeps going when one fails', async () => {
    mockCreateFoodEntry
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({} as never);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useCopySelectedFoods({ onSuccess }), {
      wrapper: createQueryWrapper(queryClient),
    });

    act(() => {
      result.current.copyFoods([
        {
          entry: food('a', 'b-id'),
          targetDate: '2026-05-16',
          targetMealTypeId: 'b-id',
        },
        {
          entry: food('b', 'l-id'),
          targetDate: '2026-05-16',
          targetMealTypeId: 'l-id',
        },
        {
          entry: food('c', 'l-id'),
          targetDate: '2026-05-16',
          targetMealTypeId: 'l-id',
          entryTime: '09:30',
        },
      ]);
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(mockCreateFoodEntry).toHaveBeenCalledTimes(3);
    expect(mockCreateFoodEntry.mock.calls[2]![0]).toMatchObject({
      meal_type_id: 'l-id',
      entry_date: '2026-05-16',
      entry_time: '09:30',
    });
    expect(Toast.show).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        text1: 'Copied 2 of 3 foods',
      })
    );
  });

  test('reports a failure when nothing was copied', async () => {
    mockCreateFoodEntry.mockRejectedValue(new Error('boom'));
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useCopySelectedFoods({ onSuccess }), {
      wrapper: createQueryWrapper(queryClient),
    });

    act(() => {
      result.current.copyFoods([
        {
          entry: food('a', 'b-id'),
          targetDate: '2026-05-16',
          targetMealTypeId: 'b-id',
        },
      ]);
    });

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        expect.objectContaining({ text1: 'Failed to copy foods' })
      )
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test('copies a logged meal whole, reading it once for several days', async () => {
    const meal = {
      id: 'meal-1',
      meal_template_id: 'tpl-1',
      meal_type: 'Lunch',
      meal_type_id: 'l-id',
      entry_date: '2026-05-15',
      entry_time: '12:30:00',
      name: 'Chicken bowl',
      description: null,
      notes: 'extra sauce',
      quantity: 2,
      unit: 'serving',
      entry_total_servings: 4,
      foods: [
        {
          food_id: 'f-1',
          food_name: 'Chicken',
          variant_id: 'v-1',
          quantity: 200,
          unit: 'g',
          serving_size: 100,
          serving_unit: 'g',
          calories: 165,
        },
      ],
    } as unknown as FoodEntryMeal;
    (getFoodEntryMealWithComponents as jest.Mock).mockResolvedValue(meal);
    (createFoodEntryMeal as jest.Mock).mockResolvedValue({});
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useCopySelectedFoods({ onSuccess }), {
      wrapper: createQueryWrapper(queryClient),
    });
    const row = {
      ...food('meal-1', 'l-id'),
      food_entry_meal_id: 'meal-1',
    } as FoodEntry;

    act(() => {
      result.current.copyFoods([
        { entry: row, targetDate: '2026-05-16', targetMealTypeId: 'd-id' },
        { entry: row, targetDate: '2026-05-17', targetMealTypeId: 'd-id' },
      ]);
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(getFoodEntryMealWithComponents).toHaveBeenCalledTimes(1);
    expect(mockCreateFoodEntry).not.toHaveBeenCalled();
    expect(createFoodEntryMeal).toHaveBeenCalledTimes(2);
    const payload = (createFoodEntryMeal as jest.Mock).mock.calls[1][0];
    expect(payload).toMatchObject({
      meal_template_id: 'tpl-1',
      meal_type_id: 'd-id',
      entry_date: '2026-05-17',
      entry_time: '12:30:00',
      name: 'Chicken bowl',
      notes: 'extra sauce',
      quantity: 2,
      unit: 'serving',
      entry_total_servings: 4,
    });
    expect(payload.foods).toHaveLength(1);
    expect(payload.foods[0]).toMatchObject({
      food_id: 'f-1',
      variant_id: 'v-1',
      quantity: 200,
      unit: 'g',
    });
    expect(payload.foods[0]).not.toHaveProperty('brand');
  });
});
