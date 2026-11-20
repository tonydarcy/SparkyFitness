import type { FoodDiaryNote } from '@workspace/shared';
import { apiFetch } from './apiClient';
import { ApiError } from './errors';

const SERVICE = 'Food Diary Notes API';

/**
 * The note for a diary day, or null when the server predates day notes (it
 * answers 404), so the diary can leave the note out instead of erroring.
 */
export async function fetchFoodDiaryNote(
  date: string
): Promise<FoodDiaryNote | null> {
  try {
    return await apiFetch<FoodDiaryNote>({
      endpoint: `/api/v2/food-diary-notes?${new URLSearchParams({ date })}`,
      serviceName: SERVICE,
      operation: 'fetch day note',
      logResponseBody: false,
    });
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

/** Saves the day's note; a blank note deletes it. */
export const saveFoodDiaryNote = (
  date: string,
  note: string
): Promise<FoodDiaryNote> =>
  apiFetch<FoodDiaryNote>({
    endpoint: '/api/v2/food-diary-notes',
    method: 'PUT',
    body: { date, note },
    serviceName: SERVICE,
    operation: 'save day note',
    logResponseBody: false,
  });
