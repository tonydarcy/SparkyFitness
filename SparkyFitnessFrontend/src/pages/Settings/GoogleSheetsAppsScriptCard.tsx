import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  ExternalLink,
  FileSpreadsheet,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useActiveUser } from '@/contexts/ActiveUserContext';
import { useCreateApiKeyMutation } from '@/hooks/Settings/useApiKeys';
import { useToast } from '@/hooks/use-toast';
import {
  GOOGLE_SHEETS_APPS_SCRIPT,
  GOOGLE_SHEETS_TEMPLATE_URL,
} from './googleSheetsAppsScript';

const NEW_SHEET_URL = 'https://sheets.new';

type CopiedField = 'url' | 'key' | 'script' | null;

export const GoogleSheetsAppsScriptCard = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isActingOnBehalf } = useActiveUser();
  const { mutateAsync: createKey, isPending: isGeneratingKey } =
    useCreateApiKeyMutation();

  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<CopiedField>(null);
  const [showScript, setShowScript] = useState(false);
  const [showManualSteps, setShowManualSteps] = useState(
    !GOOGLE_SHEETS_TEMPLATE_URL
  );

  const serverUrl = window.location.origin;

  const copyValue = async (
    value: string,
    field: Exclude<CopiedField, null>,
    label: string
  ) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 2000);
      toast({
        title: t('settings.googleSheetsAppsScript.copiedTitle', 'Copied'),
        description: t(
          'settings.googleSheetsAppsScript.copiedDescription',
          '{{label}} copied to your clipboard.',
          { label }
        ),
      });
    } catch {
      toast({
        title: t(
          'settings.googleSheetsAppsScript.copyFailedTitle',
          'Could not copy automatically'
        ),
        description: t(
          'settings.googleSheetsAppsScript.copyFailedDescription',
          'Select and copy the text manually.'
        ),
        variant: 'destructive',
      });
    }
  };

  const handleGenerateKey = async () => {
    try {
      const created = await createKey({
        name: t(
          'settings.googleSheetsAppsScript.defaultKeyName',
          'Google Sheets Export'
        ),
        expiresIn: null,
        scope: 'read',
      });
      if (created?.key) {
        setGeneratedKey(created.key);
      }
    } catch {
      // Error toast is already handled by useCreateApiKeyMutation.
    }
  };

  if (isActingOnBehalf) {
    return (
      <div className="flex flex-col gap-2 border-t pt-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">
            {t(
              'settings.googleSheetsAppsScript.title',
              'Google Sheets Export (Quick Setup)'
            )}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            'settings.googleSheetsAppsScript.ownerOnly',
            'Google Sheets export can only be set up for your own account.'
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 border-t pt-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">
            {t(
              'settings.googleSheetsAppsScript.title',
              'Google Sheets Export (Quick Setup)'
            )}
          </h3>
          <Badge variant="secondary">
            {t(
              'settings.googleSheetsAppsScript.noCloudBadge',
              'No Google Cloud needed'
            )}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            'settings.googleSheetsAppsScript.description',
            'Automatically sync your full food log and health history into a Google Sheet on a daily or hourly schedule using a read-only API key. Tabs you add yourself are never overwritten. Requires your SparkyFitness server to be reachable from the internet.'
          )}
        </p>
      </div>

      <ol className="space-y-4 text-sm">
        {/* Step 1: Server URL & Read-only API Key */}
        <li className="rounded-md border bg-muted/30 p-4 space-y-3">
          <p className="font-medium">
            {t(
              'settings.googleSheetsAppsScript.step1Title',
              '1. Get your Server URL and a read-only API key'
            )}
          </p>

          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t(
                  'settings.googleSheetsAppsScript.serverUrlLabel',
                  'Server URL'
                )}
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded border bg-background px-2.5 py-1.5 font-mono text-xs break-all">
                  {serverUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() =>
                    void copyValue(
                      serverUrl,
                      'url',
                      t(
                        'settings.googleSheetsAppsScript.serverUrlLabel',
                        'Server URL'
                      )
                    )
                  }
                >
                  {copiedField === 'url' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <ClipboardCopy className="h-4 w-4" />
                  )}
                  {copiedField === 'url'
                    ? t('settings.googleSheetsAppsScript.copied', 'Copied')
                    : t('settings.googleSheetsAppsScript.copy', 'Copy')}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t(
                  'settings.googleSheetsAppsScript.apiKeyLabel',
                  'Read-only API key'
                )}
              </span>
              {generatedKey ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded border border-amber-500/40 bg-background px-2.5 py-1.5 font-mono text-xs break-all">
                      {generatedKey}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5"
                      onClick={() =>
                        void copyValue(
                          generatedKey,
                          'key',
                          t(
                            'settings.googleSheetsAppsScript.apiKeyLabel',
                            'Read-only API key'
                          )
                        )
                      }
                    >
                      {copiedField === 'key' ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <ClipboardCopy className="h-4 w-4" />
                      )}
                      {copiedField === 'key'
                        ? t('settings.googleSheetsAppsScript.copied', 'Copied')
                        : t('settings.googleSheetsAppsScript.copy', 'Copy')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Trans
                      i18nKey="settings.googleSheetsAppsScript.keyNotice"
                      defaults="Copy this key now — it will not be shown again. It can only read your data, never change it. You can revoke it anytime under <link>API Key Management</link>."
                      components={{
                        link: (
                          <Link
                            to="/settings?section=api-settings"
                            className="text-primary underline"
                          />
                        ),
                      }}
                    />
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleGenerateKey()}
                    disabled={isGeneratingKey}
                    className="gap-1.5"
                  >
                    {isGeneratingKey ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    {isGeneratingKey
                      ? t(
                          'settings.googleSheetsAppsScript.generatingKey',
                          'Generating...'
                        )
                      : t(
                          'settings.googleSheetsAppsScript.generateKeyButton',
                          'Generate read-only API key'
                        )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t(
                      'settings.googleSheetsAppsScript.existingKeyHint',
                      'Or reuse any existing read-only API key you already created.'
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        </li>

        {/* Step 2: Get the script into a Google Sheet */}
        <li className="rounded-md border bg-muted/30 p-4 space-y-3">
          <p className="font-medium">
            {t(
              'settings.googleSheetsAppsScript.step2Title',
              '2. Add the sync script to a Google Sheet'
            )}
          </p>

          {GOOGLE_SHEETS_TEMPLATE_URL && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm" className="gap-1.5">
                  <a
                    href={GOOGLE_SHEETS_TEMPLATE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t(
                      'settings.googleSheetsAppsScript.copyTemplateButton',
                      'Copy template spreadsheet'
                    )}
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setShowManualSteps((v) => !v)}
                >
                  {showManualSteps ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {t(
                    'settings.googleSheetsAppsScript.manualOptionToggle',
                    'Or paste the script into a blank Sheet yourself'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  'settings.googleSheetsAppsScript.templateHint',
                  'Click "Make a copy" to save the ready-made spreadsheet to your own Google Drive.'
                )}
              </p>
            </div>
          )}

          {showManualSteps && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm" className="gap-1.5">
                  <a
                    href={NEW_SHEET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t(
                      'settings.googleSheetsAppsScript.openNewSheet',
                      'Open new Google Sheet'
                    )}
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    void copyValue(
                      GOOGLE_SHEETS_APPS_SCRIPT,
                      'script',
                      t(
                        'settings.googleSheetsAppsScript.scriptLabel',
                        'Apps Script'
                      )
                    )
                  }
                >
                  {copiedField === 'script' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <ClipboardCopy className="h-4 w-4" />
                  )}
                  {copiedField === 'script'
                    ? t(
                        'settings.googleSheetsAppsScript.scriptCopied',
                        'Script copied'
                      )
                    : t(
                        'settings.googleSheetsAppsScript.copyScript',
                        'Copy Apps Script'
                      )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => setShowScript((v) => !v)}
                >
                  {showScript ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {showScript
                    ? t(
                        'settings.googleSheetsAppsScript.hideScript',
                        'Hide script'
                      )
                    : t(
                        'settings.googleSheetsAppsScript.viewScript',
                        'View script'
                      )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <Trans
                  i18nKey="settings.googleSheetsAppsScript.pasteInstructions"
                  defaults="In your Google Sheet, open <strong>Extensions → Apps Script</strong>, replace the default code with the copied script, click <strong>Save</strong>, then reload your spreadsheet tab."
                  components={{ strong: <strong /> }}
                />
              </p>
              {showScript && (
                <pre className="max-h-64 overflow-auto rounded-md border bg-background p-3 font-mono text-xs leading-relaxed">
                  {GOOGLE_SHEETS_APPS_SCRIPT}
                </pre>
              )}
            </div>
          )}
        </li>

        {/* Step 3: Connect inside Google Sheets */}
        <li className="rounded-md border bg-muted/30 p-4 space-y-1.5">
          <p className="font-medium">
            {t(
              'settings.googleSheetsAppsScript.step3Title',
              '3. Connect inside your Google Sheet'
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            <Trans
              i18nKey="settings.googleSheetsAppsScript.step3Description"
              defaults="In the spreadsheet menu bar, click <strong>SparkyFitness → Connect / Settings...</strong> and paste your Server URL and read-only API key. The first time you run it, Google asks you to approve the script for this sheet (if Google shows an unverified warning, choose <strong>Advanced → Go to...</strong>). Your tabs fill right away and refresh automatically every day."
              components={{ strong: <strong /> }}
            />
          </p>
        </li>
      </ol>

      <p className="text-xs text-muted-foreground">
        <Trans
          i18nKey="settings.googleSheetsAppsScript.oauthFallbackNote"
          defaults="Hosting SparkyFitness strictly on a private local network (LAN / Tailscale) that Google cannot reach? Use the direct Google Cloud OAuth connection under <link>Developer & Integrations → Food & Exercise Data Providers</link> instead."
          components={{
            link: (
              <Link
                to="/settings?section=food-and-exercise-data-providers"
                className="text-primary underline"
              />
            ),
          }}
        />
      </p>
    </div>
  );
};
