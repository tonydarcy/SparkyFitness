-- Adds Google Sheets as an external provider type: a nightly export of the
-- person's food log and health data to a spreadsheet in their own Google Drive.
-- Tokens and the spreadsheet id live in the existing external_data_providers
-- columns, so no new table or RLS policy is needed.

INSERT INTO public.external_provider_types (id, display_name)
VALUES ('googlesheets', 'Google Sheets')
ON CONFLICT (id) DO NOTHING;
