import {
  addDays,
  FOOD_VARIANT_NUTRIENT_FIELDS,
  instantHourMinute,
  instantToDay,
  todayInZone,
} from '@workspace/shared';
import sheetExportRepository, {
  TABLE_TABS,
  type SheetExportRow,
} from '../../models/sheetExportRepository.js';
import reportRepository from '../../models/reportRepository.js';
import { getDailyExerciseCalorieSplitRange } from '../../models/exerciseEntry.js';
import { getUserGoalsForRange } from '../../services/goalService.js';
import customNutrientService from '../../services/customNutrientService.js';
import { loadUserTimezone } from '../../utils/timezoneLoader.js';

// Builds the tabs of the Google Sheets export: one header row plus one row
// per record, with plain values (numbers stay numbers) so an AI reading the
// sheet gets clean, typed columns.

export type CellValue = string | number | boolean;

export interface SheetTab {
  title: string;
  rows: CellValue[][];
}

// Google Sheets refuses a cell over 50,000 characters.
const MAX_CELL_CHARS = 50000;

const NUTRIENT_UNITS: Record<string, string> = {
  calories: 'kcal',
  protein: 'g',
  carbs: 'g',
  fat: 'g',
  saturated_fat: 'g',
  polyunsaturated_fat: 'g',
  monounsaturated_fat: 'g',
  trans_fat: 'g',
  cholesterol: 'mg',
  sodium: 'mg',
  potassium: 'mg',
  dietary_fiber: 'g',
  sugars: 'g',
  vitamin_a: 'µg',
  vitamin_c: 'mg',
  calcium: 'mg',
  iron: 'mg',
};

const nutrientHeader = (field: string): string =>
  NUTRIENT_UNITS[field] ? `${field} (${NUTRIENT_UNITS[field]})` : field;

// Ids and audit columns mean nothing outside the database.
const isHiddenColumn = (key: string): boolean =>
  key === 'id' ||
  key.endsWith('_id') ||
  key === 'images' ||
  key === 'image_url' ||
  key === 'instructions' ||
  key.endsWith('_iv') ||
  key.endsWith('_tag');

const truncate = (text: string): string =>
  text.length > MAX_CELL_CHARS ? text.slice(0, MAX_CELL_CHARS) : text;

/** Local "YYYY-MM-DD HH:MM" for a timestamp, in the person's timezone. */
export function formatInstant(value: Date, timezone: string): string {
  const { hour, minute } = instantHourMinute(value, timezone);
  return `${instantToDay(value, timezone)} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function toCell(value: unknown, timezone: string): CellValue {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : formatInstant(value, timezone);
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return truncate(value);
  if (typeof value === 'bigint') return Number(value);
  return truncate(JSON.stringify(value));
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const round = (value: number | null, places = 2): CellValue => {
  if (value === null) return '';
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const emptyTab = (title: string): SheetTab => ({
  title,
  rows: [['No data logged yet']],
});

/**
 * A tab with every visible column of the rows, in the order the first row
 * that has them lists them.
 */
export function buildTableTab(
  title: string,
  rows: SheetExportRow[],
  timezone: string
): SheetTab {
  if (rows.length === 0) return emptyTab(title);
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key) || isHiddenColumn(key)) continue;
      seen.add(key);
      columns.push(key);
    }
  }
  return {
    title,
    rows: [
      columns,
      ...rows.map((row) => columns.map((col) => toCell(row[col], timezone))),
    ],
  };
}

interface CustomNutrientDefinition {
  name: string;
  unit: string | null;
}

export function buildFoodLogTab(
  entries: SheetExportRow[],
  customNutrients: CustomNutrientDefinition[],
  timezone: string
): SheetTab {
  if (entries.length === 0) return emptyTab('Food log');
  const header: CellValue[] = [
    'date',
    'time',
    'meal_type',
    'meal_name',
    'food',
    'brand',
    'quantity',
    'unit',
    ...FOOD_VARIANT_NUTRIENT_FIELDS.map(nutrientHeader),
    'water_ml',
    'glycemic_index',
    ...customNutrients.map((cn) =>
      cn.unit ? `${cn.name} (${cn.unit})` : cn.name
    ),
    'notes',
    'logged_at',
  ];
  const rows = entries.map((entry) => {
    const servingSize = toNumber(entry.serving_size);
    const quantity = toNumber(entry.quantity) ?? 0;
    const scale = servingSize && servingSize > 0 ? quantity / servingSize : 1;
    const scaled = (value: unknown): CellValue => {
      const n = toNumber(value);
      return n === null ? '' : round(n * scale);
    };
    const custom = (entry.custom_nutrients ?? {}) as Record<string, unknown>;
    const time =
      typeof entry.entry_time === 'string' ? entry.entry_time.slice(0, 5) : '';
    return [
      toCell(entry.entry_date, timezone),
      time,
      toCell(entry.meal_type, timezone),
      toCell(entry.meal_name, timezone),
      toCell(entry.food_name, timezone),
      toCell(entry.brand_name, timezone),
      round(quantity),
      toCell(entry.unit, timezone),
      ...FOOD_VARIANT_NUTRIENT_FIELDS.map((field) => scaled(entry[field])),
      scaled(entry.water_ml),
      toCell(entry.glycemic_index, timezone),
      ...customNutrients.map((cn) => scaled(custom[cn.name])),
      toCell(entry.notes, timezone),
      toCell(entry.created_at, timezone),
    ];
  });
  return { title: 'Food log', rows: [header, ...rows] };
}

interface DailyTotalsRow {
  entry_date: string;
  [field: string]: unknown;
}

interface DailyGoals {
  calories?: unknown;
  protein?: unknown;
  carbs?: unknown;
  fat?: unknown;
  dietary_fiber?: unknown;
  water_goal_ml?: unknown;
}

const TOTAL_ALIASES: Record<string, string> = {
  dietary_fiber: 'fiber',
  sugars: 'sugar',
};

export function buildDailySummaryTab(
  days: string[],
  totals: DailyTotalsRow[],
  goals: Record<string, DailyGoals>,
  exercise: {
    entry_date: string;
    active_calories: number;
    other_calories: number;
  }[],
  water: SheetExportRow[]
): SheetTab {
  if (days.length === 0) return emptyTab('Daily summary');
  const totalsByDay = new Map(totals.map((t) => [String(t.entry_date), t]));
  const exerciseByDay = new Map(exercise.map((e) => [e.entry_date, e]));
  const waterByDay = new Map(
    water.map((w) => [String(w.entry_date), toNumber(w.water_ml)])
  );
  const header: CellValue[] = [
    'date',
    ...FOOD_VARIANT_NUTRIENT_FIELDS.map(nutrientHeader),
    'goal_calories (kcal)',
    'goal_protein (g)',
    'goal_carbs (g)',
    'goal_fat (g)',
    'goal_fiber (g)',
    'exercise_calories (kcal)',
    'active_calories (kcal)',
    'water_ml',
    'goal_water_ml',
  ];
  const rows = days.map((day) => {
    const total = totalsByDay.get(day);
    const goal = goals[day] ?? {};
    const ex = exerciseByDay.get(day);
    return [
      day,
      ...FOOD_VARIANT_NUTRIENT_FIELDS.map((field) =>
        round(toNumber(total?.[TOTAL_ALIASES[field] ?? field]) ?? 0)
      ),
      round(toNumber(goal.calories)),
      round(toNumber(goal.protein)),
      round(toNumber(goal.carbs)),
      round(toNumber(goal.fat)),
      round(toNumber(goal.dietary_fiber)),
      round(ex ? ex.other_calories : 0),
      round(ex ? ex.active_calories : 0),
      round(waterByDay.get(day) ?? 0),
      round(toNumber(goal.water_goal_ml)),
    ];
  });
  return { title: 'Daily summary', rows: [header, ...rows] };
}

/** Every calendar day from `start` to `end`, inclusive. */
export function daysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return days;
}

/** Reads everything the export holds for one person and lays out the tabs. */
export async function buildExportTabs(userId: string): Promise<SheetTab[]> {
  const timezone = await loadUserTimezone(userId);
  const today = todayInZone(timezone);
  const [foodEntries, exerciseEntries, strengthSets, customNutrients, first] =
    await Promise.all([
      sheetExportRepository.getFoodEntries(userId),
      sheetExportRepository.getExerciseEntries(userId),
      sheetExportRepository.getStrengthSets(userId),
      customNutrientService.getCustomNutrients(userId),
      sheetExportRepository.getFirstLoggedDay(userId),
    ]);
  const waterTab = TABLE_TABS.find((t) => t.title === 'Water');
  const waterRows = waterTab
    ? await sheetExportRepository.getTableRows(userId, waterTab)
    : [];

  let dailySummary: SheetTab = emptyTab('Daily summary');
  if (first && first <= today) {
    const [totals, goals, exercise] = await Promise.all([
      reportRepository.getDailyNutritionTotalsRange(userId, first, today),
      getUserGoalsForRange(userId, first, today, true),
      getDailyExerciseCalorieSplitRange(userId, first, today),
    ]);
    dailySummary = buildDailySummaryTab(
      daysBetween(first, today),
      totals.map((t: SheetExportRow) => ({
        ...t,
        entry_date: String(t.entry_date).slice(0, 10),
      })),
      goals as Record<string, DailyGoals>,
      exercise,
      waterRows
    );
  }

  const tabs: SheetTab[] = [
    buildFoodLogTab(
      foodEntries,
      (customNutrients as CustomNutrientDefinition[]).map((cn) => ({
        name: cn.name,
        unit: cn.unit,
      })),
      timezone
    ),
    dailySummary,
    buildTableTab('Workouts', exerciseEntries, timezone),
    buildTableTab('Strength sets', strengthSets, timezone),
  ];
  for (const tab of TABLE_TABS) {
    const rows =
      tab === waterTab
        ? waterRows
        : await sheetExportRepository.getTableRows(userId, tab);
    tabs.push(buildTableTab(tab.title, rows, timezone));
  }
  return tabs;
}
