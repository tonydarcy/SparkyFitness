import { vi, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error TS7016 supertest typing
import request from 'supertest';
import express from 'express';
import errorHandler from '../middleware/errorHandler.js';
import foodDiaryNoteRoutes from '../routes/v2/foodDiaryNoteRoutes.js';
import {
  getFoodDiaryNote,
  saveFoodDiaryNote,
} from '../models/foodDiaryNoteRepository.js';

vi.mock('../models/foodDiaryNoteRepository.js', () => ({
  getFoodDiaryNote: vi.fn(),
  saveFoodDiaryNote: vi.fn(),
}));
vi.mock('../middleware/checkPermissionMiddleware.js', () => ({
  default:
    () =>
    (
      _req: express.Request,
      _res: express.Response,
      next: express.NextFunction
    ) =>
      next(),
}));

const app = express();
app.use(express.json());
app.use(
  (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction
  ) => {
    req.userId = 'owner-id';
    req.authenticatedUserId = 'actor-id';
    next();
  }
);
app.use('/api/v2/food-diary-notes', foodDiaryNoteRoutes);
app.use(errorHandler);

const saved = {
  date: '2026-11-18',
  note: 'Dinner out, guessed the portions.',
  updated_at: '2026-11-18T09:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('food diary note routes', () => {
  it("returns the day's note", async () => {
    vi.mocked(getFoodDiaryNote).mockResolvedValue(saved);
    const res = await request(app).get(
      '/api/v2/food-diary-notes?date=2026-11-18'
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual(saved);
    expect(getFoodDiaryNote).toHaveBeenCalledWith(
      'owner-id',
      '2026-11-18',
      'actor-id'
    );
  });

  it('rejects a missing or impossible day', async () => {
    const missing = await request(app).get('/api/v2/food-diary-notes');
    const impossible = await request(app).get(
      '/api/v2/food-diary-notes?date=2026-02-30'
    );
    expect(missing.status).toBe(400);
    expect(impossible.status).toBe(400);
    expect(getFoodDiaryNote).not.toHaveBeenCalled();
  });

  it('saves the note for the day', async () => {
    vi.mocked(saveFoodDiaryNote).mockResolvedValue(saved);
    const res = await request(app)
      .put('/api/v2/food-diary-notes')
      .send({ date: '2026-11-18', note: saved.note });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(saved);
    expect(saveFoodDiaryNote).toHaveBeenCalledWith(
      'owner-id',
      '2026-11-18',
      saved.note,
      'actor-id'
    );
  });

  it('passes a blank note through so the repository clears it', async () => {
    vi.mocked(saveFoodDiaryNote).mockResolvedValue({
      date: '2026-11-18',
      note: null,
      updated_at: null,
    });
    const res = await request(app)
      .put('/api/v2/food-diary-notes')
      .send({ date: '2026-11-18', note: '' });
    expect(res.status).toBe(200);
    expect(res.body.note).toBeNull();
    expect(saveFoodDiaryNote).toHaveBeenCalledWith(
      'owner-id',
      '2026-11-18',
      '',
      'actor-id'
    );
  });

  it('rejects a note the database cannot store', async () => {
    const res = await request(app)
      .put('/api/v2/food-diary-notes')
      .send({ date: '2026-11-18', note: 'a\u0000b' });
    expect(res.status).toBe(400);
    expect(saveFoodDiaryNote).not.toHaveBeenCalled();
  });

  it('rejects a note with an unpaired surrogate', async () => {
    const res = await request(app)
      .put('/api/v2/food-diary-notes')
      .send({ date: '2026-11-18', note: 'a\uD800b' });
    expect(res.status).toBe(400);
    expect(saveFoodDiaryNote).not.toHaveBeenCalled();
  });

  it('accepts emoji', async () => {
    vi.mocked(saveFoodDiaryNote).mockResolvedValueOnce({
      date: '2026-11-18',
      note: 'pizza \uD83C\uDF55',
      updated_at: '2026-11-18T10:00:00.000Z',
    });
    const res = await request(app)
      .put('/api/v2/food-diary-notes')
      .send({ date: '2026-11-18', note: 'pizza \uD83C\uDF55' });
    expect(res.status).toBe(200);
  });

  it('rejects a note over the length limit', async () => {
    const res = await request(app)
      .put('/api/v2/food-diary-notes')
      .send({ date: '2026-11-18', note: 'x'.repeat(5001) });
    expect(res.status).toBe(400);
    expect(saveFoodDiaryNote).not.toHaveBeenCalled();
  });
});
