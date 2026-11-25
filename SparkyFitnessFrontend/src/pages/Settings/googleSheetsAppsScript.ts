/**
 * Optional link to a public read-only Google Sheet that already has the script
 * below installed (ending in `/copy` so Google opens "Make a copy" directly).
 *
 * Example: 'https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/copy'
 *
 * When empty, the Settings UI shows the "Open new Google Sheet" + "Copy script"
 * flow directly. When populated, it adds a one-click "Copy template spreadsheet"
 * button above the manual paste option.
 */
export const GOOGLE_SHEETS_TEMPLATE_URL = '';

export const GOOGLE_SHEETS_APPS_SCRIPT = `/**
 * SparkyFitness -> Google Sheets sync (Apps Script)
 *
 * Pulls your formatted SparkyFitness export tabs via a read-only API key and
 * writes them into this spreadsheet. Tabs you create yourself are never
 * touched, and you can rename SparkyFitness tabs without breaking future syncs.
 */

const PROP_SERVER_URL = 'SPARKYFITNESS_SERVER_URL';
const PROP_API_KEY = 'SPARKYFITNESS_API_KEY';
const PROP_LAST_SYNC_AT = 'SPARKYFITNESS_LAST_SYNC_AT';
const TAB_METADATA_KEY = 'sparkyfitness-tab';
const HEADER_BACKGROUND = '#edf0f5';
const ROWS_PER_WRITE = 5000;
const LOCK_WAIT_MS = 30000;
const SYNC_HANDLER = 'syncSparkyFitness';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SparkyFitness')
    .addItem('Connect / Settings...', 'setupSparkyFitness')
    .addItem('Sync now', 'syncSparkyFitnessInteractive')
    .addSeparator()
    .addItem('Schedule: Daily (6 AM)', 'scheduleDaily')
    .addItem('Schedule: Hourly', 'scheduleHourly')
    .addItem('Pause automatic sync', 'pauseSync')
    .addSeparator()
    .addItem('Disconnect (forget key)', 'disconnectSparkyFitness')
    .addToUi();
}

function setupSparkyFitness() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  const currentUrl = props.getProperty(PROP_SERVER_URL) || '';

  const urlPrompt = ui.prompt(
    'SparkyFitness — Step 1 of 2',
    'Enter your SparkyFitness server URL (for example: https://fitness.example.com)' +
      (currentUrl ? '\\nCurrent: ' + currentUrl : ''),
    ui.ButtonSet.OK_CANCEL
  );
  if (urlPrompt.getSelectedButton() !== ui.Button.OK) return;

  const serverUrl = normalizeServerUrl_(urlPrompt.getResponseText());
  if (!serverUrl) {
    ui.alert('Please enter a valid http:// or https:// URL.');
    return;
  }

  const keyPrompt = ui.prompt(
    'SparkyFitness — Step 2 of 2',
    'Paste your SparkyFitness read-only API key:',
    ui.ButtonSet.OK_CANCEL
  );
  if (keyPrompt.getSelectedButton() !== ui.Button.OK) return;

  const apiKey = keyPrompt.getResponseText().trim();
  if (!apiKey) {
    ui.alert('API key cannot be empty.');
    return;
  }

  props.setProperty(PROP_SERVER_URL, serverUrl);
  props.setProperty(PROP_API_KEY, apiKey);

  try {
    const tabCount = runSync_(true);
    replaceSyncTrigger_(function () {
      ScriptApp.newTrigger(SYNC_HANDLER).timeBased().everyDays(1).atHour(6).create();
    });

    ui.alert(
      'Connected to SparkyFitness',
      'Synced ' +
        tabCount +
        ' tab(s). Automatic daily sync (6 AM) is now enabled. You can change the schedule anytime from the SparkyFitness menu.',
      ui.ButtonSet.OK
    );
  } catch (err) {
    ui.alert(
      'Could not connect to SparkyFitness',
      String(err && err.message ? err.message : err) +
        '\\n\\nYour URL and key were saved so you can fix them and try again from SparkyFitness -> Connect / Settings...',
      ui.ButtonSet.OK
    );
  }
}

function syncSparkyFitnessInteractive() {
  const ui = SpreadsheetApp.getUi();
  try {
    const tabCount = runSync_(true);
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Synced ' + tabCount + ' tab(s) from SparkyFitness.',
      'SparkyFitness',
      5
    );
  } catch (err) {
    ui.alert('SparkyFitness sync failed', String(err && err.message ? err.message : err), ui.ButtonSet.OK);
  }
}

function syncSparkyFitness() {
  runSync_(false);
}

function scheduleDaily() {
  replaceSyncTrigger_(function () {
    ScriptApp.newTrigger(SYNC_HANDLER).timeBased().everyDays(1).atHour(6).create();
  });
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Automatic sync scheduled daily at 6 AM.',
    'SparkyFitness',
    5
  );
}

function scheduleHourly() {
  replaceSyncTrigger_(function () {
    ScriptApp.newTrigger(SYNC_HANDLER).timeBased().everyHours(1).create();
  });
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Automatic sync scheduled every hour.',
    'SparkyFitness',
    5
  );
}

function pauseSync() {
  removeSyncTriggers_();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Automatic sync paused. Use SparkyFitness -> Sync now anytime.',
    'SparkyFitness',
    5
  );
}

function disconnectSparkyFitness() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    'Disconnect SparkyFitness?',
    'This removes your saved server URL, API key, and automatic sync schedule from this spreadsheet. Your existing tabs and data will be kept.',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  removeSyncTriggers_();
  const props = PropertiesService.getDocumentProperties();
  props.deleteProperty(PROP_SERVER_URL);
  props.deleteProperty(PROP_API_KEY);
  props.deleteProperty(PROP_LAST_SYNC_AT);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Disconnected from SparkyFitness.',
    'SparkyFitness',
    5
  );
}

function runSync_(interactive) {
  const props = PropertiesService.getDocumentProperties();
  const serverUrl = props.getProperty(PROP_SERVER_URL);
  const apiKey = props.getProperty(PROP_API_KEY);

  if (!serverUrl || !apiKey) {
    if (interactive) {
      throw new Error('Not connected yet. Open SparkyFitness -> Connect / Settings... first.');
    }
    return 0;
  }

  const endpoint = serverUrl + '/api/integrations/googlesheets/data';
  const response = UrlFetchApp.fetch(endpoint, {
    method: 'get',
    headers: {
      'x-api-key': apiKey,
      Accept: 'application/json',
    },
    muteHttpExceptions: true,
  });

  const status = response.getResponseCode();
  const bodyText = response.getContentText();

  if (status === 401 || status === 403) {
    throw new Error(
      'SparkyFitness rejected the API key (HTTP ' +
        status +
        '). Check or generate a new read-only API key in Settings.'
    );
  }
  if (status < 200 || status >= 300) {
    throw new Error(
      'SparkyFitness returned HTTP ' + status + ': ' + bodyText.slice(0, 200)
    );
  }

  const payload = JSON.parse(bodyText);
  const tabs = Array.isArray(payload && payload.tabs) ? payload.tabs : [];
  if (tabs.length === 0) {
    throw new Error('SparkyFitness returned no export tabs.');
  }

  const lock = LockService.getDocumentLock();
  if (!lock) {
    throw new Error(
      'This script must be bound to a Google Sheet (open it via Extensions -> Apps Script inside your spreadsheet).'
    );
  }
  if (!lock.tryLock(LOCK_WAIT_MS)) {
    throw new Error(
      'Another SparkyFitness sync is already running. Please try again in a moment.'
    );
  }

  try {
    writeExportTabs_(tabs);
    props.setProperty(PROP_LAST_SYNC_AT, new Date().toISOString());
    return tabs.length;
  } finally {
    lock.releaseLock();
  }
}

function writeExportTabs_(tabs) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existingSheets = ss.getSheets();
  const ownedByTab = {};
  const usedNames = {};

  for (var i = 0; i < existingSheets.length; i++) {
    var sheet = existingSheets[i];
    usedNames[sheet.getName()] = true;
    var exportKey = getExportTabKey_(sheet);
    if (exportKey) {
      ownedByTab[exportKey] = sheet;
    }
  }

  var wanted = {};
  for (var t = 0; t < tabs.length; t++) {
    var tab = tabs[t];
    wanted[tab.title] = true;
    var targetSheet = ownedByTab[tab.title];

    if (!targetSheet) {
      var sheetTitle = tab.title;
      for (var n = 1; usedNames[sheetTitle]; n++) {
        sheetTitle =
          n === 1
            ? tab.title + ' (SparkyFitness)'
            : tab.title + ' (SparkyFitness ' + n + ')';
      }
      usedNames[sheetTitle] = true;
      targetSheet = ss.insertSheet(sheetTitle);
      targetSheet.addDeveloperMetadata(
        TAB_METADATA_KEY,
        tab.title,
        SpreadsheetApp.DeveloperMetadataVisibility.DOCUMENT
      );
    }

    writeTabContents_(targetSheet, tab.rows || []);
  }

  // Remove export tabs that no longer have data; untagged tabs are always kept.
  var remaining = ss.getSheets();
  for (var r = 0; r < remaining.length; r++) {
    var candidate = remaining[r];
    if (ss.getSheets().length <= 1) break;
    var key = getExportTabKey_(candidate);
    if (key && !wanted[key]) {
      ss.deleteSheet(candidate);
    }
  }

  SpreadsheetApp.flush();
}

function writeTabContents_(sheet, rows) {
  sheet.clear();

  if (!rows || rows.length === 0) {
    sheet.setFrozenRows(0);
    return;
  }

  var colCount = 1;
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].length > colCount) colCount = rows[i].length;
  }

  for (var start = 0; start < rows.length; start += ROWS_PER_WRITE) {
    var end = Math.min(start + ROWS_PER_WRITE, rows.length);
    var chunk = [];
    for (var r = start; r < end; r++) {
      var src = rows[r];
      var out = new Array(colCount);
      for (var c = 0; c < colCount; c++) {
        out[c] = c < src.length ? sanitizeCell_(src[c]) : '';
      }
      chunk.push(out);
    }
    sheet.getRange(start + 1, 1, chunk.length, colCount).setValues(chunk);
  }

  if (rows.length > 1) {
    sheet.setFrozenRows(1);
    sheet
      .getRange(1, 1, 1, colCount)
      .setFontWeight('bold')
      .setBackground(HEADER_BACKGROUND);
  } else {
    sheet.setFrozenRows(0);
  }

  try {
    sheet.autoResizeColumns(1, colCount);
  } catch (err) {
    // Cosmetic only; data is already written.
  }
}

function sanitizeCell_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' && /^[=+\\-@]/.test(value)) {
    return "'" + value;
  }
  return value;
}

function getExportTabKey_(sheet) {
  var metadata = sheet.getDeveloperMetadata();
  for (var i = 0; i < metadata.length; i++) {
    if (metadata[i].getKey() === TAB_METADATA_KEY) {
      return metadata[i].getValue();
    }
  }
  return null;
}

function normalizeServerUrl_(raw) {
  var value = String(raw || '').trim().replace(/\\/+$/, '');
  value = value.replace(/\\/api\\/integrations\\/googlesheets\\/data$/i, '');
  value = value.replace(/\\/api$/i, '');
  if (!/^https?:\\/\\/[^\\s]+$/i.test(value)) return '';
  return value;
}

function removeSyncTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === SYNC_HANDLER) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function replaceSyncTrigger_(createFn) {
  removeSyncTriggers_();
  createFn();
}
`;
