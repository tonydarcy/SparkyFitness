import { getClient } from '../db/poolManager.js';
import { supplementCountable } from './supplementSql.js';

// Read-only queries behind the Google Sheets export. Every query runs on the
// person's own RLS client and also filters on user_id, so a family member's
// shared rows never reach the person's spreadsheet.

export type SheetExportRow = Record<string, unknown>;

/**
 * A tab copied straight from a table: every column except ids and audit
 * columns, so a column added later shows up without a code change.
 */
export interface TableTabDefinition {
  title: string;
  sql: string;
}

// Health and wellbeing tables exported one row per record. Cycle and pregnancy
// tables are left out on purpose: they are the most sensitive data the app
// holds and a spreadsheet is easy to share by accident.
export const TABLE_TABS: readonly TableTabDefinition[] = [
  {
    title: 'Body',
    sql: `SELECT * FROM check_in_measurements
           WHERE user_id = $1 ORDER BY entry_date`,
  },
  {
    title: 'Custom measurements',
    sql: `SELECT COALESCE(cc.display_name, cc.name) AS measurement,
                 cc.measurement_type AS unit, cm.*
            FROM custom_measurements cm
            JOIN custom_categories cc ON cc.id = cm.category_id
           WHERE cm.user_id = $1
           ORDER BY cm.entry_date, cm.entry_timestamp`,
  },
  {
    title: 'Sleep',
    sql: `SELECT * FROM sleep_entries
           WHERE user_id = $1 ORDER BY entry_date, bedtime`,
  },
  {
    title: 'Daily activity',
    sql: `SELECT * FROM daily_health_metrics
           WHERE user_id = $1 ORDER BY entry_date, source_provider`,
  },
  {
    title: 'Vitals',
    sql: `SELECT * FROM vitals_entries
           WHERE user_id = $1 ORDER BY entry_date, timestamp`,
  },
  {
    title: 'Water',
    sql: `SELECT * FROM water_intake
           WHERE user_id = $1 ORDER BY entry_date`,
  },
  {
    title: 'Mood',
    sql: `SELECT * FROM mood_entries
           WHERE user_id = $1 ORDER BY entry_date, entry_timestamp`,
  },
  {
    title: 'Fasting',
    sql: `SELECT * FROM fasting_logs
           WHERE user_id = $1 ORDER BY start_time`,
  },
  {
    title: 'Mindfulness',
    sql: `SELECT * FROM mindfulness_sessions
           WHERE user_id = $1 ORDER BY entry_date, start_time`,
  },
  {
    title: 'Medications',
    sql: `SELECT * FROM medication_entries
           WHERE user_id = $1 ORDER BY entry_date, taken_at`,
  },
  {
    title: 'Symptoms',
    sql: `SELECT * FROM symptom_entries
           WHERE user_id = $1 AND source IS DISTINCT FROM 'cycle'
           ORDER BY entry_date, logged_at`,
  },
  {
    title: 'Lab results',
    sql: `SELECT COALESCE(lm.name, lr.marker_key) AS marker, lr.*
            FROM lab_results lr
            LEFT JOIN lab_markers lm ON lm.id = lr.custom_marker_id
           WHERE lr.user_id = $1
           ORDER BY lr.entry_date`,
  },
];

async function query(
  userId: string,
  sql: string,
  params: unknown[] = []
): Promise<SheetExportRow[]> {
  const client = await getClient(userId);
  try {
    const result = await client.query(sql, [userId, ...params]);
    return result.rows as SheetExportRow[];
  } finally {
    client.release();
  }
}

async function getTableRows(
  userId: string,
  tab: TableTabDefinition
): Promise<SheetExportRow[]> {
  return query(userId, tab.sql);
}

// Food entries keep per-serving values; the export scales them by
// quantity / serving_size so each row shows what was eaten.
async function getFoodEntries(userId: string): Promise<SheetExportRow[]> {
  return query(
    userId,
    `SELECT fe.*, mt.name AS meal_type, fem.name AS meal_name
       FROM food_entries fe
       LEFT JOIN meal_types mt ON mt.id = fe.meal_type_id
       LEFT JOIN food_entry_meals fem ON fem.id = fe.food_entry_meal_id
      WHERE fe.user_id = $1
      ORDER BY fe.entry_date, fe.entry_time NULLS LAST, fe.created_at`
  );
}

async function getExerciseEntries(userId: string): Promise<SheetExportRow[]> {
  return query(
    userId,
    `SELECT * FROM exercise_entries
      WHERE user_id = $1
      ORDER BY entry_date, entry_time NULLS LAST, created_at`
  );
}

async function getStrengthSets(userId: string): Promise<SheetExportRow[]> {
  return query(
    userId,
    `SELECT ee.entry_date, ee.entry_time, ee.exercise_name,
            ee.category, ees.set_number, ees.set_type, ees.reps,
            ees.weight AS weight_kg, ees.duration AS duration_seconds,
            ees.distance AS distance_km, ees.rpe, ees.rir,
            ees.rest_time AS rest_seconds, ees.is_pr, ees.notes
       FROM exercise_entry_sets ees
       JOIN exercise_entries ee ON ee.id = ees.exercise_entry_id
      WHERE ee.user_id = $1
      ORDER BY ee.entry_date, ee.entry_time NULLS LAST, ee.created_at,
               ees.set_number`
  );
}

async function getFirstLoggedDay(userId: string): Promise<string | null> {
  const rows = await query(
    userId,
    `SELECT MIN(d)::text AS first_day FROM (
       SELECT MIN(entry_date) AS d FROM food_entries WHERE user_id = $1
       UNION ALL
       SELECT MIN(entry_date) FROM exercise_entries WHERE user_id = $1
       UNION ALL
       SELECT MIN(entry_date) FROM water_intake WHERE user_id = $1
       UNION ALL
       -- Taken supplements count towards the daily nutrition totals too.
       SELECT MIN(me.entry_date) FROM medication_entries me
        WHERE me.user_id = $1 AND ${supplementCountable('me')}
     ) days`
  );
  return (rows[0]?.first_day as string | null) ?? null;
}

export default {
  getTableRows,
  getFoodEntries,
  getExerciseEntries,
  getStrengthSets,
  getFirstLoggedDay,
};
