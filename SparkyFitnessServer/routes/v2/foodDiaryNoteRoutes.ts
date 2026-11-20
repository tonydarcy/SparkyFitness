import express from 'express';
import {
  foodDiaryNoteQuerySchema,
  upsertFoodDiaryNoteBodySchema,
} from '@workspace/shared';
import checkPermissionMiddleware from '../../middleware/checkPermissionMiddleware.js';
import {
  getFoodDiaryNote,
  saveFoodDiaryNote,
} from '../../models/foodDiaryNoteRepository.js';

/**
 * A free-text note for a food diary day. Diary data: a delegate with diary
 * access can write it, and one with read access can see it.
 */
const router = express.Router();

router.use(checkPermissionMiddleware('diary'));

/**
 * @swagger
 * /v2/food-diary-notes:
 *   get:
 *     summary: Get the note for a diary day
 *     tags: [Nutrition & Meals]
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: "The day's note; note is null when there is none."
 *       400:
 *         description: Invalid date.
 *   put:
 *     summary: Save or clear the note for a diary day
 *     description: A blank note deletes the day's note.
 *     tags: [Nutrition & Meals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, note]
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               note:
 *                 type: string
 *                 maxLength: 5000
 *     responses:
 *       200:
 *         description: The saved note.
 *       400:
 *         description: Invalid body.
 */
router.get('/', async (req, res, next) => {
  try {
    const parsed = foodDiaryNoteQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid query',
        details: parsed.error.format(),
      });
    }
    res.json(
      await getFoodDiaryNote(
        req.userId,
        parsed.data.date,
        req.authenticatedUserId
      )
    );
  } catch (error) {
    next(error);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const parsed = upsertFoodDiaryNoteBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: parsed.error.format(),
      });
    }
    res.json(
      await saveFoodDiaryNote(
        req.userId,
        parsed.data.date,
        parsed.data.note,
        req.authenticatedUserId
      )
    );
  } catch (error) {
    next(error);
  }
});

export default router;
