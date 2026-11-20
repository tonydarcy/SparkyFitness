import type {
  WorkoutPresetCreateRequest,
  WorkoutPresetExerciseRequest,
  WorkoutPresetSetRequest,
  WorkoutPresetUpdateRequest,
} from '@workspace/shared';
import { apiFetch } from './apiClient';
import {
  listCacheRows,
  getCacheRow,
  putCacheRows,
  searchCacheRows,
  type CacheWrite,
} from '../../offline/cacheStore';
import { CACHE_COLLECTIONS } from '../../offline/collections';
import { withOfflineFallback } from '../../offline/withOfflineFallback';
import type { OfflineDb } from '../../offline/types';
import { ApiError } from './errors';
import type {
  WorkoutPresetsResponse,
  WorkoutPreset,
} from '../../types/workoutPresets';

// Payload shapes are the shared request schemas the server validates against;
// these aliases keep the mobile-local names the hooks were written against.
export type WorkoutPresetSetPayload = WorkoutPresetSetRequest;
export type WorkoutPresetExercisePayload = WorkoutPresetExerciseRequest;
export type WorkoutPresetCreatePayload = WorkoutPresetCreateRequest;
export type WorkoutPresetUpdatePayload = WorkoutPresetUpdateRequest;

const presetCacheRows = (presets: readonly WorkoutPreset[]): CacheWrite[] =>
  presets.map((preset) => ({
    key: String(preset.id),
    name: preset.name,
    payload: preset,
  }));

const storePresets = (
  db: OfflineDb,
  serverConfigId: string,
  presets: readonly WorkoutPreset[]
) =>
  putCacheRows(
    db,
    serverConfigId,
    CACHE_COLLECTIONS.workoutPreset,
    presetCacheRows(presets)
  );

/** Every saved workout kept on the phone, by name; null when none are. */
async function readSavedPresets(
  db: OfflineDb,
  serverConfigId: string
): Promise<WorkoutPreset[] | null> {
  const rows = await listCacheRows(
    db,
    serverConfigId,
    CACHE_COLLECTIONS.workoutPreset
  );
  return rows.length > 0
    ? rows.map((row) => row.payload as WorkoutPreset)
    : null;
}

export const fetchWorkoutPresets = async (): Promise<WorkoutPresetsResponse> =>
  withOfflineFallback<WorkoutPresetsResponse>({
    fetch: () =>
      apiFetch<WorkoutPresetsResponse>({
        endpoint: '/api/workout-presets?limit=50',
        serviceName: 'Workout Presets API',
        operation: 'fetch workout presets',
      }),
    store: (db, serverConfigId, response) =>
      storePresets(db, serverConfigId, response.presets),
    read: async (db, serverConfigId) => {
      const presets = await readSavedPresets(db, serverConfigId);
      if (!presets) return null;
      return {
        presets: presets.slice(0, 50),
        total: presets.length,
        page: 1,
        limit: 50,
      };
    },
  });

export interface FetchWorkoutPresetsPageOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedWorkoutPresetsPage {
  presets: WorkoutPreset[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    hasMore: boolean;
  };
}

export const fetchWorkoutPresetsPage = async ({
  page = 1,
  pageSize = 20,
}: FetchWorkoutPresetsPageOptions = {}): Promise<PaginatedWorkoutPresetsPage> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
  });
  const response = await withOfflineFallback<WorkoutPresetsResponse>({
    fetch: () =>
      apiFetch<WorkoutPresetsResponse>({
        endpoint: `/api/workout-presets?${params.toString()}`,
        serviceName: 'Workout Presets API',
        operation: 'fetch workout presets page',
      }),
    store: (db, serverConfigId, value) =>
      storePresets(db, serverConfigId, value.presets),
    read: async (db, serverConfigId) => {
      const presets = await readSavedPresets(db, serverConfigId);
      if (!presets) return null;
      const start = (page - 1) * pageSize;
      return {
        presets: presets.slice(start, start + pageSize),
        total: presets.length,
        page,
        limit: pageSize,
      };
    },
  });
  return {
    presets: response.presets,
    pagination: {
      page,
      pageSize,
      totalCount: response.total,
      hasMore: page * pageSize < response.total,
    },
  };
};

export const searchWorkoutPresets = async (
  searchTerm: string,
  options: { limit?: number } = {}
): Promise<WorkoutPreset[]> => {
  const params = new URLSearchParams({ searchTerm });
  if (options.limit !== undefined) {
    params.set('limit', String(options.limit));
  }
  return withOfflineFallback<WorkoutPreset[]>({
    fetch: () =>
      apiFetch<WorkoutPreset[]>({
        endpoint: `/api/workout-presets/search?${params.toString()}`,
        serviceName: 'Workout Presets API',
        operation: 'search workout presets',
      }),
    store: storePresets,
    read: async (db, serverConfigId) => {
      // Search what is saved by name. Null (no fallback) only when nothing
      // is saved at all; "saved, but no match" is a real empty answer.
      const saved = await readSavedPresets(db, serverConfigId);
      if (!saved) return null;
      const rows = await searchCacheRows(
        db,
        serverConfigId,
        CACHE_COLLECTIONS.workoutPreset,
        searchTerm,
        options.limit ?? 50
      );
      return rows.map((row) => row.payload as WorkoutPreset);
    },
  });
};

export const getWorkoutPresetById = async (
  id: number
): Promise<WorkoutPreset> => {
  return withOfflineFallback<WorkoutPreset>({
    fetch: () =>
      apiFetch<WorkoutPreset>({
        endpoint: `/api/workout-presets/${id}`,
        serviceName: 'Workout Presets API',
        operation: 'fetch workout preset',
      }),
    store: (db, serverConfigId, preset) =>
      storePresets(db, serverConfigId, [preset]),
    read: async (db, serverConfigId) => {
      const row = await getCacheRow(
        db,
        serverConfigId,
        CACHE_COLLECTIONS.workoutPreset,
        String(id)
      );
      return row ? (row.payload as WorkoutPreset) : null;
    },
  });
};

const usesRangeProgression = (
  exercises: readonly WorkoutPresetExercisePayload[] | undefined
): boolean =>
  (exercises ?? []).some(
    (e) => e.progression_mode === 'double' || e.progression_mode === 'triple'
  );

/**
 * Servers older than double/triple progression reject those modes with a
 * 400. Fixed Target on the top of the range is the closest older mode (every
 * set at the top adds weight), so the preset still saves; the server drops
 * rep_range_min, which it doesn't know either.
 */
function withoutRangeProgression<
  T extends { exercises?: WorkoutPresetExercisePayload[] },
>(body: T): T {
  return {
    ...body,
    exercises: body.exercises?.map((e) =>
      e.progression_mode === 'double' || e.progression_mode === 'triple'
        ? { ...e, progression_mode: 'fixed', increment_type: 'weight' }
        : e
    ),
  };
}

/** Send once; on a 400 for a body using double/triple, retry for an older server. */
async function sendWithRangeFallback<
  T extends { exercises?: WorkoutPresetExercisePayload[] },
>(body: T, send: (body: T) => Promise<WorkoutPreset>): Promise<WorkoutPreset> {
  try {
    return await send(body);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.statusCode === 400 &&
      usesRangeProgression(body.exercises)
    ) {
      return send(withoutRangeProgression(body));
    }
    throw error;
  }
}

export const createWorkoutPreset = async (
  body: WorkoutPresetCreatePayload
): Promise<WorkoutPreset> =>
  sendWithRangeFallback(body, (payload) =>
    apiFetch<WorkoutPreset>({
      endpoint: '/api/workout-presets',
      method: 'POST',
      body: payload,
      serviceName: 'Workout Presets API',
      operation: 'create workout preset',
    })
  );

export const updateWorkoutPreset = async (
  id: number,
  body: WorkoutPresetUpdatePayload
): Promise<WorkoutPreset> =>
  sendWithRangeFallback(body, (payload) =>
    apiFetch<WorkoutPreset>({
      endpoint: `/api/workout-presets/${id}`,
      method: 'PUT',
      body: payload,
      serviceName: 'Workout Presets API',
      operation: 'update workout preset',
    })
  );

export const deleteWorkoutPreset = async (
  id: number
): Promise<{ message: string }> => {
  return apiFetch<{ message: string }>({
    endpoint: `/api/workout-presets/${id}`,
    method: 'DELETE',
    serviceName: 'Workout Presets API',
    operation: 'delete workout preset',
  });
};
