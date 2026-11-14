-- Adds Google Sheets as an external provider type: a nightly export of the
-- person's food log and health data to a spreadsheet in their own Google Drive.
-- Tokens and the spreadsheet id live in the existing external_data_providers
-- columns, so no new table or RLS policy is needed.

INSERT INTO public.external_provider_types (id, display_name)
VALUES ('googlesheets', 'Google Sheets')
ON CONFLICT (id) DO NOTHING;

-- One export per person: the Sheets routes act on the person's single
-- googlesheets row, so a second row would share its tokens and spreadsheet.
CREATE UNIQUE INDEX IF NOT EXISTS external_data_providers_one_googlesheets_per_user
  ON public.external_data_providers (user_id)
  WHERE provider_type = 'googlesheets';
