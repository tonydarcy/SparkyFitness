import { vi, beforeEach, describe, expect, it } from 'vitest';
import axios from 'axios';
import {
  buildDailySummaryTab,
  buildFoodLogTab,
  buildTableTab,
  daysBetween,
  toCell,
} from '../integrations/googlesheets/googleSheetsExport.js';
import {
  spreadsheetIdFromUrl,
  tabRange,
  withSheetsRetry,
  writeTabs,
} from '../integrations/googlesheets/googleSheetsService.js';

vi.mock('../config/logging.js', () => ({ log: vi.fn() }));
vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

const TZ = 'Pacific/Auckland';

describe('Google Sheets export tabs', () => {
  it('scales food entries to what was eaten and adds custom nutrients', () => {
    const tab = buildFoodLogTab(
      [
        {
          entry_date: '2026-11-13',
          entry_time: '07:30:00',
          meal_type: 'breakfast',
          food_name: 'Oats',
          brand_name: null,
          quantity: 80,
          serving_size: 40,
          unit: 'g',
          calories: 150,
          protein: 5,
          custom_nutrients: { Omega3: 0.1 },
          created_at: new Date('2026-11-12T18:31:00Z'),
        },
      ],
      [{ name: 'Omega3', unit: 'g' }],
      TZ
    );
    const [header, row] = tab.rows;
    const col = (name: string) => row[header.indexOf(name)];
    expect(tab.title).toBe('Food log');
    expect(col('date')).toBe('2026-11-13');
    expect(col('time')).toBe('07:30');
    expect(col('calories (kcal)')).toBe(300);
    expect(col('protein (g)')).toBe(10);
    expect(col('carbs (g)')).toBe('');
    expect(col('Omega3 (g)')).toBe(0.2);
    // Timestamps are shown in the person's own timezone, not UTC.
    expect(col('logged_at')).toBe('2026-11-13 07:31');
  });

  it('copies table rows without ids or audit columns', () => {
    const tab = buildTableTab(
      'Body',
      [
        {
          id: 'x',
          user_id: 'u',
          created_by_user_id: 'u',
          entry_date: '2026-11-01',
          weight: 80.5,
          tags: ['a'],
        },
      ],
      TZ
    );
    expect(tab.rows).toEqual([
      ['entry_date', 'weight', 'tags'],
      ['2026-11-01', 80.5, '["a"]'],
    ]);
  });

  it('says so when a tab has no data', () => {
    expect(buildTableTab('Sleep', [], TZ).rows).toEqual([
      ['No data logged yet'],
    ]);
  });

  it('lays out one daily summary row per day, including empty days', () => {
    const tab = buildDailySummaryTab(
      daysBetween('2026-11-01', '2026-11-02'),
      [{ entry_date: '2026-11-01', calories: 2000, fiber: 30 }],
      { '2026-11-01': { calories: 2200, water_goal_ml: 2500 } },
      [{ entry_date: '2026-11-01', active_calories: 400, other_calories: 300 }],
      [{ entry_date: '2026-11-02', water_ml: 1500 }]
    );
    const [header, day1, day2] = tab.rows;
    const col = (row: unknown[], name: string) => row[header.indexOf(name)];
    expect(col(day1, 'calories (kcal)')).toBe(2000);
    expect(col(day1, 'dietary_fiber (g)')).toBe(30);
    expect(col(day1, 'goal_calories (kcal)')).toBe(2200);
    expect(col(day1, 'exercise_calories (kcal)')).toBe(300);
    expect(col(day2, 'date')).toBe('2026-11-02');
    expect(col(day2, 'calories (kcal)')).toBe(0);
    expect(col(day2, 'water_ml')).toBe(1500);
  });

  it('truncates cells to the Sheets limit', () => {
    expect((toCell('x'.repeat(60000), TZ) as string).length).toBe(50000);
  });
});

describe('Google Sheets writer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.post).mockResolvedValue({ data: {} });
  });

  it('reads the spreadsheet id from its URL and quotes tab titles', () => {
    expect(
      spreadsheetIdFromUrl(
        'https://docs.google.com/spreadsheets/d/abc_1-2/edit'
      )
    ).toBe('abc_1-2');
    expect(spreadsheetIdFromUrl(null)).toBeNull();
    expect(tabRange("Tony's tab", 'A1')).toBe("'Tony''s tab'!A1");
  });

  it("resizes its own tabs, adds new ones beside the person's, clears and rewrites them", async () => {
    await writeTabs(
      'token',
      'sheet-1',
      [
        { sheetId: 7, title: 'My food', exportTab: 'Food log' },
        { sheetId: 9, title: 'Sleep', exportTab: null },
      ],
      [
        {
          title: 'Food log',
          rows: [
            ['a', 'b'],
            [1, 2],
          ],
        },
        { title: 'Sleep', rows: [['No data logged yet']] },
      ]
    );
    const calls = vi.mocked(axios.post).mock.calls;
    const [batchUrl, batchBody] = calls[0];
    expect(batchUrl).toContain('sheet-1:batchUpdate');
    expect(batchBody).toEqual({
      requests: [
        {
          updateSheetProperties: expect.objectContaining({
            properties: {
              sheetId: 7,
              gridProperties: {
                rowCount: 2,
                columnCount: 2,
                frozenRowCount: 1,
              },
            },
          }),
        },
        {
          addSheet: {
            properties: {
              sheetId: 10,
              title: 'Sleep (SparkyFitness)',
              gridProperties: {
                rowCount: 1,
                columnCount: 1,
                frozenRowCount: 0,
              },
            },
          },
        },
        {
          createDeveloperMetadata: {
            developerMetadata: {
              metadataKey: 'sparkyfitness-tab',
              metadataValue: 'Sleep',
              location: { sheetId: 10 },
              visibility: 'DOCUMENT',
            },
          },
        },
      ],
    });
    expect(calls[1][0]).toContain('values:batchClear');
    expect(calls[1][1]).toEqual({
      ranges: ["'My food'", "'Sleep (SparkyFitness)'"],
    });
    expect(
      calls
        .slice(2)
        .map((c) => (c[1] as { data: { range: string }[] }).data[0].range)
    ).toEqual(["'My food'!A1", "'Sleep (SparkyFitness)'!A1"]);
  });

  it('removes the starter sheet of a new spreadsheet after adding the tabs', async () => {
    await writeTabs(
      'token',
      'sheet-1',
      [{ sheetId: 0, title: 'Sheet1', exportTab: null }],
      [{ title: 'Food log', rows: [['No data logged yet']] }],
      true
    );
    const { requests } = vi.mocked(axios.post).mock.calls[0][1] as {
      requests: Record<string, unknown>[];
    };
    expect(requests.map((r) => Object.keys(r)[0])).toEqual([
      'addSheet',
      'createDeveloperMetadata',
      'deleteSheet',
    ]);
    expect(requests[2]).toEqual({ deleteSheet: { sheetId: 0 } });
  });

  it('retries quota errors and gives up on other errors', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const quota = Object.assign(new Error('quota'), {
      response: { status: 429 },
    });
    const request = vi
      .fn()
      .mockRejectedValueOnce(quota)
      .mockResolvedValueOnce('ok');
    await expect(withSheetsRetry(request, sleep)).resolves.toBe('ok');
    expect(request).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);

    const bad = Object.assign(new Error('bad'), { response: { status: 400 } });
    const failing = vi.fn().mockRejectedValue(bad);
    await expect(withSheetsRetry(failing, sleep)).rejects.toBe(bad);
    expect(failing).toHaveBeenCalledTimes(1);

    const always = vi.fn().mockRejectedValue(quota);
    await expect(withSheetsRetry(always, sleep)).rejects.toBe(quota);
    expect(always).toHaveBeenCalledTimes(5);
  });
});
