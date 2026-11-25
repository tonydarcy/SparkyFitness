import { Link } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useExternalProvidersQuery } from '@/hooks/Settings/useExternalProviderSettings';

// Direct links to each Google Cloud page the setup needs, so nobody has to
// find them in the console's menus.
const SHEETS_API_URL =
  'https://console.cloud.google.com/apis/library/sheets.googleapis.com';
const AUTH_PLATFORM_URL = 'https://console.cloud.google.com/auth/overview';
const AUDIENCE_URL = 'https://console.cloud.google.com/auth/audience';
const CREATE_CLIENT_URL =
  'https://console.cloud.google.com/auth/clients/create';
const CLIENTS_URL = 'https://console.cloud.google.com/auth/clients';

const linkClass = 'text-blue-500 underline';
const external = (href: string) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={linkClass}
  />
);

interface GoogleSheetsSetupGuideProps {
  /** `add`: the add form, which connects straight after saving. */
  mode: 'add' | 'edit';
  onCopy: (text: string) => void | Promise<void>;
}

export const GoogleSheetsSetupGuide = ({
  mode,
  onCopy,
}: GoogleSheetsSetupGuideProps) => {
  const { t } = useTranslation();
  const { data: providers } = useExternalProvidersQuery();
  const hasGoogleHealth = (providers ?? []).some(
    (p) => p.provider_type === 'googlehealth'
  );
  const callbackUrl = `${window.location.origin}/googlesheets/callback`;

  return (
    <div className="col-span-2 rounded-md border bg-muted/40 p-3 text-sm space-y-2">
      {mode === 'add' && (
        <p className="rounded border bg-background/80 p-2 text-xs text-muted-foreground">
          <Trans
            i18nKey="settings.googleSheetsSetup.appsScriptAlternative"
            defaults="<strong>Want a simpler setup without Google Cloud?</strong> If your SparkyFitness server is reachable from the internet, try the <link>Apps Script quick setup in Data Management</link> instead. Use the OAuth setup below if your server runs on a private local network."
            components={{
              strong: <strong className="text-foreground" />,
              link: (
                <Link
                  to="/settings?section=data-management"
                  className={linkClass}
                />
              ),
            }}
          />
        </p>
      )}
      <p className="font-medium">
        {t(
          'settings.googleSheetsSetup.title',
          'Set up the export (about 5 minutes, once)'
        )}
      </p>
      {mode === 'add' && hasGoogleHealth && (
        <p className="text-muted-foreground">
          <Trans
            i18nKey="settings.googleSheetsSetup.reuseGoogleHealth"
            defaults="You already use Google Health, so you can skip making a new client: leave the Client ID and Client Secret blank to use the Google Health one. Do step 1 in the project that holds that client, then open <cloud>your Google Health client</cloud> and add the redirect URI from step 3 to it."
            components={{ cloud: external(CLIENTS_URL) }}
          />
        </p>
      )}
      <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
        <li>
          <Trans
            i18nKey="settings.googleSheetsSetup.step1"
            defaults="Turn on the <cloud>Google Sheets API</cloud>. If Google asks, create a project first (any name)."
            components={{ cloud: external(SHEETS_API_URL) }}
          />
        </li>
        <li>
          <Trans
            i18nKey="settings.googleSheetsSetup.step2"
            defaults="If you have not before, set up the <cloud>Google Auth Platform</cloud> (app name, your email, audience External). Then on <audience>Audience</audience>, click <strong>Publish app</strong>, so the connection does not expire after 7 days. No Google review is needed."
            components={{
              cloud: external(AUTH_PLATFORM_URL),
              audience: external(AUDIENCE_URL),
              strong: <strong />,
            }}
          />
        </li>
        <li>
          <Trans
            i18nKey="settings.googleSheetsSetup.step3"
            defaults="<cloud>Create an OAuth client</cloud> of type <strong>Web application</strong>, with this <strong>Authorized redirect URI</strong>:"
            components={{
              cloud: external(CREATE_CLIENT_URL),
              strong: <strong />,
            }}
          />
          <span className="flex items-center mt-1 font-mono text-xs break-all text-foreground">
            {callbackUrl}
            <Button
              variant="ghost"
              size="icon"
              className="ml-2 h-5 w-5 shrink-0"
              aria-label={t('settings.googleSheetsSetup.copy', 'Copy')}
              onClick={(e) => {
                e.preventDefault();
                void onCopy(callbackUrl);
              }}
            >
              <Clipboard className="h-4 w-4" />
            </Button>
          </span>
        </li>
        <li>
          {mode === 'add'
            ? t(
                'settings.googleSheetsSetup.step4Add',
                'Paste the Client ID and Client Secret here and click Add Provider. Google opens so you can allow access, and your spreadsheet fills in about a minute.'
              )
            : t(
                'settings.googleSheetsSetup.step4Edit',
                'Paste the Client ID and Client Secret here and save. Then on the provider card click Connect, or Disconnect and then Connect if it is already linked.'
              )}
        </li>
      </ol>
    </div>
  );
};
