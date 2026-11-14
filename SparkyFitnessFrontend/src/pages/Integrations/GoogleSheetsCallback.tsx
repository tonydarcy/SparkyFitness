import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CallbackStatus } from './CallbackStatus';
import { useLinkGoogleSheetsMutation } from '@/hooks/Integrations/useIntegrations';

type LinkStatus = 'processing' | 'missing' | 'linked' | 'failed';

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
      } catch {
        next = 'failed';
      }
      if (mountedRef.current) setStatus(next);
    };
    void processCallback();
  }, [location.search, linkGoogleSheetsAccount]);

  // Back to Settings shortly after the outcome is shown. Cleared on unmount,
  // so leaving the page first never redirects from somewhere else.
  useEffect(() => {
    if (status === 'processing') return;
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
  };

  return (
    <CallbackStatus
      loading={status === 'processing'}
      message={messages[status]}
    />
  );
};

export default GoogleSheetsCallback;
