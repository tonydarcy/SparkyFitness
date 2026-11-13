import { renderHook, waitFor } from '@testing-library/react-native';
import { usePrefetchAdjacentDays } from '../../src/hooks/usePrefetchAdjacentDays';
import {
  dailySummaryQueryKey,
  measurementsQueryKey,
  sleepDayQueryKey,
} from '../../src/hooks/queryKeys';
import { loadDailySummaryRawData } from '../../src/services/dailySummaryService';
import { fetchMeasurements } from '../../src/services/api/measurementsApi';
import { fetchSleepEntries } from '../../src/services/api/sleepApi';
import { getTodayDate } from '../../src/utils/dateUtils';
import {
  createTestQueryClient,
  createQueryWrapper,
  type QueryClient,
} from './queryTestUtils';

jest.mock('../../src/services/dailySummaryService', () => ({
  loadDailySummaryRawData: jest.fn(),
}));
jest.mock('../../src/services/api/measurementsApi', () => ({
  fetchMeasurements: jest.fn(),
}));
jest.mock('../../src/services/api/sleepApi', () => ({
  fetchSleepEntries: jest.fn(),
}));
jest.mock('../../src/utils/dateUtils', () => ({
  ...jest.requireActual('../../src/utils/dateUtils'),
  getTodayDate: jest.fn(),
}));

const mockLoadSummary = loadDailySummaryRawData as jest.Mock;
const mockFetchMeasurements = fetchMeasurements as jest.Mock;
const mockFetchSleep = fetchSleepEntries as jest.Mock;
const mockToday = getTodayDate as jest.Mock;

describe('usePrefetchAdjacentDays', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Match the app: cached days are never refetched unless invalidated.
    queryClient = createTestQueryClient({
      queries: { retry: false, staleTime: Infinity },
    });
    mockLoadSummary.mockResolvedValue({ foodEntries: [] });
    mockFetchMeasurements.mockResolvedValue(null);
    mockFetchSleep.mockResolvedValue([]);
    mockToday.mockReturnValue('2026-11-13');
  });

  afterEach(() => queryClient.clear());

  const render = (date: string, enabled = true) =>
    renderHook(() => usePrefetchAdjacentDays({ date, enabled }), {
      wrapper: createQueryWrapper(queryClient),
    });

  it('loads the previous and next day for a past date', async () => {
    render('2026-11-10');

    await waitFor(() => {
      expect(
        queryClient.getQueryData(dailySummaryQueryKey('2026-11-09'))
      ).toBeDefined();
      expect(
        queryClient.getQueryData(dailySummaryQueryKey('2026-11-11'))
      ).toBeDefined();
    });
    expect(mockFetchMeasurements).toHaveBeenCalledWith('2026-11-09');
    expect(mockFetchSleep).toHaveBeenCalledWith('2026-11-09', '2026-11-10');
    expect(
      queryClient.getQueryState(measurementsQueryKey('2026-11-11'))
    ).toBeDefined();
    expect(
      queryClient.getQueryState(sleepDayQueryKey('2026-11-11'))
    ).toBeDefined();
  });

  it('does not load tomorrow when viewing today', async () => {
    render('2026-11-13');

    await waitFor(() =>
      expect(mockLoadSummary).toHaveBeenCalledWith('2026-11-12')
    );
    expect(mockLoadSummary).not.toHaveBeenCalledWith('2026-11-14');
  });

  it('does nothing until enabled', () => {
    render('2026-11-10', false);

    expect(mockLoadSummary).not.toHaveBeenCalled();
    expect(mockFetchMeasurements).not.toHaveBeenCalled();
    expect(mockFetchSleep).not.toHaveBeenCalled();
  });

  it('skips a day that is already cached', async () => {
    queryClient.setQueryData(dailySummaryQueryKey('2026-11-09'), {
      foodEntries: [],
    });

    render('2026-11-10');

    await waitFor(() =>
      expect(mockLoadSummary).toHaveBeenCalledWith('2026-11-11')
    );
    expect(mockLoadSummary).not.toHaveBeenCalledWith('2026-11-09');
  });
});
