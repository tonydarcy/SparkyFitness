-- Allow Gemini's OAuth callbacks for Remote MCP OAuth by default.
-- Gemini custom MCP apps redirect to a per-integration path below these
-- Google prefixes, so they are stored as HTTPS path-prefix patterns.
-- Only installs still on the original shipped allowlist are updated; an
-- administrator-edited list is left alone. Re-runnable.

ALTER TABLE global_settings
  ALTER COLUMN mcp_oauth_allowed_redirect_uris SET DEFAULT ARRAY[
    'https://claude.ai/api/mcp/auth_callback',
    'https://claude.com/api/mcp/auth_callback',
    'https://oauth-redirect.googleusercontent.com/r/*',
    'https://oauth-redirect.googleusercontent.com/a/*',
    'http://localhost:*',
    'http://127.0.0.1:*',
    'http://[::1]:*'
  ]::text[];

UPDATE global_settings
SET mcp_oauth_allowed_redirect_uris = ARRAY[
    'https://claude.ai/api/mcp/auth_callback',
    'https://claude.com/api/mcp/auth_callback',
    'https://oauth-redirect.googleusercontent.com/r/*',
    'https://oauth-redirect.googleusercontent.com/a/*',
    'http://localhost:*',
    'http://127.0.0.1:*',
    'http://[::1]:*'
  ]::text[]
WHERE mcp_oauth_allowed_redirect_uris = ARRAY[
    'https://claude.ai/api/mcp/auth_callback',
    'https://claude.com/api/mcp/auth_callback',
    'http://localhost:*',
    'http://127.0.0.1:*',
    'http://[::1]:*'
  ]::text[];
