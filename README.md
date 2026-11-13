<p align="center">
  <b>English</b> ·
  <a href="docs/readme/README_zh-CN.md">简体中文</a> ·
  <a href="docs/readme/README_zh-TW.md">繁體中文</a> ·
  <a href="docs/readme/README_ja.md">日本語</a> ·
  <a href="docs/readme/README_ko.md">한국어</a> ·
  <a href="docs/readme/README_hi.md">हिन्दी</a> ·
  <a href="docs/readme/README_th.md">ไทย</a> ·
  <a href="docs/readme/README_fr.md">Français</a> ·
  <a href="docs/readme/README_de.md">Deutsch</a> ·
  <a href="docs/readme/README_es.md">Español</a> ·
  <a href="docs/readme/README_it.md">Italiano</a> ·
  <a href="docs/readme/README_ru.md">Русский</a> ·
  <a href="docs/readme/README_pt-BR.md">Português (Brasil)</a> ·
  <a href="docs/readme/README_nl.md">Nederlands</a> ·
  <a href="docs/readme/README_pl.md">Polski</a> ·
  <a href="docs/readme/README_ar.md">العربية</a> ·
  <a href="docs/readme/README_fa.md">فارسی</a> ·
  <a href="docs/readme/README_tr.md">Türkçe</a> ·
  <a href="docs/readme/README_vi.md">Tiếng Việt</a> ·
  <a href="docs/readme/README_id.md">Bahasa Indonesia</a>
</p>

# SparkyFitness

> [!NOTE]
> **This is Tony Darcy's fork of [CodeWithCJ/SparkyFitness](https://github.com/CodeWithCJ/SparkyFitness).** The `tdmain` branch is the fork's main branch: it tracks upstream and adds the features listed below. The `main` branch is an untouched mirror of upstream. For the official project, releases and support, use the upstream repository.

## What this fork adds

Everything in upstream SparkyFitness, plus:

### Food diary

- **Timeline view.** Show the Diary by time of day instead of by meal, on web and mobile.
- **Copy a logged food.** Copy one food to Now, Today, Tomorrow or a picked date, on web and mobile.
- **Select several foods and copy them together.** Tick foods in the Diary (or timeline) and copy them in one go.
- **Copy a meal to several days**, and set one time for every food in a multi-add.
- **Smarter local food search.** Your own foods are ranked by how often and how recently you log them (with a new `food_entries` index to keep it fast).
- **Custom nutrient fixes.** Custom nutrient amounts save correctly on foods, converted units and "save as new", and the AI and MCP tools can update them.

### Workouts (mobile and web)

- **Focus view** for the active workout: one exercise at a time with a media card, set editor, chips, RPE and Swap.
- **Double and triple progression** with rep ranges and automatic deloads when you stall.
- **Gym profiles** with your own plates, dumbbells and machine weight stacks for the plate calculator.
- **Backup exercise** for each preset slot, for when the machine is taken.
- **Starter workout plans** to get going quickly.
- **Strength balance card** and an untrained-muscle heat map.
- **Import FitNotes and Strong** workout exports.
- **Demonstration video links** on exercises.
- **Rest timer screen flash** and swipe to copy or undo a set.

### Mobile app

- **iPad support** with readable-width layouts.
- **GPS on Android without Google Play Services** (for example GrapheneOS and other de-Googled phones).
- **Readiness** flags a raised overnight breathing rate.

### AI and integrations

- **Remote MCP with OAuth 2.1**, so Claude and **Gemini** can connect to your server without an API key (off by default: Admin → Authentication Settings → Login Management → Remote MCP OAuth; needs public HTTPS).

The fork's own instance runs on [Railway](https://railway.com), deployed from `tdmain`.

A self-hosted, privacy-first alternative to MyFitnessPal, Flo, Hevy, Shotsy & more. Track nutrition, exercise, body metrics, and health data while keeping full control of your data.
<img width="5120" height="2880" alt="image" src="https://github.com/user-attachments/assets/d8b09f48-cb4d-41a6-b678-ac93e551f257" />


SparkyFitness is a self-hosted fitness tracking platform made up of:

- A backend server (API + data storage)
- A web-based frontend
- Native mobile apps for iOS and Android
- Companion apps for Apple Watch and Wear OS

It stores and manages health data on infrastructure you control, without relying on third party services.

## Core Features

- Nutrition, exercise, hydration, sleep, fasting, mood and body measurement tracking
- Goal setting and daily check-ins
- [Apple Watch and Wear OS apps](https://codewithcj.github.io/SparkyFitness/mobile-app/watch-apps): goals, water, weight, fasting, medications, workouts and watch face complications
- Interactive charts and long-term reports
- Multiple user profiles and family access
- Light and dark themes
- OIDC, TOTP, Passkey, MFA etc.

## How SparkyFitness Compares

**SparkyFitness is source-available, not open source** — the [license](LICENSE) is non-commercial and requires permission for commercial use.

Most apps do one thing. One good nutrition app runs $40–$100 a year; covering everything SparkyFitness covers means three or four subscriptions, per person, and still no single report across them. SparkyFitness does it in one app, free, for the whole household.

<sub>US list prices, 14 Aug 2026. [Full cost breakdown →](https://codewithcj.github.io/SparkyFitness/features/comparison)</sub>

| | **SparkyFitness** | wger | MyFitnessPal | Cronometer | Hevy | Zero | Flo | Garmin Connect | Google Health |
| --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Self-hosted, your data stays yours | ⭐ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| No subscription, no ads | ✅ | ✅ | ❌ | 🟡 | 🟡 | ❌ | ❌ | ✅ | 🟡 |
| Nutrition, strength, sleep, fasting, cycle & meds in one place\* | ⭐ | 🟡 | 🟡 | 🟡 | ❌ | ❌ | ❌ | 🟡 | 🟡 |
| Full history & custom date-range reports | ✅ free | 🟡 | 💰 | 💰 | 💰 | 💰 | 💰 | ✅ | 💰 |
| Wearable & health-platform sync | ✅ 8+ services | ❌ | ✅ | ⭐ | ✅ | 🟡 | 🟡 | 🟡 | ✅ |
| Family sharing with granular permissions | ⭐ 7 permissions | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ | 🟡 | 🟡 |
| CSV import & free data export | ✅ | 🟡 | 💰 | ✅ | ✅ | 🟡 | 🟡 | 🟡 | ❌ |
| MCP server + bring your own LLM | ⭐ | 🟡 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

⭐ standout &nbsp;•&nbsp; ✅ supported &nbsp;•&nbsp; 🟡 partial &nbsp;•&nbsp; 💰 paid tier only &nbsp;•&nbsp; ❌ not supported

<sub>\* Sleep stages, HRV and blood glucose are imported from your watch, phone or meter. SparkyFitness stores, analyses and charts them rather than measuring them itself.</sub>

> **This table is written by the project being compared, so read it that way.** Checked 14 Aug 2026 against official docs, repos and store listings; some of it is already out of date. If a cell is wrong or unfair to another project, [open an issue](https://github.com/CodeWithCJ/SparkyFitness/issues) — corrections that make SparkyFitness look *worse* are just as welcome.

**[See the full comparison →](https://codewithcj.github.io/SparkyFitness/features/comparison)** — 17 apps across self-hosted, nutrition, specialist and device-ecosystem categories, plus where each of them beats us.

## Health & Device Integrations

SparkyFitness can sync data from multiple health and fitness platforms:

- **Apple Health** (iOS)
- **Google Health Connect** (Android)
- **Google Health API** 
- **Fitbit**
- **Garmin Connect**
- **Withings**
- **Polar Flow** 
- **Oura**
- **Hevy**
- **OpenFoodFacts**
- **USDA**
- **Fatsecret**
- **Nutritionix**
- **Mealie**
- **Tandoor**
- **Strava** (partially tested)
- **COROS**
- **Norish**
- **Yazio** (uses unofficial API)
- **Swiss Food Database**
- **Canadian Nutrient File (Health Canada)**
- **Swedish Food Agency (Livsmedelsverket)**
- **Free Exercise DB** (Github)
- **Wger**
- **Intervals.ICU**

Integrations automatically sync activity data such as steps, workouts, and sleep, along with health metrics like weight and body measurements, to your SparkyFitness server.

## Optional AI Features (Beta)

SparkyAI provides a conversational interface for logging data and reviewing progress.

- Log food, exercise, body stats, and steps via chat
- Upload food images for automatic meal logging
- Retains conversation history for follow ups

Note: AI features are currently in beta.

## Installation

Choose one of the two ways to run SparkyFitness:

### 1. Self-Hosted

Get a SparkyFitness server running in minutes using Docker Compose:

```bash
# 1. Create a new folder
mkdir sparkyfitness && cd sparkyfitness

# 2. Download docker-compose.yml
curl -L -o docker-compose.yml https://raw.githubusercontent.com/CodeWithCJ/SparkyFitness/main/docker/docker-compose.prod.yml

# 3. Set up your .env configuration (Choose one option):
# Option A (Recommended): Generate custom .env with 1-click secure keys in browser:
# 👉 https://codewithcj.github.io/SparkyFitness/install/env-generator

# Option B: Minimal template — 5 values, everything else uses the defaults
# docker-compose already applies. Fine for most self-hosted installs.
curl -L -o .env https://raw.githubusercontent.com/CodeWithCJ/SparkyFitness/main/docker/.env.simple.example

# Option C: Full reference — every supported variable, commented out with its
# default. Start here for SSO, SMTP, an external database or a reverse proxy.
# curl -L -o .env https://raw.githubusercontent.com/CodeWithCJ/SparkyFitness/main/docker/.env.example

# 4. Replace the placeholders (skip if you used Option A — the generator
# already filled these in). The server refuses to start while they are left
# as-is, and the database would otherwise initialize with a published password.
#   SPARKY_FITNESS_DB_PASSWORD        any strong password
#   SPARKY_FITNESS_API_ENCRYPTION_KEY openssl rand -hex 32     (64 hex chars)
#   BETTER_AUTH_SECRET                openssl rand -base64 32  (44 chars)
#   SPARKY_FITNESS_FRONTEND_URL       the URL you will open the app at

# 5. Start the app
docker compose pull && docker compose up -d

# Access application at http://localhost:3004
```

_Note: For complete configuration options, reverse proxies, and alternative install methods, visit the [Documentation Site](https://codewithcj.github.io/SparkyFitness/)._

### Android app for this fork (Obtainium)

The fork's Android app is built from `tdmain` and published in a separate repository, [tonydarcy/sparkyfitness-builds](https://github.com/tonydarcy/sparkyfitness-builds/releases). Each release has one APK named `sparkyfitness-dev-<version>-<commit>.apk`. It uses the package `org.SparkyApps.SparkyFitnessMobile1.dev`, so it installs alongside the official SparkyFitness app instead of replacing it.

[Obtainium](https://github.com/ImranR98/Obtainium) installs it straight from GitHub and keeps it up to date:

1. Install Obtainium from [its releases](https://github.com/ImranR98/Obtainium/releases) or F-Droid.
2. In Obtainium, tap **Add App**.
3. Paste `https://github.com/tonydarcy/sparkyfitness-builds` as the **App Source URL** (the builds repository, not this one).
4. Leave the source as GitHub and tap **Add**, then **Install**. Allow Obtainium to install apps when Android asks.
5. Open the app and sign in with your server's URL. Obtainium checks for new builds and offers each update.

Builds are personal test builds of `tdmain`, so they work best with a server running this fork. Against an upstream server the fork-only features simply won't appear.

### 2. Cloud (for non-technical users)

If you are not a technical user and prefer not to run SparkyFitness on your own server, you can deploy a hosted instance in the cloud using one of the following providers.

<a href="https://www.pikapods.com/pods?run=sparkyfitness">
  <img src="https://www.pikapods.com/static/run-button.svg" height="70" width="150" alt="Run on PikaPods">
</a>
<br>
<a href="https://zenith.hosting/host/sparkyfitness?ref=gh">
  <img src="https://cdn.zenith.hosting/buttons/deploy-with-zenith.svg" height="70" width="150" alt="Deploy with Zenith">
</a>


> **Note:** These are independent third-party services. We encourage you to explore features provided by each provider to determine the one that best fits your needs.
 

## 🎥 Video Tutorial

[![Watch the video](https://img.youtube.com/vi/B13IiL2DeQc/maxresdefault.jpg)](https://www.youtube.com/watch?v=B13IiL2DeQc)

Quick 2-minute tutorial showing how to install SparkyFitness (self-hosted fitness tracker).

## Documentation

For full installation guides, configuration options, and development docs, please visit our [Documentation Site](https://codewithcj.github.io/SparkyFitness/).

### Quick Links

- **[Installation Guide](https://codewithcj.github.io/SparkyFitness/install/docker-compose)** - Deployment and configurations
- **[Interactive .env Generator](https://codewithcj.github.io/SparkyFitness/install/env-generator)** - Client-side `.env` configuration builder
- **[Features Overview](https://codewithcj.github.io/SparkyFitness/features)** - Complete feature documentation
- **[Development Workflow](https://codewithcj.github.io/SparkyFitness/developer/getting-started)** - Developer guide and contribution process
- **[iOS App Info](https://github.com/CodeWithCJ/SparkyFitness/wiki/Apple-Health-Integration)** and **[Android App Info](https://github.com/CodeWithCJ/SparkyFitness/wiki/Android-Mobile-App)**

### Need Help?

- Post in Github issues/discussion.
- For faster response and get help from other community memebers **[Join our Discord](https://discord.gg/vcnMT5cPEA)**

## Star History

<a href="https://www.star-history.com/?repos=CodeWithCJ%2FSparkyFitness&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=CodeWithCJ/SparkyFitness&type=date&theme=dark&legend=top-left&sealed_token=MWviIBzQInvKCol1ejXZDjNri3pRWX0dc2AWIPURcTYtRhXm-_L4OXbnWeawEjkcHYOSex4XLfBuGzfQ-W636dNfgksXVYkUHNdKLXK1HQHxuMGo53u9FmU6bnHR4mDNyjq1zcue5kbzagAjRpsFfkQ_F6hQSL92j112pU3AGXiDWk8ZCGcdrKkyAK7o" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=CodeWithCJ/SparkyFitness&type=date&legend=top-left&sealed_token=MWviIBzQInvKCol1ejXZDjNri3pRWX0dc2AWIPURcTYtRhXm-_L4OXbnWeawEjkcHYOSex4XLfBuGzfQ-W636dNfgksXVYkUHNdKLXK1HQHxuMGo53u9FmU6bnHR4mDNyjq1zcue5kbzagAjRpsFfkQ_F6hQSL92j112pU3AGXiDWk8ZCGcdrKkyAK7o" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=CodeWithCJ/SparkyFitness&type=date&legend=top-left&sealed_token=MWviIBzQInvKCol1ejXZDjNri3pRWX0dc2AWIPURcTYtRhXm-_L4OXbnWeawEjkcHYOSex4XLfBuGzfQ-W636dNfgksXVYkUHNdKLXK1HQHxuMGo53u9FmU6bnHR4mDNyjq1zcue5kbzagAjRpsFfkQ_F6hQSL92j112pU3AGXiDWk8ZCGcdrKkyAK7o" />
 </picture>
</a>

## Translations


**[Weblate Translations](https://weblate.sparkyfitness.com/engage/sparkyfitness)**

<a href="http://weblate.sparkyfitness.com/engage/sparkyfitness/"><img src="http://weblate.sparkyfitness.com/widget/sparkyfitness/svg-badge.svg" alt="Translation status"></a>



<a href="https://weblate.sparkyfitness.com/engage/sparkyfitness">
<img src="http://weblate.sparkyfitness.com/widget/sparkyfitness/multi-auto.svg" alt="Translation status" />
</a>

## Repository activity

![Alt](https://repobeats.axiom.co/api/embed/828203d3070ff56c8873c727b6873b684c4ed399.svg "Repobeats analytics image")

## Contributors

<a href="https://github.com/CodeWithCJ/SparkyFitness/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=CodeWithCJ/SparkyFitness" width="100%" alt="SparkyFitness contributors"/>
</a>

## ⚠️ Known Issues / Beta Features ⚠️

SparkyFitness is under active development.
Breaking changes may occur between releases.

- Auto-updating containers is not recommended
- Always review release notes before upgrading

The following features are currently in beta and may not have been thoroughly tested. Expect potential bugs or incomplete functionality:

- AI Chatbot
- Family & Friends access
- API documentation
