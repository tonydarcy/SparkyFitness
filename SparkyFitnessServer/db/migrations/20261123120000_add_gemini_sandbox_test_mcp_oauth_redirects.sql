-- Allow all six of Google's Gemini OAuth callback patterns for Remote MCP OAuth.
-- Google's MCP OAuth guide lists production, sandbox and test hosts, each with
-- /r/ and /a/ paths. Gemini registers them together, and dynamic client
-- registration is refused unless every redirect URI is allowed, so allowing
-- only the two production patterns still blocked Gemini.
--
-- Existing installs: any allowlist that already holds both production Gemini
-- patterns (the shipped list, or an edited list that kept Gemini) gets the
-- four sandbox and test patterns appended. A list without them is left alone,
-- so an administrator who removed Gemini is not overridden. Re-runnable.

ALTER TABLE global_settings
  ALTER COLUMN mcp_oauth_allowed_redirect_uris SET DEFAULT ARRAY[
    'https://claude.ai/api/mcp/auth_callback',
    'https://claude.com/api/mcp/auth_callback',
    'https://oauth-redirect.googleusercontent.com/r/*',
    'https://oauth-redirect-sandbox.googleusercontent.com/r/*',
    'https://oauth-redirect-test.googleusercontent.com/r/*',
    'https://oauth-redirect.googleusercontent.com/a/*',
    'https://oauth-redirect-sandbox.googleusercontent.com/a/*',
    'https://oauth-redirect-test.googleusercontent.com/a/*',
    'http://localhost:*',
    'http://127.0.0.1:*',
    'http://[::1]:*'
  ]::text[];

UPDATE global_settings
SET mcp_oauth_allowed_redirect_uris = mcp_oauth_allowed_redirect_uris || ARRAY(
    SELECT pattern
    FROM unnest(ARRAY[
      'https://oauth-redirect-sandbox.googleusercontent.com/r/*',
      'https://oauth-redirect-test.googleusercontent.com/r/*',
      'https://oauth-redirect-sandbox.googleusercontent.com/a/*',
      'https://oauth-redirect-test.googleusercontent.com/a/*'
    ]::text[]) WITH ORDINALITY AS added(pattern, position)
    WHERE pattern <> ALL (mcp_oauth_allowed_redirect_uris)
    ORDER BY position
  )
WHERE mcp_oauth_allowed_redirect_uris @> ARRAY[
    'https://oauth-redirect.googleusercontent.com/r/*',
    'https://oauth-redirect.googleusercontent.com/a/*'
  ]::text[]
  AND NOT mcp_oauth_allowed_redirect_uris @> ARRAY[
    'https://oauth-redirect-sandbox.googleusercontent.com/r/*',
    'https://oauth-redirect-test.googleusercontent.com/r/*',
    'https://oauth-redirect-sandbox.googleusercontent.com/a/*',
    'https://oauth-redirect-test.googleusercontent.com/a/*'
  ]::text[];
