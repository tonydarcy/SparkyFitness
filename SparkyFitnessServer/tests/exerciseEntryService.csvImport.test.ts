import { vi, beforeEach, describe, expect, it } from 'vitest';
import exerciseRepository from '../models/exercise.js';
import exerciseEntryRepository from '../models/exerciseEntry.js';
import preferenceRepository from '../models/preferenceRepository.js';
import activityDetailsRepository from '../models/activityDetailsRepository.js';
import { getClient } from '../db/poolManager.js';
import { importExerciseEntriesFromCsv } from '../services/exerciseEntryService.js';

vi.mock('../config/logging', () => ({ log: vi.fn() }));
vi.mock('../db/poolManager', () => ({ getClient: vi.fn() }));
vi.mock('../models/exercise', () => ({
  default: {
    findExerciseByNameAndUserId: vi.fn(),
    createExercise: vi.fn(),
  },
}));
vi.mock('../models/exerciseEntry', () => ({
  default: {
    _createExerciseEntryWithClient: vi.fn(),
  },
}));
vi.mock('../models/workoutPresetRepository', () => ({
  default: {
    getWorkoutPresetByName: vi.fn(),
    createWorkoutPreset: vi.fn(),
  },
}));
vi.mock('../models/activityDetailsRepository', () => ({
  default: {
    _createActivityDetailWithClient: vi.fn(),
  },
}));
vi.mock('../models/preferenceRepository', () => ({
  default: {
    getUserPreferences: vi.fn(),
  },
}));

const query = vi.fn(async (_sql: string) => ({ rows: [], rowCount: 0 }));
const release = vi.fn();
const createEntry = vi.mocked(
  exerciseEntryRepository._createExerciseEntryWithClient
);
const sqls = () => query.mock.calls.map((c) => c[0]);

describe('importExerciseEntriesFromCsv set durations', () => {
  const userId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClient).mockResolvedValue({
      query,
      release,
    } as unknown as Awaited<ReturnType<typeof getClient>>);
    createEntry.mockResolvedValue({
      entry: { id: 'entry-1' },
      operation: 'created',
    } as Awaited<ReturnType<typeof createEntry>>);
    // @ts-expect-error TS(2339): mock method not on typed function.
    exerciseRepository.findExerciseByNameAndUserId.mockResolvedValue({
      id: 'exercise-1',
    });
    // @ts-expect-error TS(2339): mock method not on typed function.
    preferenceRepository.getUserPreferences.mockResolvedValue({
      default_distance_unit: 'km',
      default_weight_unit: 'kg',
    });
  });

  it('converts fractional duration_min to integer seconds without losing precision (issue #1903)', async () => {
    const result = await importExerciseEntriesFromCsv(userId, userId, [
      {
        entry_date: '2026-07-01',
        exercise_name: 'Plank',
        sets: [
          {
            set_number: 1,
            set_type: 'Working Set',
            duration_min: 1.5,
            rest_time_sec: 60,
          },
        ],
      },
    ]);

    expect(result.created).toBe(1);
    expect(createEntry).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      expect.objectContaining({
        // 90s duration + 60s rest = 2.5 minutes; the fractional 1.5 min set
        // duration must not be truncated to 1.
        duration_minutes: 2.5,
        sets: [
          expect.objectContaining({
            set_number: 1,
            duration: 90,
            rest_time: 60,
          }),
        ],
      }),
      userId,
      'CSV_Import'
    );
  });

  it('maps a missing duration_min to a null set duration', async () => {
    await importExerciseEntriesFromCsv(userId, userId, [
      {
        entry_date: '2026-07-01',
        exercise_name: 'Bench Press',
        sets: [
          {
            set_number: 1,
            set_type: 'Working Set',
            reps: 5,
            weight: 100,
          },
        ],
      },
    ]);

    expect(createEntry).toHaveBeenCalledWith(
      expect.anything(),
      userId,
      expect.objectContaining({
        sets: [expect.objectContaining({ duration: null })],
      }),
      userId,
      'CSV_Import'
    );
  });

  const benchRow = (date: string) => ({
    entry_date: date,
    exercise_name: 'Bench Press',
    sets: [{ set_number: 1, reps: 5, weight: 82.5 }],
  });

  it('writes every entry in one transaction', async () => {
    const result = await importExerciseEntriesFromCsv(userId, userId, [
      benchRow('2026-07-01'),
      {
        ...benchRow('2026-07-02'),
        activity_details: [{ field_name: 'RPE', value: 8 }],
      },
    ]);
    expect(result.created).toBe(2);
    expect(sqls()).toEqual(['BEGIN', 'COMMIT']);
    expect(createEntry).toHaveBeenCalledTimes(2);
    expect(
      activityDetailsRepository._createActivityDetailWithClient
    ).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
  });

  it('keeps decimal weights', async () => {
    await importExerciseEntriesFromCsv(userId, userId, [
      benchRow('2026-07-01'),
    ]);
    expect(createEntry.mock.calls[0]![2]).toMatchObject({
      sets: [expect.objectContaining({ weight: 82.5 })],
    });
  });

  it('writes nothing when any row is malformed', async () => {
    await expect(
      importExerciseEntriesFromCsv(userId, userId, [
        benchRow('2026-07-01'),
        benchRow('07/02/2026'),
        { entry_date: '2026-07-03', exercise_name: '  ', sets: [] },
        { entry_date: '2026-07-04', exercise_name: 'Row', sets: 'x' },
      ])
    ).rejects.toMatchObject({
      status: 409,
      details: { createdCount: 0, failedCount: 3, notImportedCount: 4 },
    });
    expect(getClient).not.toHaveBeenCalled();
    expect(exerciseRepository.createExercise).not.toHaveBeenCalled();
    expect(createEntry).not.toHaveBeenCalled();
  });

  it('rolls back every entry when a later write fails', async () => {
    createEntry
      .mockResolvedValueOnce({
        entry: { id: 'entry-1' },
        operation: 'created',
      } as Awaited<ReturnType<typeof createEntry>>)
      .mockRejectedValueOnce(new Error('db down'));
    await expect(
      importExerciseEntriesFromCsv(userId, userId, [
        benchRow('2026-07-01'),
        benchRow('2026-07-02'),
      ])
    ).rejects.toMatchObject({
      status: 409,
      details: {
        createdCount: 0,
        failedEntries: [expect.objectContaining({ reason: 'db down' })],
      },
    });
    expect(sqls()).toEqual(['BEGIN', 'ROLLBACK']);
    expect(release).toHaveBeenCalledOnce();
  });
});
