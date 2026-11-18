# Google Sheets Export

The Google Sheets export copies your whole food log and health history into a spreadsheet in your own Google Drive and rewrites it on every sync (daily by default). The sheet always holds the latest data, so you can point an AI assistant such as Claude or Gemini at it, or build your own charts.

Each sync replaces the SparkyFitness tabs completely. Edits you make inside those tabs are overwritten; tabs you add yourself are left alone.

Every tab has a bold header row with readable column names (units in brackets), lists the newest rows first and fits its columns to their contents. Food log and Daily summary are always there; the other tabs appear once you log something they hold, and columns you never fill in are left out. Because of that, a column can move when you first log something new (a brand, a goal), so in charts and formulas look columns up by their header (for example with `MATCH("Calories (kcal)", 'Food log'!1:1, 0)`) rather than by letter.

## What the spreadsheet holds

| Tab                 | One row per                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Food log            | Diary food entry: date, time, meal, food, brand, quantity and every nutrient scaled to what you ate, plus your custom nutrients |
| Daily summary       | Day: nutrient totals (supplements included), calorie and macro goals, exercise and active calories, water and water goal        |
| Workouts            | Exercise entry, with duration, calories, distance, heart rate and other telemetry                                               |
| Strength sets       | Set: exercise, reps, weight (kg), duration, distance, RPE, RIR, rest                                                            |
| Body                | Check-in: weight, body fat, measurements, resting heart rate                                                                    |
| Custom measurements | Custom measurement reading                                                                                                      |
| Sleep               | Sleep entry: times, stages, score, overnight vitals                                                                             |
| Daily activity      | Day and source of synced device data: steps, calories, resting heart rate, VO2 max, training load, stress                       |
| Vitals              | Blood pressure, glucose, temperature or pulse reading                                                                           |
| Water               | Day's water total                                                                                                               |
| Mood                | Mood check-in                                                                                                                   |
| Fasting             | Fast                                                                                                                            |
| Mindfulness         | Mindfulness session                                                                                                             |
| Medications         | Logged dose                                                                                                                     |
| Symptoms            | Symptom entry (cycle symptoms excluded)                                                                                         |
| Lab results         | Lab result                                                                                                                      |

Cycle and pregnancy data are not exported.

Times are shown in the timezone set in your profile.

## Setup

The add form walks you through these steps with direct links to each Google Cloud page, and shows the redirect URI with a copy button. It takes about five minutes, once.

1. Turn on the [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com). If Google asks, create a project first (any name), or reuse the one you made for Google Health.
2. If you have not already, set up the [Google Auth Platform](https://console.cloud.google.com/auth/overview) (app name, your email, audience **External**). Then on [Audience](https://console.cloud.google.com/auth/audience), click **Publish app** so the connection is not revoked after 7 days. The export only asks for `drive.file`, a per-file permission: it reaches the spreadsheet SparkyFitness creates (and any file you open with or share to the app), never the rest of your Drive, so Google needs no verification review.
3. [Create an OAuth client](https://console.cloud.google.com/auth/clients/create) of type **Web application** with the authorized redirect URI `https://<your-sparkyfitness-url>/googlesheets/callback`.
4. In SparkyFitness, go to **Settings → Developer & Integrations → Food & Exercise Data Providers**, add a **Google Sheets** provider with the client ID and secret, and click **Add Provider**. Google opens straight away so you can allow access.

**Already use Google Health?** Leave the client ID and secret blank: the export uses your Google Health client. Turn on the Google Sheets API (step 1) in the project that holds that client, and add the redirect URI from step 3 to it.

If the Google Sheets API is still off when you connect, SparkyFitness says so and links to the switch. Turn it on, wait a minute, and press the refresh button on the provider card.

SparkyFitness creates a spreadsheet called **SparkyFitness export** in your Drive and fills it within a minute or so. Tabs you add yourself are left alone, and if one of yours already has an export tab's name, the export uses a name ending in "(SparkyFitness)" instead. You can rename the export's tabs. Use the refresh button on the provider card to export again now, and **Open the export spreadsheet** to open it. Disconnecting stops the export and keeps the spreadsheet; reconnecting writes to the same one. If you delete the spreadsheet, the next export creates a new one.

Only you can connect or run the export: someone with family access to your account cannot.
