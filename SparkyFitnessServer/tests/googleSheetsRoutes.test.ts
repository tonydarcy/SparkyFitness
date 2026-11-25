import { vi, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error TS(7016): supertest ships no types in this workspace.
import request from 'supertest';
import express from 'express';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const DELEGATE_ID = '22222222-2222-4222-8222-222222222222';

const authState = {
  userId: OWNER_ID,
  authenticatedUserId: OWNER_ID,
  originalUserId: OWNER_ID,
};

const { buildExportTabsMock, googleSheetsServiceMock } = vi.hoisted(() => ({
  buildExportTabsMock: vi.fn(),
  googleSheetsServiceMock: {
    getAuthorizationUrl: vi.fn(),
    linkAccount: vi.fn(),
    syncGoogleSheets: vi.fn(),
    disconnect: vi.fn(),
    getStatus: vi.fn(),
  },
}));

vi.mock('../config/logging.js', () => ({ log: vi.fn() }));
vi.mock('../middleware/authMiddleware.js', () => ({
  default: {
    authenticate: (
      req: express.Request,
      _res: express.Response,
      next: express.NextFunction
    ) => {
      req.userId = authState.userId;
      req.authenticatedUserId = authState.authenticatedUserId;
      req.originalUserId = authState.originalUserId;
      next();
    },
  },
}));
vi.mock('../integrations/googlesheets/googleSheetsExport.js', () => ({
  buildExportTabs: buildExportTabsMock,
}));
vi.mock('../integrations/googlesheets/googleSheetsService.js', () => ({
  default: googleSheetsServiceMock,
  SheetsApiDisabledError: class SheetsApiDisabledError extends Error {
    constructor(readonly activationUrl: string) {
      super('Sheets API disabled');
    }
  },
}));

const { default: googleSheetsRoutes } =
  await import('../routes/googleSheetsRoutes.js');

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/integrations/googlesheets', googleSheetsRoutes);
  instance.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      res.status(500).json({ error: err.message });
    }
  );
  return instance;
}

beforeEach(() => {
  vi.clearAllMocks();
  authState.userId = OWNER_ID;
  authState.authenticatedUserId = OWNER_ID;
  authState.originalUserId = OWNER_ID;
});

describe('Google Sheets routes — GET /data', () => {
  it('returns the formatted export tabs with Cache-Control: no-store', async () => {
    const sampleTabs = [
      {
        title: 'Food log',
        rows: [
          ['Date', 'Food', 'Calories (kcal)'],
          ['2026-11-24', 'Oats', 300],
        ],
      },
      {
        title: 'Daily summary',
        rows: [
          ['Date', 'Calories (kcal)'],
          ['2026-11-24', 1850],
        ],
      },
    ];
    buildExportTabsMock.mockResolvedValue(sampleTabs);

    const res = await request(app()).get('/api/integrations/googlesheets/data');

    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(buildExportTabsMock).toHaveBeenCalledWith(OWNER_ID);
    expect(res.body.tabs).toEqual(sampleTabs);
    expect(Number.isNaN(Date.parse(res.body.generatedAt))).toBe(false);
  });

  it('rejects delegated family access with 403', async () => {
    authState.userId = OWNER_ID;
    authState.authenticatedUserId = DELEGATE_ID;
    authState.originalUserId = DELEGATE_ID;

    const res = await request(app()).get('/api/integrations/googlesheets/data');

    expect(res.statusCode).toBe(403);
    expect(buildExportTabsMock).not.toHaveBeenCalled();
  });

  it('forwards unexpected export errors to the error handler', async () => {
    buildExportTabsMock.mockRejectedValue(new Error('database down'));

    const res = await request(app()).get('/api/integrations/googlesheets/data');

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'database down' });
  });
});
