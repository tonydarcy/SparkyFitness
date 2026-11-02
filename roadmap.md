# SparkyFitness Roadmap

This is a proposed roadmap, not a commitment. It lists gaps people notice when they move to SparkyFitness from dedicated nutrition coaching apps (such as MacroFactor) and strength training apps (such as Caliber), ordered roughly by value for effort. Each item should get its own issue and maintainer approval before work starts, as `CONTRIBUTING.md` asks for new features.

For how SparkyFitness compares with other apps today, see [How SparkyFitness Compares](docs/src/features/comparison.md).

## Already covered

These are sometimes listed as gaps but already exist, so they are not on this roadmap:

- Adaptive TDEE (expenditure estimated from intake and weight trend)
- Nutrition label scanning, food photo estimates and AI-assisted logging
- Per-nutrient goal directions (minimum, maximum or range), custom nutrients, goal presets and different goals per weekday
- Workout presets and plan templates, supersets, RPE, rest timers, a plate calculator and progression suggestions
- Personal records and estimated 1RM
- Muscle-group recovery and exercise-variety scoring
- Apple Watch and Wear OS apps, and home screen widgets on iOS and Android
- Progress photos, check-ins and habits

## Nutrition

### 1. Target adjustment from Adaptive TDEE

**Gap:** Adaptive TDEE estimates expenditure, but calorie and macro targets only change when the user edits them. Coaching apps recalculate targets every week towards a goal rate.

**Proposal:** An optional weekly check-in that shows the current expenditure estimate and offers new targets for a chosen rate of change (for example, lose 0.5% of body weight per week). The user accepts, edits or skips the change. Nothing changes without their consent, and the existing goal history records each accepted change.

**Size:** Medium. The expenditure calculation already exists; most of the work is the check-in flow on web and mobile.

### 2. Timeline diary view

**Gap:** The diary is grouped by meal only. A timeline view, ordered by time of day, makes quick logging and reviewing intake through the day faster.

**Proposal:** An optional diary layout that orders entries by logged time, with quick-add at any point.

**Size:** Small to medium.

### 3. First-class recipes

**Gap:** Recipes come through meals and Mealie/Tandoor import, not a dedicated recipe manager.

**Proposal:** Recipes with ingredients, yield and per-serving nutrition, plus import from a recipe URL.

**Size:** Medium to large.

### 4. Offline logging on mobile

**Gap:** The mobile apps need the server to log anything. This matters most on hosted instances and on poor connections.

**Proposal:** A local queue for food, exercise and measurement entries that syncs when the server is reachable, with clear conflict handling.

**Size:** Large.

## Strength training

### 5. Starter program library

**Gap:** Users can build workout presets and plans, but there is no set of ready-made programs to start from.

**Proposal:** A small library of well-known programs (beginner full body, upper/lower and push/pull/legs splits) shipped as plan templates the user can copy and edit.

**Size:** Small to medium. It reuses the existing plan template system.

### 6. Strength standards

**Gap:** Personal records and estimated 1RM are shown on their own, with no reference point.

**Proposal:** Compare estimated 1RM against bodyweight-relative strength standards by sex and age for the main lifts, with the source of the standards shown.

**Size:** Small to medium.

### 7. Exercise guidance

**Gap:** Some exercises have instructions, but coverage is uneven and there are no demonstrations.

**Proposal:** Fill instruction gaps for common exercises and support linking a demonstration image or video per exercise.

**Size:** Medium, mostly content.

## Platforms

### 8. iPad support

**Gap:** `app.config.ts` sets `ios.supportsTablet: false`, so on an iPad the app runs as a scaled-up iPhone app. Nothing in the app is iPhone-only in a way that blocks iPad: HealthKit is available on iPadOS 17 and later, the Apple Watch bridge already returns early where watch pairing is unsupported, and NFC settings only appear on devices with NFC.

**Proposal:** In two phases.

1. **Run natively, phone layouts in a readable column.** Turn on `supportsTablet`, support every orientation and Split View size, and cap screen content at a comfortable width so cards and lists do not stretch across a 13-inch screen. Check bottom sheets, modals, the keyboard handling and the camera screens at iPad sizes.
2. **Layouts made for the larger screen.** A sidebar instead of the tab bar, two columns for the dashboard and diary, and list-and-detail views for the library, plus pointer and hardware keyboard support.

**Size:** Phase 1 is small to medium, mostly testing on iPad simulators, which need a Mac. Phase 2 is large. Once an App Store release supports iPad, later releases cannot drop it, and App Store submissions then need iPad screenshots.

### 9. Android without Google Play Services

**Gap:** On Android without Google Play Services (for example GrapheneOS without sandboxed Google Play, or LineageOS without microG), outdoor GPS recording does not work. `expo-location` gets positions only from Google's Fused Location Provider, with no fallback to Android's own `LocationManager`. The rest of the app does not depend on Google Play Services:

- Barcode scanning uses the ML Kit model bundled into the app, not Google's scanner service.
- Notifications are local. Firebase push is linked but never used.
- Maps use MapLibre and OpenStreetMap unless the build has a Google Maps key.
- The Wear OS bridge checks for Google Play Services before using it. A Wear OS watch needs them anyway.

**Proposal:** Record GPS through Android's `LocationManager` when Google Play Services are missing, either by patching `expo-location` or with a small native location module, keeping the foreground service that recording uses today. Show a clear message instead of a silent failure until then.

**Size:** Medium. It needs testing on a real device without Google Play Services.

## Integrations

### 10. Open Food Facts contributions from the MCP connector

**Gap:** Contributing to Open Food Facts already exists, but only through the web app. There is a manual contribution flow and an automatic sync (`auto_contribute_openfoodfacts`, behind the server-wide `allow_openfoodfacts_contributions` setting). The automatic sync submits any eligible custom food: one with a valid barcode and a default serving in grams or millilitres, including foods the MCP connector creates with `create_food`. But through the connector, the assistant cannot:

- check whether a barcode is already on Open Food Facts;
- submit a food on request, or report whether a submission succeeded;
- see whether the person has turned contributions on.

The automatic sync also does not look at where a food's nutrition came from, so a food whose values were estimated (from a photo, or on request) would be submitted like one read from the label.

**Proposal:**

- Add two `sparky_manage_food` actions that reuse the existing contribution services, so the same server-wide gate, owner-only rule and rate budget apply:
  - `check_openfoodfacts`: is this barcode already on Open Food Facts?
  - `contribute_to_openfoodfacts`: two steps, like the web flow. A preview the assistant shows the person, then a submit only after the person confirms in the conversation.
- The tool description tells the assistant to offer a contribution only when the product is missing, and only for values read from the package.
- Exclude estimated nutrition from both the new actions and the automatic sync.
- Photos are optional at first: the web flow keeps handling front and nutrition-label photos.

**Size:** Small to medium. It reuses the existing contribution and product-state services; the work is the two actions, the estimate exclusion and tests.

## Out of scope

- **Paid human coaching.** SparkyFitness has no paid tier. Family & Friends sharing already lets a trainer view a client's data.
- **A curated, verified food database.** The project relies on the food providers you configure rather than maintaining its own database.
- **Social feeds and challenges.** Sharing is delegated caregiver access, not a community.
