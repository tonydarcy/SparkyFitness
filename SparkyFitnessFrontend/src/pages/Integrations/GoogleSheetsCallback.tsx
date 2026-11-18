import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CallbackStatus } from './CallbackStatus';
import { Button } from '@/components/ui/button';
import { useLinkGoogleSheetsMutation } from '@/hooks/Integrations/useIntegrations';

type LinkStatus =
  'processing' | 'missing' | 'linked' | 'failed' | 'apiDisabled';

const SHEETS_API_URL =
  'https://console.cloud.google.com/apis/library/sheets.googleapis.com';

const GoogleSheetsCallback = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LinkStatus>('processing');
  const { mutateAsync: linkGoogleSheetsAccount } =
    useLinkGoogleSheetsMutation();
  // Authorization codes are single-use: exchange each code/state pair once,
  // even if the effect runs again (a language load changes `t`, for example).
  const submittedRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    const key = `${code}|${state}`;
    if (submittedRef.current === key) return;
    submittedRef.current = key;

    const processCallback = async () => {
      if (!code || !state) {
        setStatus('missing');
        return;
      }
      let next: LinkStatus = 'linked';
      try {
        // The mutation shows its own error toast.
        await linkGoogleSheetsAccount({ code, state });
      } catch (error) {
        // Linked, but the Sheets API is off: the one setup step Google does
        // not check while signing in.
        next =
          (error as { code?: unknown } | null)?.code === 'SHEETS_API_DISABLED'
            ? 'apiDisabled'
            : 'failed';
      }
      if (mountedRef.current) setStatus(next);
    };
    void processCallback();
  }, [location.search, linkGoogleSheetsAccount]);

  // Back to Settings shortly after the outcome is shown. Cleared on unmount,
  // so leaving the page first never redirects from somewhere else.
  useEffect(() => {
    // A step is left for the person, so stay here until they act.
    if (status === 'processing' || status === 'apiDisabled') return;
    const timeoutId = setTimeout(() => navigate('/settings'), 1500);
    return () => clearTimeout(timeoutId);
  }, [status, navigate]);

  const messages: Record<LinkStatus, string> = {
    processing: t(
      'integrations.googleSheetsCallback.processing',
      'Processing Google Sheets authorization...'
    ),
    missing: t(
      'integrations.googleSheetsCallback.missingAuthorizationCodeInCallback',
      'Missing authorization code in callback.'
    ),
    linked: t(
      'integrations.googleSheetsCallback.linked',
      'Google Sheets linked. Your first export is running.'
    ),
    failed: t(
      'integrations.googleSheetsCallback.failed',
      'Error linking Google Sheets.'
    ),
    apiDisabled: t(
      'integrations.googleSheetsCallback.apiDisabled',
      'Google Sheets is linked, but the Google Sheets API is turned off in your Google Cloud project. Turn it on, wait a minute, then press the refresh button on the Google Sheets provider in Settings.'
    ),
  };

  if (status === 'apiDisabled') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-transparent">
        <div className="p-8 bg-card rounded-xl shadow-lg border text-center max-w-md w-full space-y-4">
          <p className="text-foreground">{messages.apiDisabled}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <a
                href={SHEETS_API_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t(
                  'integrations.googleSheetsCallback.turnOnApi',
                  'Turn on the Google Sheets API'
                )}
              </a>
            </Button>
            <Button variant="outline" onClick={() => navigate('/settings')}>
              {t(
                'integrations.googleSheetsCallback.backToSettings',
                'Back to Settings'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CallbackStatus
      loading={status === 'processing'}
      message={messages[status]}
    />
  );
};

export default GoogleSheetsCallback;
