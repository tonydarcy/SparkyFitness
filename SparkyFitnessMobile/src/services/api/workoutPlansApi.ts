import type {
  StarterWorkoutPlanCreateRequest,
  StarterWorkoutPlanKey,
  StarterWorkoutPlanSummary,
} from '@workspace/shared';
import { apiFetch } from './apiClient';
import { getCacheRow, putCacheRows } from '../../offline/cacheStore';
import { CACHE_COLLECTIONS } from '../../offline/collections';
import { withOfflineFallback } from '../../offline/withOfflineFallback';
import type {
  SaveWorkoutPlanPayload,
  WorkoutPlanTemplate,
} from '../../types/workoutPlans';

const SERVICE_NAME = 'Workout Plans API';

/** The plans active on a day, straight from the server. */
export const fetchActiveWorkoutPlansFromServer = async (
  date: string
): Promise<WorkoutPlanTemplate[]> => {
  const response = await apiFetch<
    WorkoutPlanTemplate[] | WorkoutPlanTemplate | null
  >({
    endpoint: `/api/workout-plan-templates/active/${date}`,
    serviceName: SERVICE_NAME,
    operation: 'fetch active workout plans',
  });
  if (!response) return [];
  return Array.isArray(response) ? response : [response];
};

/** The plans active on a day; from what the phone saved when offline. */
export const fetchActiveWorkoutPlans = (
  date: string
): Promise<WorkoutPlanTemplate[]> =>
  withOfflineFallback<WorkoutPlanTemplate[]>({
    fetch: () => fetchActiveWorkoutPlansFromServer(date),
    store: (db, serverConfigId, plans) =>
      putCacheRows(db, serverConfigId, CACHE_COLLECTIONS.planDay, [
        { key: date, payload: plans },
      ]),
    read: async (db, serverConfigId) => {
      const row = await getCacheRow(
        db,
        serverConfigId,
        CACHE_COLLECTIONS.planDay,
        date
      );
      return row ? (row.payload as WorkoutPlanTemplate[]) : null;
    },
  });

export const fetchWorkoutPlans = async (): Promise<WorkoutPlanTemplate[]> => {
  const response = await apiFetch<WorkoutPlanTemplate[] | null>({
    endpoint: '/api/workout-plan-templates',
    serviceName: SERVICE_NAME,
    operation: 'fetch workout plans',
  });
  return response ?? [];
};

export const createWorkoutPlan = async (
  payload: SaveWorkoutPlanPayload,
  currentClientDate: string
): Promise<WorkoutPlanTemplate> =>
  apiFetch<WorkoutPlanTemplate>({
    endpoint: '/api/workout-plan-templates',
    serviceName: SERVICE_NAME,
    operation: 'create workout plan',
    method: 'POST',
    body: { ...payload, currentClientDate },
  });

export const updateWorkoutPlan = async (
  id: string,
  payload: SaveWorkoutPlanPayload,
  currentClientDate: string
): Promise<WorkoutPlanTemplate> =>
  apiFetch<WorkoutPlanTemplate>({
    endpoint: `/api/workout-plan-templates/${id}`,
    serviceName: SERVICE_NAME,
    operation: 'update workout plan',
    method: 'PUT',
    body: { ...payload, currentClientDate },
  });

export const deleteWorkoutPlan = async (id: string): Promise<void> =>
  apiFetch<void>({
    endpoint: `/api/workout-plan-templates/${id}`,
    serviceName: SERVICE_NAME,
    operation: 'delete workout plan',
    method: 'DELETE',
  });

/**
 * The built-in starter plans. Servers from before starter plans answer with
 * an error (the path falls through to the plan-by-id route); callers hide the
 * section then.
 */
export const fetchStarterWorkoutPlans = async (): Promise<
  StarterWorkoutPlanSummary[]
> => {
  const response = await apiFetch<StarterWorkoutPlanSummary[] | null>({
    endpoint: '/api/workout-plan-templates/starter',
    serviceName: SERVICE_NAME,
    operation: 'fetch starter workout plans',
  });
  return Array.isArray(response) ? response : [];
};

export const createStarterWorkoutPlan = async (
  key: StarterWorkoutPlanKey,
  body: StarterWorkoutPlanCreateRequest
): Promise<WorkoutPlanTemplate> =>
  apiFetch<WorkoutPlanTemplate>({
    endpoint: `/api/workout-plan-templates/starter/${key}`,
    serviceName: SERVICE_NAME,
    operation: 'add starter workout plan',
    method: 'POST',
    body,
  });
