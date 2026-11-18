import { apiFetch } from '../../../src/services/api/apiClient';
import { ApiError } from '../../../src/services/api/errors';
import {
  fetchFoodDiaryNote,
  saveFoodDiaryNote,
} from '../../../src/services/api/foodDiaryNotesApi';

jest.mock('../../../src/services/api/apiClient');

const mockedApiFetch = jest.mocked(apiFetch);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('foodDiaryNotesApi', () => {
  it("reads the day's note", async () => {
    const note = { date: '2026-11-18', note: 'Ate out', updated_at: null };
    mockedApiFetch.mockResolvedValue(note as never);
    await expect(fetchFoodDiaryNote('2026-11-18')).resolves.toEqual(note);
    expect(mockedApiFetch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        endpoint: '/api/v2/food-diary-notes?date=2026-11-18',
      })
    );
  });

  it('returns null when the server has no day notes (404)', async () => {
    mockedApiFetch.mockRejectedValue(new ApiError('Not found', 404, ''));
    await expect(fetchFoodDiaryNote('2026-11-18')).resolves.toBeNull();
  });

  it('passes on other errors', async () => {
    mockedApiFetch.mockRejectedValue(new ApiError('Boom', 500, ''));
    await expect(fetchFoodDiaryNote('2026-11-18')).rejects.toThrow('Boom');
  });

  it('saves the note for the day', async () => {
    mockedApiFetch.mockResolvedValue(undefined as never);
    await saveFoodDiaryNote('2026-11-18', 'Felt unwell');
    expect(mockedApiFetch).toHaveBeenLastCalledWith(
      expect.objectContaining({
        endpoint: '/api/v2/food-diary-notes',
        method: 'PUT',
        body: { date: '2026-11-18', note: 'Felt unwell' },
      })
    );
  });
});
