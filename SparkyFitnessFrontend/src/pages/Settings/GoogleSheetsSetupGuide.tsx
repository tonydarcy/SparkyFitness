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
  onCopy: (text: string) => void;
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
      <p className="font-medium">
        {t(
          'settings.googleSheetsSetup.title',
          'Set up the export (about 5 minutes, once)'
        )}
      </p>
      {hasGoogleHealth && (
        <p className="text-muted-foreground">
          <Trans
            i18nKey="settings.googleSheetsSetup.reuseGoogleHealth"
            defaults="You already use Google Health, so you can skip making a new client: leave the Client ID and Client Secret blank to use the Google Health one. Do step 1, then open <link>your Google Health client</link> and add the redirect URI from step 3 to it."
            components={{ link: external(CLIENTS_URL) }}
          />
        </p>
      )}
      <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
        <li>
          <Trans
            i18nKey="settings.googleSheetsSetup.step1"
            defaults="Turn on the <link>Google Sheets API</link>. If Google asks, create a project first (any name)."
            components={{ link: external(SHEETS_API_URL) }}
          />
        </li>
        <li>
          <Trans
            i18nKey="settings.googleSheetsSetup.step2"
            defaults="If you have not before, set up the <link>Google Auth Platform</link> (app name, your email, audience External). Then on <audience>Audience</audience>, click <strong>Publish app</strong>, so the connection does not expire after 7 days. No Google review is needed."
            components={{
              link: external(AUTH_PLATFORM_URL),
              audience: external(AUDIENCE_URL),
              strong: <strong />,
            }}
          />
        </li>
        <li>
          <Trans
            i18nKey="settings.googleSheetsSetup.step3"
            defaults="<link>Create an OAuth client</link> of type <strong>Web application</strong>, with this <strong>Authorized redirect URI</strong>:"
            components={{
              link: external(CREATE_CLIENT_URL),
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
                onCopy(callbackUrl);
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
                'Paste the Client ID and Client Secret here, save, then click Connect on the provider card.'
              )}
        </li>
      </ol>
    </div>
  );
};
