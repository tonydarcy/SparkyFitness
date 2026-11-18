import { vi, beforeEach, describe, expect, it } from 'vitest';
import { getSystemClient } from '../db/poolManager.js';
import { decrypt } from '../security/encryption.js';
import axios from 'axios';
import {
  disconnect,
  getAuthorizationUrl,
  GoogleClientMissingError,
} from '../integrations/google/googleOAuth.js';

vi.mock('../config/logging.js', () => ({ log: vi.fn() }));
vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('../db/poolManager.js', () => ({ getSystemClient: vi.fn() }));
vi.mock('../security/encryption.js', () => ({
  ENCRYPTION_KEY: 'test-key',
  encrypt: vi.fn(),
  decrypt: vi.fn(),
}));

const SHEETS = {
  providerType: 'googlesheets',
  label: 'Google Sheets',
  credentialFallbackTypes: ['googlehealth'],
};

function mockRows(rows: Record<string, string>[]) {
  const client = {
    query: vi.fn().mockResolvedValue({ rows }),
    release: vi.fn(),
  };
  vi.mocked(getSystemClient).mockResolvedValue(
    client as unknown as Awaited<ReturnType<typeof getSystemClient>>
  );
  return client;
}

const credentialRow = (type: string) => ({
  provider_type: type,
  encrypted_app_id: `${type}-id`,
  app_id_iv: 'iv',
  app_id_tag: 'tag',
  encrypted_app_key: `${type}-secret`,
  app_key_iv: 'iv',
  app_key_tag: 'tag',
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(decrypt).mockImplementation(async (text) => `plain:${text}`);
});

describe('Google client credentials', () => {
  it("prefers the provider's own client over the fallback", async () => {
    const client = mockRows([
      credentialRow('googlehealth'),
      credentialRow('googlesheets'),
    ]);
    const url = await getAuthorizationUrl(SHEETS, 'u1', 'https://x/cb', 's');
    expect(new URL(url).searchParams.get('client_id')).toBe(
      'plain:googlesheets-id'
    );
    expect(client.query.mock.calls[0][1]).toEqual([
      'u1',
      ['googlesheets', 'googlehealth'],
    ]);
    expect(client.release).toHaveBeenCalled();
  });

  it('uses the Google Health client when Sheets has none', async () => {
    mockRows([credentialRow('googlehealth')]);
    const url = await getAuthorizationUrl(SHEETS, 'u1', 'https://x/cb', 's');
    expect(new URL(url).searchParams.get('client_id')).toBe(
      'plain:googlehealth-id'
    );
  });

  it('says what to add when there is no client at all', async () => {
    mockRows([]);
    await expect(
      getAuthorizationUrl(SHEETS, 'u1', 'https://x/cb', 's')
    ).rejects.toBeInstanceOf(GoogleClientMissingError);
  });
});

describe('disconnect', () => {
  const TOKEN = {
    encrypted_access_token: 'tok',
    access_token_iv: 'iv',
    access_token_tag: 'tag',
  };
  function mockDisconnect(
    shared: { provider_type: string; own_client: boolean }[]
  ) {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [TOKEN] })
        .mockResolvedValueOnce({ rows: shared })
        .mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    vi.mocked(getSystemClient).mockResolvedValue(
      client as unknown as Awaited<ReturnType<typeof getSystemClient>>
    );
    return client;
  }

  it('does not revoke a grant borrowed from linked Google Health', async () => {
    const client = mockDisconnect([
      { provider_type: 'googlesheets', own_client: false },
      { provider_type: 'googlehealth', own_client: true },
    ]);
    await disconnect(SHEETS, 'u1');
    expect(axios.post).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledTimes(3);
  });

  it('does not revoke Google Health while Sheets borrows its client', async () => {
    mockDisconnect([
      { provider_type: 'googlehealth', own_client: true },
      { provider_type: 'googlesheets', own_client: false },
    ]);
    await disconnect(
      { providerType: 'googlehealth', label: 'Google Health' },
      'u1'
    );
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('revokes a grant no other integration shares', async () => {
    mockDisconnect([
      { provider_type: 'googlesheets', own_client: true },
      { provider_type: 'googlehealth', own_client: true },
    ]);
    await disconnect(SHEETS, 'u1');
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});
