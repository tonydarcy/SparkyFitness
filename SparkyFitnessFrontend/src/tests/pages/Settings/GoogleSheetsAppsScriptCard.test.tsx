import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GoogleSheetsAppsScriptCard } from '@/pages/Settings/GoogleSheetsAppsScriptCard';
import { GOOGLE_SHEETS_APPS_SCRIPT } from '@/pages/Settings/googleSheetsAppsScript';

const mockCreateKey = jest.fn();
const mockToast = jest.fn();
let mockIsActingOnBehalf = false;

jest.mock('@/contexts/ActiveUserContext', () => ({
  useActiveUser: () => ({
    isActingOnBehalf: mockIsActingOnBehalf,
  }),
}));

jest.mock('@/hooks/Settings/useApiKeys', () => ({
  useCreateApiKeyMutation: () => ({
    mutateAsync: mockCreateKey,
    isPending: false,
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

function renderCard() {
  return render(
    <MemoryRouter>
      <GoogleSheetsAppsScriptCard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsActingOnBehalf = false;
});

describe('GoogleSheetsAppsScriptCard', () => {
  it('ships a syntactically valid Google Apps Script targeting the data endpoint', () => {
    expect(() => new Function(GOOGLE_SHEETS_APPS_SCRIPT)).not.toThrow();
    expect(GOOGLE_SHEETS_APPS_SCRIPT).toContain(
      '/api/integrations/googlesheets/data'
    );
    expect(GOOGLE_SHEETS_APPS_SCRIPT).toContain('function onOpen()');
    expect(GOOGLE_SHEETS_APPS_SCRIPT).toContain(
      'function setupSparkyFitness()'
    );
    expect(GOOGLE_SHEETS_APPS_SCRIPT).toContain('function syncSparkyFitness()');
  });

  it('generates a read-only never-expiring API key and displays it', async () => {
    mockCreateKey.mockResolvedValue({
      id: 'key-1',
      key: 'sf_readonly_secret_value',
      name: 'Google Sheets Export',
      scope: 'read',
    });

    renderCard();

    fireEvent.click(
      screen.getByRole('button', { name: 'Generate read-only API key' })
    );

    await waitFor(() => {
      expect(mockCreateKey).toHaveBeenCalledWith({
        name: 'Google Sheets Export',
        expiresIn: null,
        scope: 'read',
      });
    });

    expect(await screen.findByText('sf_readonly_secret_value')).toBeTruthy();
  });

  it('toggles the Apps Script preview', () => {
    renderCard();

    expect(screen.queryByText(/function setupSparkyFitness/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'View script' }));
    expect(screen.getByText(/function setupSparkyFitness/)).toBeTruthy();
  });

  it('shows an owner-only notice when acting on behalf of another user', () => {
    mockIsActingOnBehalf = true;
    renderCard();

    expect(
      screen.getByText(
        'Google Sheets export can only be set up for your own account.'
      )
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Generate read-only API key' })
    ).toBeNull();
  });
});
