import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, getTodayDate } from '../utils/dateUtils';
import {
  dailySummaryQueryOptions,
  measurementsQueryOptions,
  sleepDayQueryOptions,
} from './dayQueryOptions';

interface UsePrefetchAdjacentDaysOptions {
  date: string;
  /** Wait until the visible day has loaded so prefetching never competes with it. */
  enabled: boolean;
}

/**
 * Loads the day before (and the day after, up to today) in the background
 * once the visible day is on screen, so the next swipe or arrow tap shows
 * cached data instead of a spinner. Days already in the cache are skipped
 * (`staleTime: Infinity`), so paging back through the diary costs one extra
 * day of requests ahead of the user, never a repeat.
 */
export function usePrefetchAdjacentDays({
  date,
  enabled,
}: UsePrefetchAdjacentDaysOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const today = getTodayDate();
    const days = [addDays(date, -1), addDays(date, 1)].filter(
      (day) => day <= today
    );

    for (const day of days) {
      // prefetchQuery never throws; a failed prefetch just leaves the day to
      // load normally when it is opened.
      void queryClient.prefetchQuery(dailySummaryQueryOptions(day));
      void queryClient.prefetchQuery(measurementsQueryOptions(day));
      void queryClient.prefetchQuery(sleepDayQueryOptions(day));
    }
  }, [queryClient, date, enabled]);
}
