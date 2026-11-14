# Google Sheets Export

The Google Sheets export copies your whole food log and health history into a spreadsheet in your own Google Drive and rewrites it on every sync (daily by default). The sheet always holds the latest data, so you can point an AI assistant such as Claude or Gemini at it, or build your own charts.

Each sync replaces the SparkyFitness tabs completely. Edits you make inside those tabs are overwritten; tabs you add yourself are left alone.

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

1. In the [Google Cloud Console](https://console.cloud.google.com), create a project (or reuse the one you made for Google Health).
2. Under **APIs & Services → Library**, enable the **Google Sheets API**.
3. Under **APIs & Services → OAuth consent screen**, choose **External**, add the scope `https://www.googleapis.com/auth/drive.file`, add yourself as a test user and **publish** the app so the refresh token is not revoked after 7 days. `drive.file` only reaches files SparkyFitness creates, so Google needs no verification review.
4. Under **APIs & Services → Credentials**, create an **OAuth 2.0 Client ID** of type **Web application** with the redirect URI `https://<your-sparkyfitness-url>/googlesheets/callback`.
5. In SparkyFitness, go to **Settings → External Providers**, add a **Google Sheets** provider with the client ID and secret, and click **Connect**.

SparkyFitness creates a spreadsheet called **SparkyFitness export** in your Drive and fills it within a minute or so. Tabs you add yourself are left alone, and if one of yours already has an export tab's name, the export uses a name ending in "(SparkyFitness)" instead. You can rename the export's tabs. Use the refresh button on the provider card to export again now, and **Open the export spreadsheet** to open it. Disconnecting stops the export and keeps the spreadsheet; reconnecting writes to the same one. If you delete the spreadsheet, the next export creates a new one.

Only you can connect or run the export: someone with family access to your account cannot.
