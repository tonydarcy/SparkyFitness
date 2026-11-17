import { queryOptions } from '@tanstack/react-query';
import { loadDailySummaryRawData } from '../services/dailySummaryService';
import { fetchMeasurements } from '../services/api/measurementsApi';
import { fetchSleepEntries } from '../services/api/sleepApi';
import { addDays } from '../utils/dateUtils';
import {
  dailySummaryQueryKey,
  measurementsQueryKey,
  sleepDayQueryKey,
} from './queryKeys';

/**
 * How long a day the user has moved away from stays in memory. React Query's
 * default is 5 minutes, after which going back to that day means a full
 * reload; 30 minutes keeps a session of paging through the diary instant.
 * Staleness is unaffected: data is still `staleTime: Infinity` and refreshed
 * by invalidation, focus refetch and pull-to-refresh as before.
 */
export const DAY_QUERY_GC_TIME_MS = 30 * 60 * 1000;

// One definition per day query, shared by the screen hooks and the
// adjacent-day prefetch so a prefetched day lands under the same key and shape.
export const dailySummaryQueryOptions = (date: string) =>
  queryOptions({
    queryKey: dailySummaryQueryKey(date),
    queryFn: () => loadDailySummaryRawData(date),
    gcTime: DAY_QUERY_GC_TIME_MS,
  });

export const measurementsQueryOptions = (date: string) =>
  queryOptions({
    queryKey: measurementsQueryKey(date),
    queryFn: () => fetchMeasurements(date),
    gcTime: DAY_QUERY_GC_TIME_MS,
  });

export const sleepDayQueryOptions = (day: string) =>
  queryOptions({
    queryKey: sleepDayQueryKey(day),
    queryFn: () => fetchSleepEntries(day, addDays(day, 1)),
    gcTime: DAY_QUERY_GC_TIME_MS,
  });
