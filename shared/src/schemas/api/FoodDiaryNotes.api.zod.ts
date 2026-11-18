import { z } from 'zod';
import { isDayString } from '../../utils/timezone.ts';

/** Longest note the server stores, in characters. */
export const FOOD_DIARY_NOTE_MAX_LENGTH = 5000;

const diaryDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isDayString, { message: 'Not a real calendar day.' });

export const foodDiaryNoteQuerySchema = z.object({
  /** The diary day (YYYY-MM-DD). */
  date: diaryDaySchema,
});
export type FoodDiaryNoteQuery = z.infer<typeof foodDiaryNoteQuerySchema>;

export const upsertFoodDiaryNoteBodySchema = z.object({
  date: diaryDaySchema,
  /** The note text. Blank (or only whitespace) clears the day's note. */
  note: z
    .string()
    .max(FOOD_DIARY_NOTE_MAX_LENGTH)
    // PostgreSQL text cannot hold U+0000.
    .refine((text) => !text.includes('\u0000'), {
      message: 'The note contains a character that cannot be saved.',
    }),
});
export type UpsertFoodDiaryNoteBody = z.infer<
  typeof upsertFoodDiaryNoteBodySchema
>;

export const foodDiaryNoteResponseSchema = z.object({
  date: diaryDaySchema,
  /** The day's note, or null when there is none. */
  note: z.string().nullable(),
  /** When the note was last saved, or null when there is none. */
  updated_at: z.string().nullable(),
});
export type FoodDiaryNote = z.infer<typeof foodDiaryNoteResponseSchema>;
