import { useQuery } from '@tanstack/react-query';
import { fetchAdaptiveTdee } from '../services/api/reportsApi';
import { adaptiveTdeeQueryKey } from './queryKeys';

/**
 * The server's expenditure estimate for a day. Not retried: an older server
 * without the route answers 404 and the card simply stays hidden.
 */
export function useAdaptiveTdee(date: string, enabled = true) {
  return useQuery({
    queryKey: adaptiveTdeeQueryKey(date),
    queryFn: () => fetchAdaptiveTdee(date),
    enabled: enabled && !!date,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
}
