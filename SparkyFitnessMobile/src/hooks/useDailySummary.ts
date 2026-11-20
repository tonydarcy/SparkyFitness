import { useQuery } from '@tanstack/react-query';
import { buildDailySummary } from '../services/dailySummaryService';

import { useRefetchOnFocus } from './useRefetchOnFocus';
import { dailySummaryQueryOptions } from './dayQueryOptions';

export type { DailySummaryRawData } from '../services/dailySummaryService';

interface UseDailySummaryOptions {
  date: string;
  enabled?: boolean;
}

export function useDailySummary({
  date,
  enabled = true,
}: UseDailySummaryOptions) {
  const query = useQuery({
    ...dailySummaryQueryOptions(date),
    select: (raw) => buildDailySummary(date, raw),
    enabled,
  });

  useRefetchOnFocus(query.refetch, enabled);

  return {
    summary: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
