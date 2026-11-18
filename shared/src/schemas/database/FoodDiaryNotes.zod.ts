import { z } from 'zod';

export const foodDiaryNotesIdSchema = z.string();

export const foodDiaryNotesSchema = z.object({
  id: foodDiaryNotesIdSchema,
  user_id: z.string(),
  entry_date: z.coerce.date(),
  note: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  created_by_user_id: z.string().nullable(),
  updated_by_user_id: z.string().nullable(),
});

export const foodDiaryNotesInitializerSchema = z.object({
  id: foodDiaryNotesIdSchema.optional(),
  user_id: z.string(),
  entry_date: z.coerce.date(),
  note: z.string(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by_user_id: z.string().nullable().optional(),
  updated_by_user_id: z.string().nullable().optional(),
});

export const foodDiaryNotesMutatorSchema = z.object({
  id: foodDiaryNotesIdSchema.optional(),
  user_id: z.string().optional(),
  entry_date: z.coerce.date().optional(),
  note: z.string().optional(),
  created_at: z.coerce.date().optional(),
  updated_at: z.coerce.date().optional(),
  created_by_user_id: z.string().nullable().optional(),
  updated_by_user_id: z.string().nullable().optional(),
});

export type FoodDiaryNotesRow = z.infer<typeof foodDiaryNotesSchema>;
export type FoodDiaryNotesInitializer = z.infer<
  typeof foodDiaryNotesInitializerSchema
>;
export type FoodDiaryNotesMutator = z.infer<typeof foodDiaryNotesMutatorSchema>;
