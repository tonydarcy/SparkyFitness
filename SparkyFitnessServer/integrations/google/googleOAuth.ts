import axios from 'axios';
import { getSystemClient } from '../../db/poolManager.js';
import { encrypt, decrypt, ENCRYPTION_KEY } from '../../security/encryption.js';
import { log } from '../../config/logging.js';
import { withProviderTokenLock } from '../../models/externalProviderRepository.js';

// Shared Google OAuth 2.0 flow for providers that store the person's own
// Google client ID/secret in external_data_providers (Google Health, Google
// Sheets). Each provider passes its provider_type and a label for messages.

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface GoogleOAuthProvider {
  providerType: string;
  label: string;
}

async function decryptField(
  text: string,
  iv: string,
  tag: string
): Promise<string> {
  return (await decrypt(text, iv, tag, ENCRYPTION_KEY)) as string;
}

export async function getAuthorizationUrl(
  provider: GoogleOAuthProvider,
  userId: string,
  redirectUri: string,
  scopes: string,
  state: string = userId
): Promise<string> {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `SELECT encrypted_app_id, app_id_iv, app_id_tag
       FROM external_data_providers
       WHERE user_id = $1 AND provider_type = $2`,
      [userId, provider.providerType]
    );
    if (result.rows.length === 0) {
      throw new Error(
        `${provider.label} client credentials not found for user.`
      );
    }
    const { encrypted_app_id, app_id_iv, app_id_tag } = result.rows[0];
    const clientId = await decryptField(
      encrypted_app_id,
      app_id_iv,
      app_id_tag
    );
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent', // force refresh_token to always be returned
      state,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  } finally {
    client.release();
  }
}

/**
 * Exchanges an authorization code for tokens and stores them on the
 * provider row. Returns the new access token so a provider can finish its own
 * setup (Google Sheets creates its spreadsheet with it).
 */
export async function exchangeCodeForTokens(
  provider: GoogleOAuthProvider,
  userId: string,
  code: string,
  redirectUri: string,
  externalUserId: string = 'google'
): Promise<{ success: true; externalUserId: string; accessToken: string }> {
  const client = await getSystemClient();
  try {
    const providerResult = await client.query(
      `SELECT encrypted_app_id, app_id_iv, app_id_tag, encrypted_app_key, app_key_iv, app_key_tag
       FROM external_data_providers
       WHERE user_id = $1 AND provider_type = $2`,
      [userId, provider.providerType]
    );
    if (providerResult.rows.length === 0) {
      throw new Error(
        `${provider.label} client credentials not found for user.`
      );
    }
    const row = providerResult.rows[0];
    const clientId = await decryptField(
      row.encrypted_app_id,
      row.app_id_iv,
      row.app_id_tag
    );
    const clientSecret = await decryptField(
      row.encrypted_app_key,
      row.app_key_iv,
      row.app_key_tag
    );

    // Google uses POST body params (not HTTP Basic auth)
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const response = await axios.post(GOOGLE_TOKEN_URL, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, refresh_token, expires_in, scope } = response.data;
    if (!access_token || !refresh_token) {
      throw new Error(
        'Missing access_token or refresh_token in Google OAuth response.'
      );
    }

    const encryptedAccessToken = await encrypt(access_token, ENCRYPTION_KEY);
    const encryptedRefreshToken = await encrypt(refresh_token, ENCRYPTION_KEY);
    const expiresIn = Number(expires_in) || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await client.query(
      `UPDATE external_data_providers
       SET encrypted_access_token = $1, access_token_iv = $2, access_token_tag = $3,
           encrypted_refresh_token = $4, refresh_token_iv = $5, refresh_token_tag = $6,
           scope = $7, token_expires_at = $8, external_user_id = $9, is_active = TRUE, updated_at = NOW()
       WHERE user_id = $10 AND provider_type = $11`,
      [
        encryptedAccessToken.encryptedText,
        encryptedAccessToken.iv,
        encryptedAccessToken.tag,
        encryptedRefreshToken.encryptedText,
        encryptedRefreshToken.iv,
        encryptedRefreshToken.tag,
        scope,
        tokenExpiresAt,
        externalUserId,
        userId,
        provider.providerType,
      ]
    );
    return { success: true, externalUserId, accessToken: access_token };
  } catch (error) {
    log(
      'error',
      `Error exchanging code for ${provider.label} tokens: ${(error as Error).message}`
    );
    throw error;
  } finally {
    client.release();
  }
}

export async function refreshAccessToken(
  provider: GoogleOAuthProvider,
  userId: string
): Promise<string> {
  const client = await getSystemClient();
  try {
    return await withProviderTokenLock(client, async () => {
      const providerResult = await client.query(
        `SELECT encrypted_app_id, app_id_iv, app_id_tag, encrypted_app_key, app_key_iv, app_key_tag,
              encrypted_refresh_token, refresh_token_iv, refresh_token_tag
       FROM external_data_providers
       WHERE user_id = $1 AND provider_type = $2
       FOR UPDATE`,
        [userId, provider.providerType]
      );
      if (providerResult.rows.length === 0) {
        throw new Error(
          `${provider.label} credentials not found for token refresh.`
        );
      }
      const row = providerResult.rows[0];
      const clientId = await decryptField(
        row.encrypted_app_id,
        row.app_id_iv,
        row.app_id_tag
      );
      const clientSecret = await decryptField(
        row.encrypted_app_key,
        row.app_key_iv,
        row.app_key_tag
      );
      const refreshToken = await decryptField(
        row.encrypted_refresh_token,
        row.refresh_token_iv,
        row.refresh_token_tag
      );

      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', refreshToken);
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);

      const response = await axios.post(GOOGLE_TOKEN_URL, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const {
        access_token,
        refresh_token: newRefreshToken,
        expires_in,
        scope,
      } = response.data;

      const encryptedAccessToken = await encrypt(access_token, ENCRYPTION_KEY);
      const expiresIn = Number(expires_in) || 3600;
      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      // Google may or may not return a new refresh token on each refresh
      if (newRefreshToken) {
        const encryptedNewRefreshToken = await encrypt(
          newRefreshToken,
          ENCRYPTION_KEY
        );
        await client.query(
          `UPDATE external_data_providers
         SET encrypted_access_token = $1, access_token_iv = $2, access_token_tag = $3,
             encrypted_refresh_token = $4, refresh_token_iv = $5, refresh_token_tag = $6,
             scope = $7, token_expires_at = $8, updated_at = NOW()
         WHERE user_id = $9 AND provider_type = $10`,
          [
            encryptedAccessToken.encryptedText,
            encryptedAccessToken.iv,
            encryptedAccessToken.tag,
            encryptedNewRefreshToken.encryptedText,
            encryptedNewRefreshToken.iv,
            encryptedNewRefreshToken.tag,
            scope,
            tokenExpiresAt,
            userId,
            provider.providerType,
          ]
        );
      } else {
        await client.query(
          `UPDATE external_data_providers
         SET encrypted_access_token = $1, access_token_iv = $2, access_token_tag = $3,
             scope = $4, token_expires_at = $5, updated_at = NOW()
         WHERE user_id = $6 AND provider_type = $7`,
          [
            encryptedAccessToken.encryptedText,
            encryptedAccessToken.iv,
            encryptedAccessToken.tag,
            scope,
            tokenExpiresAt,
            userId,
            provider.providerType,
          ]
        );
      }
      return access_token as string;
    });
  } catch (error) {
    const googleError = (error as { response?: { data?: unknown } })?.response
      ?.data;
    const detail = googleError
      ? ` — Google: ${JSON.stringify(googleError)}`
      : '';
    log(
      'error',
      `Error refreshing ${provider.label} access token: ${(error as Error).message}${detail}`
    );
    throw error;
  } finally {
    client.release();
  }
}

export async function getValidAccessToken(
  provider: GoogleOAuthProvider,
  userId: string
): Promise<string | null> {
  const client = await getSystemClient();
  let row: {
    encrypted_access_token: string | null;
    access_token_iv: string;
    access_token_tag: string;
    token_expires_at: Date | string | null;
  };
  try {
    const result = await client.query(
      `SELECT encrypted_access_token, access_token_iv, access_token_tag, token_expires_at
       FROM external_data_providers
       WHERE user_id = $1 AND provider_type = $2`,
      [userId, provider.providerType]
    );
    if (result.rows.length === 0)
      throw new Error(`${provider.label} provider not found for user.`);
    row = result.rows[0];
  } finally {
    client.release();
  }
  if (!row.encrypted_access_token) return null;
  if (
    !row.token_expires_at ||
    new Date(row.token_expires_at) < new Date(Date.now() + 5 * 60 * 1000)
  ) {
    return await refreshAccessToken(provider, userId);
  }
  return await decryptField(
    row.encrypted_access_token,
    row.access_token_iv,
    row.access_token_tag
  );
}

export async function getStatus(provider: GoogleOAuthProvider, userId: string) {
  const client = await getSystemClient();
  try {
    const result = await client.query(
      `SELECT is_active, last_sync_at, token_expires_at, external_user_id
       FROM external_data_providers
       WHERE user_id = $1 AND provider_type = $2`,
      [userId, provider.providerType]
    );
    if (result.rows.length === 0) return { connected: false, isActive: false };
    const { is_active, last_sync_at, token_expires_at, external_user_id } =
      result.rows[0];
    return {
      connected: !!external_user_id,
      isActive: is_active,
      lastSyncAt: last_sync_at,
      tokenExpiresAt: token_expires_at,
      externalUserId: external_user_id,
    };
  } finally {
    client.release();
  }
}

/** Revokes the access token with Google (best effort) and clears the stored tokens. */
export async function disconnect(
  provider: GoogleOAuthProvider,
  userId: string
): Promise<{ success: true }> {
  const client = await getSystemClient();
  try {
    // Revocation failure is non-fatal — tokens are cleared regardless.
    try {
      const tokenResult = await client.query(
        `SELECT encrypted_access_token, access_token_iv, access_token_tag
         FROM external_data_providers
         WHERE user_id = $1 AND provider_type = $2`,
        [userId, provider.providerType]
      );
      const tokenRow = tokenResult.rows[0];
      if (tokenRow?.encrypted_access_token) {
        const accessToken = await decryptField(
          tokenRow.encrypted_access_token,
          tokenRow.access_token_iv,
          tokenRow.access_token_tag
        );
        await axios.post(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`
        );
        log(
          'info',
          `Revoked ${provider.label} access token for user ${userId}.`
        );
      }
    } catch (revokeError) {
      log(
        'warn',
        `Failed to revoke ${provider.label} token for user ${userId} (non-fatal): ${(revokeError as Error).message}`
      );
    }

    await client.query(
      `UPDATE external_data_providers
       SET encrypted_access_token = NULL, access_token_iv = NULL, access_token_tag = NULL,
           encrypted_refresh_token = NULL, refresh_token_iv = NULL, refresh_token_tag = NULL,
           token_expires_at = NULL, external_user_id = NULL, is_active = FALSE, updated_at = NOW()
       WHERE user_id = $1 AND provider_type = $2`,
      [userId, provider.providerType]
    );
    return { success: true };
  } finally {
    client.release();
  }
}
