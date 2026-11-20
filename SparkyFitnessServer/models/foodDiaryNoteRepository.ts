import { getClient } from '../db/poolManager.js';
import type { FoodDiaryNote } from '@workspace/shared';

interface NoteRow {
  note: string;
  updated_at: Date | string;
}

function toResponse(date: string, row: NoteRow | undefined): FoodDiaryNote {
  return {
    date,
    note: row ? row.note : null,
    updated_at: row ? new Date(row.updated_at).toISOString() : null,
  };
}

/** The person's note for one diary day, or a null note when there is none. */
export async function getFoodDiaryNote(
  userId: string,
  date: string,
  authenticatedUserId?: string
): Promise<FoodDiaryNote> {
  const client = await getClient(userId, authenticatedUserId);
  try {
    const result = await client.query(
      `SELECT note, updated_at FROM food_diary_notes
        WHERE user_id = $1 AND entry_date = $2`,
      [userId, date]
    );
    return toResponse(date, result.rows[0]);
  } finally {
    client.release();
  }
}

/**
 * Saves the day's note. A blank note deletes it, so an empty row is never
 * kept. Surrounding whitespace is trimmed; line breaks inside are kept.
 */
export async function saveFoodDiaryNote(
  userId: string,
  date: string,
  note: string,
  authenticatedUserId?: string
): Promise<FoodDiaryNote> {
  const actorId = authenticatedUserId ?? userId;
  const text = note.trim();
  const client = await getClient(userId, authenticatedUserId);
  try {
    if (!text) {
      await client.query(
        'DELETE FROM food_diary_notes WHERE user_id = $1 AND entry_date = $2',
        [userId, date]
      );
      return toResponse(date, undefined);
    }
    const result = await client.query(
      `INSERT INTO food_diary_notes
         (user_id, entry_date, note, created_by_user_id, updated_by_user_id)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT ON CONSTRAINT uq_food_diary_notes_user_date DO UPDATE SET
         note = EXCLUDED.note,
         updated_by_user_id = EXCLUDED.updated_by_user_id,
         updated_at = NOW()
       RETURNING note, updated_at`,
      [userId, date, text, actorId]
    );
    return toResponse(date, result.rows[0]);
  } finally {
    client.release();
  }
}
