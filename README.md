# Scam Detector PNG

An Expo (managed) + Expo Router + TypeScript mobile app for **IS323**. It helps people in Papua New Guinea check whether a crypto offer, token or website shows scam **risk indicators**, and lets them report scam schemes to a community map.

> **Disclaimer.** The app only informs. It never handles money, and it never says something is "safe" or "a scam". Results are worded as **"risk indicators"** or **"no known warnings found"**.

## Status

| Milestone | Status |
|---|---|
| **M0 — Project setup** | ✅ Done |
| **M1 — Auth + navigation** | ✅ Done |
| **M2 — Database** | ✅ Done |
| **M3 — Risk checker** | ✅ Done (offline link analysis + scheme scorecard) |
| **M4 — Check history** | ✅ Done (view, re-run, delete) |
| **M5 — Community reports** | ✅ Done (create, read, update, delete, location) |
| **M6 — Community map** | ✅ Done (OpenStreetMap, no API key) |
| **M7 — Google Safe Browsing** | ✅ Done (Edge Function; key stays on the server) |
| **M8 — Offline cache** | ✅ Done (history, reports and map open offline; offline checks saved later) |
| M9 + | Planned (see the project plan) |

**M0 delivers:** project structure (`app/` + `src/`), theme, TanStack Query provider, Supabase client, environment-variable validation, shared UI states (loading / success / empty / error), visible disclaimer, `eas.json` build profiles, Jest + ESLint, and a temporary setup-status home screen that checks the Supabase connection. The auth flow and tabs replace that screen in M1.

**M1 delivers:** login, register and forgot-password screens (react-hook-form + zod), password reset with an emailed code, protected routes (signed-out users only see auth screens; signed-in users only see the app), the five tabs (Check, Reports, Map, History, Profile — placeholders except Profile), sign-out, and friendly error messages. *(Changed after M8: sign-up now says when an email is already registered, and there is a "Resend confirmation email" button. See [Sign-up emails](#sign-up-emails).)*

**M2 delivers:** the Supabase database — `profiles`, `checks`, `reports` and `evidence` tables with Row Level Security, a sign-up trigger that creates each user's profile, a private `evidence` Storage bucket, TypeScript types for every table, 35 database tests, and an editable display name on the Profile tab (read from the database).

**M3 delivers:** the Check tab — offline link analysis with lookalike detection, a 10-question scheme scorecard, a result screen (risk level with icon + label + color, each indicator explained, what to do), and automatic saving of every check to the user's history. Google Safe Browsing, QR scanning and token lookup are separate milestones.

**M4 delivers:** the History tab — past checks newest first, 20 at a time with infinite scroll and pull-to-refresh; a saved-check screen showing the result exactly as recorded (viewing never creates a new check); **re-run** with the current rules (offer checks re-run from the saved answers); and **delete** with an in-app confirmation. Loading, empty, error-with-retry and "not found" states are all handled. History currently needs a connection; the offline cache is a later milestone.

**M5 delivers:** community scam reports. The Reports tab lists **Community** (approved reports) and **My reports** (your own, with status). The report form takes scheme type, platform, a description (20–2,000 characters) and an optional location; you can view, edit and delete your own reports. Screenshots (Evidence) are a *Should* feature for a later milestone.

### Reports: privacy and moderation

- **Schemes, not people.** The form blocks phone numbers and email addresses in the description (`findPersonalDetails` in `src/utils/reports.ts`), and asks users not to include names. Amounts such as "K10000" or "1000000 kina" are not mistaken for phone numbers.
- **Approximate location only.** "Use my approximate location" asks for permission (handling refused, blocked → Settings, and location turned off), uses low accuracy, and rounds to 2 decimal places (about 1 km) before anything is saved. Location is optional.
- **Moderation.** New reports are *Pending review* and visible only to their author. A moderator approves or rejects them in the Supabase dashboard (Table Editor → `reports` → `status`). Editing a report sends it back to *Pending review* (enforced by the database, see M2).
- Approved reports show the reporter's **display name**, never their email.

**M7 delivers:** the *one external API* Must feature. Every link check is also looked up in **Google Safe Browsing** through a Supabase Edge Function (`supabase/functions/safe-browsing`), so the Google API key never reaches the app. A Google listing is a risk indicator worth 60 points, which on its own gives *High risk indicators*. "Not listed" is shown as a note that is *not proof* the link is trustworthy. The result screen waits for Google before showing the level, shows loading and error-with-retry states, and if Google can't be reached it uses only the on-phone checks and says so. The saved history entry includes Google's answer. Re-running a link from History looks it up again.

### Google Safe Browsing: privacy and limits

- **What is sent:** only the link being checked goes to our Edge Function and on to Google. Nothing else about the user is sent, and the function doesn't store or log the link.
- **Who can call it:** only signed-in users. `verify_jwt` stays on (the default) and the function uses `withSupabase({ auth: 'user' })`.
- **No verdicts:** Google's lists miss new scam sites, so "not listed" never lowers the score and is worded as "no known warnings".
- **Terms:** the free v4 Lookup API is for non-commercial use, which suits this student project. A commercial launch would need Google's Web Risk API instead.
- `javascript:` / `data:` links and scorecard checks are not sent to Google.

**M8 delivers:** the offline cache (the last *Must* feature). History, saved checks, reports, the map list and the profile are saved on the phone (AsyncStorage) and open without a connection. An **offline banner** (icon + text) shows on every screen. Screens with nothing saved yet say so instead of looking empty. The **Check** tab works fully offline: a check made offline says it will be saved, and it is sent to History automatically when the connection returns, even after the app is closed and reopened. Other changes (creating, editing or deleting a report) fail straight away with "Could not connect" and a retry, instead of waiting. The Google Safe Browsing lookup is skipped offline and the result says only on-phone checks were used.

- **Privacy:** each user's cache is stored under its own key and **deleted when they sign out**, so on a shared phone the next person can't see it. Saved data expires after 7 days. Google answers and the status check are never saved.
- Connection state comes from `expo-network`, wired into TanStack Query's `onlineManager` (`src/services/offline-cache.ts`).

**M6 delivers:** the Map tab. Approved reports with a location appear as markers (reports at the same rounded spot are grouped, with a count). Tapping a marker lists those reports; each opens its detail. **Show my area** centres the map on the user's approximate location (with permission handling). A **Places** list under the map gives the same information without the map, for screen readers.

### Map: why OpenStreetMap

The map is [Leaflet](https://leafletjs.com) with [OpenStreetMap](https://www.openstreetmap.org/copyright) tiles, inside a WebView (Android/iOS) or an iframe (web). It was chosen over Google Maps because Google Maps on Android needs an API key linked to a Google Cloud **billing account**, and without one the map is blank in the APK/AAB. This option needs **no key**, and works in Expo Go, in EAS builds and on the web.

- **Attribution** "© OpenStreetMap contributors" is shown on the map, as the licence requires. The tiles follow OpenStreetMap's [tile usage policy](https://operations.osmfoundation.org/policies/tiles/), which is fine for a student project with light use; a public launch with many users should switch to a commercial tile provider.
- **Security:** Leaflet 1.9.4 is loaded from unpkg pinned with Subresource Integrity hashes, so a modified copy will not run. The map page receives only rounded coordinates and counts — never report text or ids — as escaped JSON, and messages from the page are validated before use.
- The map needs an internet connection for its tiles; if Leaflet cannot load, the map says so.

## Features (by priority)

- **Must:** auth, offline URL analysis, one external API (Google Safe Browsing via a backend function), report CRUD, map of reports, check history, offline cache.
- **Should:** CoinGecko token lookup, QR scan, screenshot upload, password reset, moderation.
- **Could:** RDAP domain age, notifications, Tok Pisin.

## Tech stack

Expo SDK 58 · Expo Router · TypeScript · NativeWind 4 (Tailwind CSS 3) · Supabase (Auth, Postgres with Row Level Security, Storage) · TanStack Query · react-hook-form + zod · AsyncStorage · EAS Build.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project (the Sydney region, `ap-southeast-2`, is usually closest to PNG).
2. Save the database password somewhere safe. It is **never** used in the app.
3. Open **Project Settings → API Keys** and copy the **Project URL** and the **publishable** key.

### 3. Configure Supabase Auth

In the Supabase dashboard:

1. **Authentication → Emails → Reset Password** template: add the one-time code so users can type it into the app, for example:

   ```html
   <h2>Reset your password</h2>
   <p>Your Scam Detector PNG reset code is: <strong>{{ .Token }}</strong></p>
   <p>If you didn't ask for this, you can ignore this email.</p>
   ```

   The app uses this code instead of a reset link, so no deep-link setup is needed and it works in Expo Go.
2. **Authentication → Sign In / Providers → Email:** keep *Confirm email* on for real use. While developing you can turn it off to sign in straight after registering.
3. Supabase's built-in email sender is limited to a few emails per hour. That's fine for testing; set up custom SMTP before a demo with many users.

### Sign-up emails

- **Already registered:** sign-up says "An account with this email already exists" instead of a vague error. This was a deliberate choice: people were left waiting for an email that Supabase never sends for an existing account. The trade-off is that someone could use the form to test whether an email has an account. Sign-in and password reset still don't reveal it.
- **Resend:** after registering, and on the sign-in screen when an email isn't confirmed yet, a **Resend confirmation email** button counts down before it can be used again.
- **Limits are set by Supabase, not the app.** With the built-in email sender, Supabase sends at most **2 emails per hour for the whole project**, and waits **60 seconds** between emails to the same address. To resend faster:
  1. Set up your own email sender: **Authentication → Emails → SMTP Settings** (e.g. Resend, Brevo or SendGrid; most have a free plan).
  2. Lower the per-user wait under **Authentication → Rate Limits**.
  3. Set `RESEND_COOLDOWN_SECONDS` in `src/utils/auth-errors.ts` to the same number, so the button's countdown matches.
- **Confirmation link:** set **Authentication → URL Configuration → Site URL** to where the app runs (e.g. `http://localhost:8081` while developing). Otherwise the link opens `localhost:3000` and shows "can't be reached", although the email is already confirmed by then.

### 4. Create the database

Open **SQL Editor** in the Supabase dashboard, paste the contents of
[`supabase/migrations/20261106000000_initial_schema.sql`](supabase/migrations/20261106000000_initial_schema.sql) and click **Run**. This creates the tables, security rules and the `evidence` storage bucket. Run it once; running it again fails because the tables already exist.

Users who signed up **before** you ran the migration have no profile row. Delete those test users (Authentication → Users) and sign up again.

### 5. Set up Google Safe Browsing (Edge Function)

1. In the [Google Cloud console](https://console.cloud.google.com/), create a project, enable the **Safe Browsing API**, then go to **APIs & Services → Credentials → Create credentials → API key**. Restrict the key to the *Safe Browsing API*.
2. Deploy the function and store the key as a **function secret** (never in `.env`):

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase functions deploy safe-browsing
   npx supabase secrets set GOOGLE_SAFE_BROWSING_API_KEY=<your Google key>
   ```

   You can also add the secret in the dashboard: **Edge Functions → Secrets**.
3. To try it, check the link `http://testsafebrowsing.appspot.com/s/phishing.html`. It is a test page Google provides for this, so it should come back as listed.

Without this step the app still works. Link checks show "Google Safe Browsing is not set up yet" and use only the on-phone checks. For local function development, copy `supabase/functions/.env.example` to `supabase/functions/.env` (gitignored).

### 6. Configure environment variables

```bash
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
```

Fill in `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your publishable key>
```

- `.env` is gitignored. Only `.env.example` (placeholders) is committed.
- `EXPO_PUBLIC_*` values are bundled into the app, so they must be public. **Never** put the secret / service-role key or the database password in the app. Server-only secrets, such as the Google Safe Browsing API key, live in Supabase Edge Function secrets.

### 7. Run

```bash
npx expo start           # press a (Android), w (web), or scan the QR code with Expo Go
```

Register an account, then open the **Profile** tab: *App status* should say *Connected to Supabase*. After changing `.env`, restart with `npx expo start --clear`.

## Database

```
profiles 1 ── * checks          (a user's check history)
profiles 1 ── * reports 1 ── * evidence   (community reports and their screenshots)
auth.users 1 ── 1 profiles      (created automatically on sign-up)
```

| Table | Who can read | Who can write |
|---|---|---|
| `profiles` | Any signed-in user (display name only, no email) | Owner (display name only) |
| `checks` | Owner | Owner (insert / delete; no edits) |
| `reports` | Everyone signed in: **approved** reports. Owner: own reports in any status | Owner. New reports are always `pending`; editing an approved report sends it back to `pending`; users can never change `status` |
| `evidence` | Owner | Owner, only for their own reports and their own Storage folder |
| Storage `evidence` bucket | Owner (files in `<user id>/…`) | Owner; private, images only, max 5 MB |

Signed-out (anonymous) users can read nothing. **Moderators** approve or reject reports in the Supabase dashboard (Table Editor → `reports` → `status`), which bypasses RLS.

### Database tests

`npm run test:db` runs the real migration in [PGlite](https://pglite.dev) (Postgres compiled to WebAssembly) on top of a small stand-in for Supabase's `auth` and `storage` schemas (`supabase/tests/supabase-stub.sql`). It then acts as different users and checks 35 rules: who can read, insert, update and delete each table, the sign-up trigger, the moderation rules, the storage folder rules, and that anonymous users see nothing. No Supabase project or Docker is needed.

## How the risk check works

Everything runs **on the phone** (`src/utils/risk/`). It is **rules-based, not machine learning**: each rule that matches adds a *risk indicator* with a weight, and the weights add up to a score from 0 to 100 (capped).

| Score | Level shown |
|---|---|
| 0 | No known warnings found |
| 1–24 | Few risk indicators |
| 25–49 | Some risk indicators |
| 50–100 | High risk indicators |

**Link rules** (`url-analysis.ts`):

| Indicator | Weight |
|---|---|
| `javascript:` / `data:` link instead of a web page | 60 |
| Lookalike of a known brand (edit distance ≤ 1–2, or look-alike characters like `b1nance`, `rnetamask`) | 50 |
| Brand name on a different ending (`binance.xyz`) | 45 |
| Brand name used as a word in someone else's address (`binance-airdrop.com`) | 40 |
| Hidden real address with `@` (`https://binance.com@evil.xyz`) | 35 |
| IP number instead of a name | 30 |
| Punycode / non-Latin characters (`xn--…`, Cyrillic look-alikes) | 30 |
| Scam words (airdrop, claim, double, seed, validate…) | 10 each, max 25 |
| `http://` instead of `https://` | 15 |
| Link shortener (bit.ly…) | 15 |
| Cheap / abused ending (.xyz, .top, .click…) | 10 |
| Very long name, 3+ extra subdomains, 2+ hyphens, unusual port | 10 each |

Known brands and their official domains are in `src/utils/risk/known-brands.ts`. **Check this list against each organisation's real website** — an entry that is wrong would make the real site look like a lookalike. An exact official domain shows the note "Matches X's official address" and adds no risk.

**Scheme scorecard** (`scheme-scorecard.ts`): 10 yes/no questions. Each "yes" is an indicator. Asking for a recovery phrase, PIN or password (50) is high on its own; guaranteed returns, withdrawal fees and remote-access apps are 30 each.

**Google Safe Browsing** (`src/utils/safe-browsing.ts`): a listing on Google's lists of phishing, malware, unwanted software or harmful apps adds **60**. "Not listed" and "couldn't check" are notes (0).

**Wording:** a unit test fails if any result text says "safe", "legit", "is a scam" or "not a scam". The only exception is the product name "Google Safe Browsing".

## Builds (EAS)

`eas.json` defines three profiles:

| Profile | Output | Use |
|---|---|---|
| `development` | Development build | Local development with native modules |
| `preview` | **APK** (internal distribution) | Install on phones for testing |
| `production` | **AAB** | Google Play |

`.env` is not uploaded to EAS, so set the variables on EAS for each environment:

```bash
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co --environment preview --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value <key> --environment preview --visibility sensitive
# repeat with --environment production
npx eas-cli@latest build -p android --profile preview
```

Client-side (`EXPO_PUBLIC_`) variables must use `plaintext` or `sensitive` visibility, not `secret`.

## Project structure

```
app/                    Screens only (Expo Router file-based routes)
  _layout.tsx           Root layout: providers + protected routes
  index.tsx             Entry route: redirects to /check or /login
  (auth)/               login, register, forgot-password (signed-out only)
  (tabs)/               check, reports, map, history, profile (signed-in only)
src/
  components/           Reusable UI (Screen, Button, Disclaimer, AsyncState, …)
  context/              React context providers (TanStack Query, auth session)
  hooks/                Data hooks wrapping services with TanStack Query
  services/             All network/API code (Supabase client, auth, health check)
  theme/                Colors, risk colors, spacing, typography
  types/                Database types (matches the migration)
  utils/                Pure helpers (env + form validation, error messages) + unit tests
    risk/               Offline risk check: link rules, lookalikes, scheme scorecard, scoring
supabase/
  functions/
    safe-browsing/      Edge Function (Deno): Google Safe Browsing lookup; logic.ts is unit-tested
  migrations/           SQL to run in your Supabase project
  tests/                Database / RLS tests (npm run test:db), function tests (npm run test:functions)
```

### Architecture rules

- **No `fetch` or Supabase calls in components.** Services in `src/services` make requests, hooks in `src/hooks` wrap them with TanStack Query, and screens render the hook's state.
- **Every API call handles four states:** loading, success, empty and error (with retry). Use `<AsyncState>` from `src/components/async-state.tsx`.
- **Wording:** results say "risk indicators" or "no known warnings found", never "safe" or "this is a scam". Risk colors are always shown with a text label.
- **Reports** describe schemes and platforms, never named individuals.
- **Row Level Security:** every user-owned table restricts rows to `user_id = auth.uid()`.
- **Styling:** use NativeWind `className`s, not `StyleSheet`. The colors (`bg-surface`, `text-primary`, `border-danger`…), spacing (`gap-md`, `p-lg`), radius (`rounded-md`) and text sizes (`text-heading`, `text-small-bold`) come from `src/theme`, so light and dark mode switch automatically. Keep `style` only for values known at runtime (safe-area insets, a score's width, a risk level's color), and `useTheme()` only for props that need a raw color (icons, `ActivityIndicator`, navigator options). Write full class names (`cn(isOn && 'bg-primary')`), never build them from strings, or Tailwind won't find them.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm test` | Run unit tests (Jest) |
| `npm run test:db` | Run database / Row Level Security tests (PGlite) |
| `npm run test:functions` | Run Edge Function logic tests (Node) |
| `npm run typecheck` | TypeScript check |
| `npx eslint .` | Lint |

## Workflow

- Work on feature branches (`feature/m0-setup`, `feature/m1-auth`, …) and merge into `main` when the milestone is complete.
- At least 3 commits per week; the final release is tagged `v1.0`.

## AI assistance

This project was developed with help from **Claude Code** (Anthropic's AI coding assistant), as the course allows. In keeping with academic-integrity expectations:

- **What AI did in M0:** scaffolded the project with `create-expo-app`, set up the folder structure, theme, Supabase client (following Expo's *Using Supabase* guide for SDK 58), TanStack Query provider, env validation, shared UI components, `eas.json`, the `.gitignore` fix (the template did not ignore `.env`) and the unit tests.
- **How it was checked:** TypeScript, ESLint and Jest (6 tests) all pass. The app was run in a browser at phone size to confirm the "not configured" state, and an error state with retry was tested against an unreachable Supabase project.
- **My responsibility:** I reviewed the generated code and can explain how it works. Design decisions, testing on a real device and the technical report are my own work.

- **What AI did in M1:** wrote the auth service, session context, auth hooks, form schemas, the auth and tab screens, and the unit tests (48 in total). It also found and fixed two bugs during browser testing: opening the app signed out showed an "Unmatched Route" page, and the tab labels were clipped.
- **How M1 was checked:** TypeScript, ESLint and Jest pass. Every screen was driven in a browser at phone size: 14 checks without Supabase configured (route protection, validation, error states), and 16 checks for sign-in, sign-out, register, password reset and session persistence against a simulated Supabase Auth API. **Not yet tested against a real Supabase project or on a physical phone.**

- **Visual refresh ("Trustworthy blue"):** chosen by me from three options AI mocked up. AI picked the palette and checked every text/background pair meets WCAG AA contrast (4.5:1) in light and dark mode, then added the navy `HeroHeader` on each tab and the sign-in screen, navy navigation bars, a light status bar, and a `Card` component with a soft shadow for results, rows and forms. Risk colours are unchanged and still always come with an icon and a text label.
- **NativeWind (after M8):** AI checked that the stable NativeWind 4.2.7 builds on Expo SDK 58 (it only officially lists SDK 57; NativeWind 5 is still a release candidate), then moved all 31 styled files from `StyleSheet` to classes. The look is unchanged: the same colors, sizes and dark mode, read from `src/theme` through CSS variables. A test fails if `tailwind.config.js` or `global.css` stop matching `src/theme`. **Checked:** TypeScript, ESLint, 313 tests, and web and Android bundles build with every class present in the generated CSS. **Not yet checked by eye** in a browser or on a phone.
- **What AI did in M8:** read the TanStack Query persistence and Expo SDK 58 `expo-network` docs, then wrote the per-user persisted cache, the online/offline wiring, the queued offline save of checks, the offline banner and "offline, nothing saved yet" state, and 14 new tests that use the real TanStack Query and persister (restore after restart, per-user separation, delete on sign-out, Google answers not saved, offline save resumed after a restart, other changes failing fast). Breaking the offline-save setting on purpose made a test fail.
- **How M8 was checked:** 296 unit tests, 35 database tests, 12 function tests, TypeScript, ESLint and `expo-doctor` pass. **Not yet tested in a browser or on a phone** (airplane mode on and off). Jest sometimes prints a "worker failed to exit" warning in the full run; every test still passes.
- **What AI did in M7:** read the current Google Safe Browsing and Supabase Edge Function docs, then wrote the `safe-browsing` Edge Function (input checks, the Google request, a reply that contains only "listed / not listed" and the threat types), the app service and hook, merging Google's answer into the score, the result-screen states, and 34 new tests (22 Jest, 12 Node). The weight of 60 for a Google listing was proposed by AI and **should be reviewed by me**. The wording test was changed to allow the product name "Safe Browsing" (the first version also flagged the function's name, `safe-browsing`).
- **How M7 was checked:** 282 unit tests, 35 database tests, 12 function tests, TypeScript and ESLint pass. The real `supabase-js` client was run against a simulated Supabase to confirm how function errors arrive (404 not deployed, 502 from Google, no connection) and that the user's sign-in token is sent. **Not yet tested:** the deployed function with a real Google key, and the result screen in a browser or on a phone (the Chrome extension wasn't connected during this milestone).
- **What AI did in M6:** wrote the map page builder (Leaflet + OpenStreetMap), the grouping of reports by location, the WebView and iframe map components, the Map tab with the selected-place panel, "Show my area" and the Places list, and 19 new unit tests. Choice of OpenStreetMap over Google Maps was made by me after AI explained the API-key and billing trade-off. Testing found and fixed: a cache key collision that would have crashed deleting a report, and a race on fast (cached) loads where the map missed its "ready" signal so it wouldn't zoom.
- **How M6 was checked:** 260 unit tests, 35 database tests, TypeScript and ESLint pass. The Map tab was driven in a browser (22 checks, run twice including a cached run) with real Leaflet and real OpenStreetMap tiles: markers grouped correctly, pending and location-less reports excluded, no report text in the map page, marker tap → panel → report, list → zoom, "Show my area" with allowed and refused location, empty and error states. **Not yet tested inside the Android/iOS WebView on a real phone.**
- **What AI did in M5:** wrote the reports and location services, report hooks, the report form (with phone/email blocking and the location picker), the Reports tab, report detail and edit screens, and 41 new unit tests. A unit test caught a bug in the location fallback (an error skipped the last-known position) before it reached the app. The scheme types, platform list and personal-details rules **should be reviewed by me** against real PNG reports.
- **How M5 was checked:** 241 unit tests, 35 database tests, TypeScript and ESLint pass. The full report flow was driven in a browser (26 checks) against a simulated database that applies the same read rule as RLS, with a simulated GPS position: community vs. my reports, someone else's pending report hidden, validation, phone-number blocking, location added and rounded, create / edit (back to pending) / delete, location permission refused, and error-with-retry.
- **What AI did in M4:** wrote the history service (paged list, get, delete), the TanStack Query hooks (infinite list, cache updates after delete), the History tab, the saved-check screen with re-run and delete, date formatting, and 24 new unit tests. Browser testing found and fixed two problems: history rows sized to their text (one ran off-screen), and a delete button that looked like a normal action; dark-mode button text was changed after a contrast check (2.8:1 → 7.1:1).
- **How M4 was checked:** 200 unit tests, TypeScript and ESLint pass. The History flow was driven in a browser (27 checks) against a simulated database of 25 saved checks: paging, view without saving, re-run of a link and of a scorecard, delete with cancel/confirm, not-found, empty and error-with-retry states.
- **What AI did in M3:** wrote the link analyser, lookalike detection (edit distance + look-alike characters), the scheme scorecard, the scoring and wording, the Check tab, the result screen and saving to history, plus 112 unit tests. The rules, weights, scam-word list and known-brand list were proposed by AI and **should be reviewed by me** against real PNG scam examples.
- **How M3 was checked:** 176 unit tests pass, including realistic scam links, real sites that must *not* be flagged, and a wording test; deliberately disabling lookalike detection or adding the word "safe" made tests fail. The full flow was driven in a browser (25 checks): validation, high / medium / none results, example links, the scorecard, saving to history, a failed save with retry, and bad input.
- **What AI did in M2:** designed and wrote the SQL migration (tables, constraints, triggers, RLS and storage policies), the database tests, the TypeScript database types, the profile service and the editable display name. Design decision made with AI: reports use "approved, or your own" for reading instead of only `user_id = auth.uid()`, so the community map can show other people's approved reports.
- **How M2 was checked:** 35 database tests pass, and they were shown to catch a deliberately weakened security rule. 64 unit tests, TypeScript and ESLint pass. The Profile screen was driven in a browser (11 checks) against a simulated Supabase API, including the "database not set up" error and retry. **The migration has not yet been run on a real Supabase project.**

*Update this section at each milestone with what AI helped with and what you did yourself.*
