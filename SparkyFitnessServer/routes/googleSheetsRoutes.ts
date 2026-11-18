import express from 'express';
import { z } from 'zod/v4';
import googleSheetsService, {
  SheetsApiDisabledError,
} from '../integrations/googlesheets/googleSheetsService.js';
import { GoogleClientMissingError } from '../integrations/google/googleOAuth.js';
import { log } from '../config/logging.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireSelfActor from '../middleware/requireSelfMiddleware.js';
import { OAuthStateError } from '../utils/oauthState.js';
import {
  startProviderSync,
  SYNC_ALREADY_RUNNING_RESPONSE,
} from '../services/providerSyncClaim.js';
import { describeError } from '../utils/errors.js';

// Google Sheets export. Every route is self-only: the export writes the whole
// account to a spreadsheet in the person's own Drive, which nobody acting for
// them should be able to start, link or read the address of.

const router = express.Router();

const CallbackBodySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

const redirectUri = () =>
  `${process.env.SPARKY_FITNESS_FRONTEND_URL || 'http://localhost:8080'}/googlesheets/callback`;

/**
 * @swagger
 * /integrations/googlesheets/authorize:
 *   get:
 *     summary: Start linking Google Sheets for the food log and health data export
 *     tags: [External Integrations]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Authorization URL.
 *       400:
 *         description: No Google client ID and secret on the Google Sheets provider, and no Google Health client to borrow.
 */
router.get(
  '/authorize',
  authMiddleware.authenticate,
  requireSelfActor,
  async (req, res, next) => {
    try {
      const authUrl = await googleSheetsService.getAuthorizationUrl(
        req.userId,
        redirectUri()
      );
      res.json({ authUrl });
    } catch (error) {
      if (error instanceof GoogleClientMissingError) {
        res.status(400).json({ message: error.message });
        return;
      }
      log(
        'error',
        `Error starting Google Sheets authorization: ${describeError(error)}`
      );
      next(error);
    }
  }
);

/**
 * @swagger
 * /integrations/googlesheets/callback:
 *   post:
 *     summary: Finish linking Google Sheets and create the export spreadsheet
 *     tags: [External Integrations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, state]
 *             properties:
 *               code:
 *                 type: string
 *               state:
 *                 type: string
 *     responses:
 *       200:
 *         description: Linked.
 *       400:
 *         description: >
 *           Missing code, an invalid or expired state, no Google client, or
 *           `code: SHEETS_API_DISABLED`: the account is linked (tokens saved)
 *           but the Google Sheets API is off in the Google Cloud project;
 *           `activationUrl` links to its switch.
 */
router.post(
  '/callback',
  authMiddleware.authenticate,
  requireSelfActor,
  async (req, res, next) => {
    const body = CallbackBodySchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }
    try {
      await googleSheetsService.linkAccount(
        req.userId,
        body.data.code,
        body.data.state,
        redirectUri()
      );
      const userId = req.userId;
      // Fill the new sheet straight away rather than at the next scheduler run.
      try {
        const started = await startProviderSync(
          { userId, providerType: 'googlesheets' },
          () => googleSheetsService.syncGoogleSheets(userId)
        );
        started?.running.catch((error: unknown) => {
          log(
            'error',
            `First Google Sheets export failed for user ${userId}: ${describeError(error)}`
          );
        });
      } catch (error) {
        log(
          'warn',
          `Could not start the first Google Sheets export for user ${userId}: ${describeError(error)}`
        );
      }
      res.status(200).json({ message: 'Google Sheets linked successfully.' });
    } catch (error) {
      // The tokens are saved and only the API switch is missing: say where it
      // is, rather than a generic failure.
      if (error instanceof SheetsApiDisabledError) {
        res.status(400).json({
          message: error.message,
          code: 'SHEETS_API_DISABLED',
          activationUrl: error.activationUrl,
        });
        return;
      }
      if (error instanceof GoogleClientMissingError) {
        res.status(400).json({ message: error.message });
        return;
      }
      if (error instanceof OAuthStateError) {
        log('warn', `Google Sheets OAuth state rejected (${error.reason}).`);
        res
          .status(400)
          .json({ message: 'Invalid or expired authorization state.' });
        return;
      }
      log(
        'error',
        `Error handling Google Sheets OAuth callback: ${describeError(error)}`
      );
      next(error);
    }
  }
);

/**
 * @swagger
 * /integrations/googlesheets/sync:
 *   post:
 *     summary: Rewrite the Google Sheets export now
 *     tags: [External Integrations]
 *     responses:
 *       202:
 *         description: Export started.
 *       409:
 *         description: An export for this account is already running.
 */
router.post(
  '/sync',
  authMiddleware.authenticate,
  requireSelfActor,
  async (req, res, next) => {
    try {
      const userId = req.userId;
      const started = await startProviderSync(
        { userId, providerType: 'googlesheets' },
        () => googleSheetsService.syncGoogleSheets(userId)
      );
      if (!started) {
        res.status(409).json(SYNC_ALREADY_RUNNING_RESPONSE);
        return;
      }
      started.running.catch((error: unknown) => {
        log(
          'error',
          `Google Sheets export failed for user ${userId}: ${describeError(error)}`
        );
      });
      res.status(202).json({ message: 'Google Sheets export started.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /integrations/googlesheets/disconnect:
 *   post:
 *     summary: Unlink Google Sheets (the spreadsheet itself is kept)
 *     tags: [External Integrations]
 *     responses:
 *       200:
 *         description: Unlinked.
 */
router.post(
  '/disconnect',
  authMiddleware.authenticate,
  requireSelfActor,
  async (req, res, next) => {
    try {
      await googleSheetsService.disconnect(req.userId);
      res.status(200).json({ message: 'Google Sheets disconnected.' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /integrations/googlesheets/status:
 *   get:
 *     summary: Google Sheets link status, last export time and spreadsheet link
 *     tags: [External Integrations]
 *     responses:
 *       200:
 *         description: Status.
 */
router.get(
  '/status',
  authMiddleware.authenticate,
  requireSelfActor,
  async (req, res, next) => {
    try {
      res.status(200).json(await googleSheetsService.getStatus(req.userId));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
