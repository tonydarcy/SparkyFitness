import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CallbackStatus } from './CallbackStatus';
import { useLinkGoogleSheetsMutation } from '@/hooks/Integrations/useIntegrations';

import { useTranslation } from 'react-i18next';
const GoogleSheetsCallback = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(
    'Processing Google Sheets authorization...'
  );
  const { mutateAsync: linkGoogleSheetsAccount } =
    useLinkGoogleSheetsMutation();

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const processCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');

      if (!code) {
        setMessage('Error: Missing Google Sheets authorization code.');
        toast({
          title: t(
            'integrations.googleSheetsCallback.googleSheetsOAuthError',
            'Google Sheets OAuth Error'
          ),
          description: t(
            'integrations.googleSheetsCallback.missingAuthorizationCodeInCallback',
            'Missing authorization code in callback.'
          ),
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      try {
        await linkGoogleSheetsAccount({ code, state });
        setMessage('Google Sheets account successfully linked!');
      } catch (error: unknown) {
        console.error('Error processing Google Sheets callback:', error);
        setMessage('Error linking Google Sheets account.');
      } finally {
        setLoading(false);
        timeoutId = setTimeout(() => {
          navigate('/settings');
        }, 1500);
      }
    };

    processCallback();
    return () => clearTimeout(timeoutId);
  }, [location, navigate, toast, linkGoogleSheetsAccount, t]);

  return <CallbackStatus loading={loading} message={message} />;
};

export default GoogleSheetsCallback;
