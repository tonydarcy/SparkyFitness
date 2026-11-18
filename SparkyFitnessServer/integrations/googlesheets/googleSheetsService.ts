import axios from 'axios';
import { getSystemClient } from '../../db/poolManager.js';
import { log } from '../../config/logging.js';
import {
  noteWorkActivity,
  throwIfWorkAborted,
} from '../../utils/abortScope.js';
import * as googleOAuth from '../google/googleOAuth.js';
import { claimOAuthState, persistOAuthState } from '../../utils/oauthState.js';
import { buildExportTabs, type SheetTab } from './googleSheetsExport.js';

// Google Sheets export: the person links their own Google OAuth client, the
// server creates one spreadsheet in their Drive and rewrites its tabs on every
// sync, so the sheet always mirrors what SparkyFitness holds.

export const GOOGLE_SHEETS_OAUTH: googleOAuth.GoogleOAuthProvider = {
  providerType: 'googlesheets',
  label: 'Google Sheets',
  // A Sheets provider saved without a client of its own uses the person's
  // Google Health client, so one Google Cloud client serves both.
  credentialFallbackTypes: ['googlehealth'],
};

const SHEETS_API_LIBRARY_URL =
  'https://console.cloud.google.com/apis/library/sheets.googleapis.com';

/** The Google Sheets API is turned off in the person's Google Cloud project. */
export class SheetsApiDisabledError extends Error {
  constructor(readonly activationUrl: string) {
    super(
      'Google Sheets is linked, but the Google Sheets API is turned off in your Google Cloud project. Turn it on, wait a minute, then press the refresh button on the Google Sheets provider.'
    );
    this.name = 'SheetsApiDisabledError';
  }
}

interface GoogleApiErrorBody {
  error?: {
    message?: string;
    details?: {
      reason?: string;
      metadata?: { activationUrl?: string };
    }[];
  };
}

/**
 * Recognises Google's "API has not been used in project ... or it is
 * disabled" answer, which every Sheets call gets until the API is turned on.
 */
export function sheetsApiDisabledError(
  error: unknown
): SheetsApiDisabledError | null {
  const response = (
    error as { response?: { status?: number; data?: GoogleApiErrorBody } }
  ).response;
  if (response?.status !== 403) return null;
  const body = response.data?.error;
  const info = body?.details?.find((d) => d.reason === 'SERVICE_DISABLED');
  const disabled =
    info !== undefined ||
    /has not been used in project|it is disabled/i.test(body?.message ?? '');
  if (!disabled) return null;
  const url = info?.metadata?.activationUrl;
  return new SheetsApiDisabledError(
    url && url.startsWith('https://') ? url : SHEETS_API_LIBRARY_URL
  );
}

// drive.file only reaches files this app created, so it is a non-sensitive
// scope: no Google verification review, and no access to the rest of Drive.
const GOOGLE_SHEETS_SCOPES = 'https://www.googleapis.com/auth/drive.file';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_TITLE = 'SparkyFitness export';
// Keeps each write request well under the API's payload limit.
const ROWS_PER_WRITE = 5000;

const SPREADSHEET_ID_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;

export function spreadsheetIdFromUrl(url: string | null | undefined) {
  if (!url) return null;
  return SPREADSHEET_ID_PATTERN.exec(url)?.[1] ?? null;
}

/** A1 reference to a tab (the whole tab without `cell`), title quoted. */
export function tabRange(title: string, cell?: string): string {
  const quoted = `'${title.replace(/'/g, "''")}'`;
  return cell ? `${quoted}!${cell}` : quoted;
}

async function getAuthorizationUrl(userId: string, redirectUri: string) {
  const client = await getSystemClient();
  let state: string;
  try {
    ({ state } = await persistOAuthState(client, {
      userId,
      providerType: 'googlesheets',
    }));
  } finally {
    client.release();
  }
  return googleOAuth.getAuthorizationUrl(
    GOOGLE_SHEETS_OAUTH,
    userId,
    redirectUri,
    GOOGLE_SHEETS_SCOPES,
    state
  );
}

async function getSpreadsheetUrl(userId: string): Promise<string | null> {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `SELECT base_url FROM external_data_providers
        WHERE user_id = $1 AND provider_type = $2`,
      [userId, GOOGLE_SHEETS_OAUTH.providerType]
    );
    return (result.rows[0]?.base_url as string | null) ?? null;
  } finally {
    client.release();
  }
}

async function saveSpreadsheetUrl(userId: string, url: string) {
  const client = await getSystemClient();
  try {
    await client.query(
      `UPDATE external_data_providers SET base_url = $1, updated_at = NOW()
        WHERE user_id = $2 AND provider_type = $3`,
      [url, userId, GOOGLE_SHEETS_OAUTH.providerType]
    );
  } finally {
    client.release();
  }
}

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

// Sheets answers 429 when the per-minute quota is used up and 503 when it is
// briefly unavailable; neither applied the request, so it is safe to repeat.
const RETRY_STATUSES = new Set([429, 503]);
const MAX_ATTEMPTS = 5;
const MAX_RETRY_DELAY_MS = 32000;

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs a Sheets request, retrying quota and availability errors with backoff. */
export async function withSheetsRetry<T>(
  request: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = wait
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    // A sync stopped after losing its claim must not send further requests.
    throwIfWorkAborted();
    try {
      const result = await request();
      noteWorkActivity();
      return result;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      if (
        status === undefined ||
        !RETRY_STATUSES.has(status) ||
        attempt >= MAX_ATTEMPTS
      ) {
        throw error;
      }
      const delay = Math.min(
        1000 * 2 ** (attempt - 1) + Math.random() * 1000,
        MAX_RETRY_DELAY_MS
      );
      log(
        'warn',
        `Google Sheets answered ${status}; retrying in ${Math.round(delay)} ms.`
      );
      await sleep(delay);
    }
  }
}

const sheetsPost = (url: string, body: unknown, accessToken: string) =>
  withSheetsRetry(() =>
    axios.post(url, body, { headers: authHeaders(accessToken) })
  );

async function createSpreadsheet(
  accessToken: string
): Promise<{ id: string; url: string }> {
  const response = await sheetsPost(
    SHEETS_API,
    { properties: { title: SPREADSHEET_TITLE } },
    accessToken
  );
  return {
    id: response.data.spreadsheetId,
    url: response.data.spreadsheetUrl,
  };
}

// Each tab the export writes carries this developer metadata, valued with the
// tab's export title, so a tab the person made (even one with the same name)
// is never overwritten, and a tab the person renamed is still found.
const TAB_METADATA_KEY = 'sparkyfitness-tab';

// Light grey behind the header row.
const HEADER_BACKGROUND = { red: 0.93, green: 0.94, blue: 0.96 };

export interface SheetInfo {
  sheetId: number;
  title: string;
  /** The export tab this sheet holds, or null for a sheet the person made. */
  exportTab: string | null;
}

interface SheetResource {
  properties: { sheetId: number; title: string };
  developerMetadata?: { metadataKey?: string; metadataValue?: string }[];
}

async function getSheets(
  accessToken: string,
  spreadsheetId: string
): Promise<SheetInfo[] | null> {
  try {
    const response = await withSheetsRetry(() =>
      axios.get(`${SHEETS_API}/${spreadsheetId}`, {
        headers: authHeaders(accessToken),
        params: {
          fields:
            'sheets(properties(sheetId,title),developerMetadata(metadataKey,metadataValue))',
        },
      })
    );
    return ((response.data.sheets ?? []) as SheetResource[]).map((s) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      exportTab:
        s.developerMetadata?.find((m) => m.metadataKey === TAB_METADATA_KEY)
          ?.metadataValue ?? null,
    }));
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response
      ?.status;
    // The API itself is off: the sheet is still there, so keep its link.
    if (sheetsApiDisabledError(error)) throw error;
    // Deleted, or made outside this app's drive.file reach: start a new one.
    if (status === 404 || status === 403) return null;
    throw error;
  }
}

/** Returns the person's spreadsheet, creating a new one when it is gone. */
async function ensureSpreadsheet(userId: string, accessToken: string) {
  const existingId = spreadsheetIdFromUrl(await getSpreadsheetUrl(userId));
  if (existingId) {
    const sheets = await getSheets(accessToken, existingId);
    if (sheets) return { id: existingId, sheets, created: false };
  }
  const created = await createSpreadsheet(accessToken);
  await saveSpreadsheetUrl(userId, created.url);
  log('info', `Created Google Sheets export spreadsheet for user ${userId}.`);
  const sheets = (await getSheets(accessToken, created.id)) ?? [];
  return { id: created.id, sheets, created: true };
}

/**
 * Sizes each export tab to its data (adding missing ones), clears it and
 * writes it again, with a bold header row and columns fitted to their
 * contents. Export tabs not in `tabs` (nothing logged there any more) are
 * removed. Sheets without the export's metadata belong to the person and are
 * left alone, except in a spreadsheet just created (`created`), whose empty
 * starter sheet is removed once the export's tabs exist.
 */
export async function writeTabs(
  accessToken: string,
  spreadsheetId: string,
  existing: SheetInfo[],
  tabs: SheetTab[],
  created = false
) {
  const owned = new Map(
    existing
      .filter((s) => s.exportTab !== null)
      .map((s) => [s.exportTab as string, s])
  );
  const usedTitles = new Set(existing.map((s) => s.title));
  let nextSheetId = Math.max(0, ...existing.map((s) => s.sheetId)) + 1;
  const requests: Record<string, unknown>[] = [];
  const titles: string[] = [];
  const sheetIds: number[] = [];
  for (const tab of tabs) {
    const gridProperties = {
      rowCount: Math.max(tab.rows.length, 1),
      columnCount: Math.max(...tab.rows.map((r) => r.length), 1),
      frozenRowCount: tab.rows.length > 1 ? 1 : 0,
    };
    const sheet = owned.get(tab.title);
    if (sheet) {
      titles.push(sheet.title);
      sheetIds.push(sheet.sheetId);
      requests.push({
        updateSheetProperties: {
          properties: { sheetId: sheet.sheetId, gridProperties },
          fields:
            'gridProperties.rowCount,gridProperties.columnCount,gridProperties.frozenRowCount',
        },
      });
      continue;
    }
    let title = tab.title;
    for (let n = 1; usedTitles.has(title); n++) {
      title =
        n === 1
          ? `${tab.title} (SparkyFitness)`
          : `${tab.title} (SparkyFitness ${n})`;
    }
    usedTitles.add(title);
    titles.push(title);
    const sheetId = nextSheetId++;
    sheetIds.push(sheetId);
    requests.push(
      { addSheet: { properties: { sheetId, title, gridProperties } } },
      {
        createDeveloperMetadata: {
          developerMetadata: {
            metadataKey: TAB_METADATA_KEY,
            metadataValue: tab.title,
            location: { sheetId },
            visibility: 'DOCUMENT',
          },
        },
      }
    );
  }
  // A bold, shaded header row on every tab that has data.
  for (const [index, tab] of tabs.entries()) {
    if (tab.rows.length < 2) continue;
    requests.push({
      repeatCell: {
        range: { sheetId: sheetIds[index], startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
            backgroundColor: HEADER_BACKGROUND,
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)',
      },
    });
  }
  const wanted = new Set(tabs.map((tab) => tab.title));
  for (const sheet of existing) {
    // An export tab that no longer has data (or a starter sheet in a new
    // spreadsheet) goes; tabs the person made otherwise stay.
    const stale = sheet.exportTab !== null && !wanted.has(sheet.exportTab);
    const starter = created && sheet.exportTab === null;
    if (stale || starter) {
      requests.push({ deleteSheet: { sheetId: sheet.sheetId } });
    }
  }
  await sheetsPost(
    `${SHEETS_API}/${spreadsheetId}:batchUpdate`,
    { requests },
    accessToken
  );

  await sheetsPost(
    `${SHEETS_API}/${spreadsheetId}/values:batchClear`,
    { ranges: titles.map((title) => tabRange(title)) },
    accessToken
  );

  for (const [index, tab] of tabs.entries()) {
    for (let start = 0; start < tab.rows.length; start += ROWS_PER_WRITE) {
      await sheetsPost(
        `${SHEETS_API}/${spreadsheetId}/values:batchUpdate`,
        {
          valueInputOption: 'RAW',
          data: [
            {
              range: tabRange(titles[index], `A${start + 1}`),
              values: tab.rows.slice(start, start + ROWS_PER_WRITE),
            },
          ],
        },
        accessToken
      );
    }
  }

  // Fit each column to its contents once the values are in.
  await sheetsPost(
    `${SHEETS_API}/${spreadsheetId}:batchUpdate`,
    {
      requests: sheetIds.map((sheetId) => ({
        autoResizeDimensions: {
          dimensions: { sheetId, dimension: 'COLUMNS' },
        },
      })),
    },
    accessToken
  );
}

async function getAccessToken(userId: string): Promise<string> {
  const accessToken = await googleOAuth.getValidAccessToken(
    GOOGLE_SHEETS_OAUTH,
    userId
  );
  if (!accessToken) {
    throw new Error('Google Sheets is not connected for this user.');
  }
  return accessToken;
}

/** Rewrites the whole export. Returns the spreadsheet URL. */
async function syncGoogleSheets(userId: string): Promise<string> {
  const accessToken = await getAccessToken(userId);
  const tabs = await buildExportTabs(userId);
  let id: string;
  try {
    const spreadsheet = await ensureSpreadsheet(userId, accessToken);
    id = spreadsheet.id;
    await writeTabs(
      accessToken,
      id,
      spreadsheet.sheets,
      tabs,
      spreadsheet.created
    );
  } catch (error) {
    throw sheetsApiDisabledError(error) ?? error;
  }
  const client = await getSystemClient();
  try {
    await client.query(
      `UPDATE external_data_providers SET last_sync_at = NOW()
        WHERE user_id = $1 AND provider_type = $2`,
      [userId, GOOGLE_SHEETS_OAUTH.providerType]
    );
  } finally {
    client.release();
  }
  log('info', `Google Sheets export written for user ${userId}.`);
  return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}

/**
 * Finishes linking: checks the single-use state, stores the tokens and makes
 * sure the spreadsheet exists so the person can open it straight away.
 */
async function linkAccount(
  userId: string,
  code: string,
  state: unknown,
  redirectUri: string
) {
  const client = await getSystemClient();
  try {
    await claimOAuthState(client, {
      state,
      providerType: 'googlesheets',
      actorUserId: userId,
    });
  } finally {
    client.release();
  }
  const { accessToken } = await googleOAuth.exchangeCodeForTokens(
    GOOGLE_SHEETS_OAUTH,
    userId,
    code,
    redirectUri
  );
  try {
    await ensureSpreadsheet(userId, accessToken);
  } catch (error) {
    throw sheetsApiDisabledError(error) ?? error;
  }
}

/** The provider row's sync settings, read fresh for the scheduler. */
async function getSyncSettings(userId: string): Promise<{
  is_active: boolean;
  sync_frequency: string | null;
  last_sync_at: Date | null;
} | null> {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `SELECT is_active, sync_frequency, last_sync_at
         FROM external_data_providers
        WHERE user_id = $1 AND provider_type = $2`,
      [userId, GOOGLE_SHEETS_OAUTH.providerType]
    );
    return result.rows[0] ?? null;
  } finally {
    client.release();
  }
}

async function getStatus(userId: string) {
  const status = await googleOAuth.getStatus(GOOGLE_SHEETS_OAUTH, userId);
  const url = await getSpreadsheetUrl(userId);
  return { ...status, spreadsheetUrl: url };
}

function disconnect(userId: string) {
  // Keeps the spreadsheet link, so reconnecting writes to the same sheet.
  return googleOAuth.disconnect(GOOGLE_SHEETS_OAUTH, userId);
}

export default {
  getAuthorizationUrl,
  linkAccount,
  syncGoogleSheets,
  getSyncSettings,
  getStatus,
  disconnect,
};
