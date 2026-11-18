import { api } from '@/api/api';
import type { FoodDiaryNote } from '@workspace/shared';

export const getFoodDiaryNote = (date: string): Promise<FoodDiaryNote> =>
  api.get('/v2/food-diary-notes', { params: { date } });

export const saveFoodDiaryNote = (
  date: string,
  note: string
): Promise<FoodDiaryNote> =>
  api.put('/v2/food-diary-notes', { body: { date, note } });
