import { renderHook, waitFor, act } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import { useCopySelectedFoods } from '../../src/hooks/useCopySelectedFoods';
import { createFoodEntry } from '../../src/services/api/foodEntriesApi';
import type { FoodEntry } from '../../src/types/foodEntries';
import {
  createTestQueryClient,
  createQueryWrapper,
  type QueryClient,
} from './queryTestUtils';

jest.mock('../../src/services/api/foodEntriesApi', () => ({
  createFoodEntry: jest.fn(),
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
});
