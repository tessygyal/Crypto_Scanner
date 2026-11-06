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
| M4 – M5 | Planned (see the project plan) |

**M0 delivers:** project structure (`app/` + `src/`), theme, TanStack Query provider, Supabase client, environment-variable validation, shared UI states (loading / success / empty / error), visible disclaimer, `eas.json` build profiles, Jest + ESLint, and a temporary setup-status home screen that checks the Supabase connection. The auth flow and tabs replace that screen in M1.

**M1 delivers:** login, register and forgot-password screens (react-hook-form + zod), password reset with an emailed code, protected routes (signed-out users only see auth screens; signed-in users only see the app), the five tabs (Check, Reports, Map, History, Profile — placeholders except Profile), sign-out, and friendly error messages that never reveal whether an email has an account.

**M2 delivers:** the Supabase database — `profiles`, `checks`, `reports` and `evidence` tables with Row Level Security, a sign-up trigger that creates each user's profile, a private `evidence` Storage bucket, TypeScript types for every table, 35 database tests, and an editable display name on the Profile tab (read from the database).

**M3 delivers:** the Check tab — offline link analysis with lookalike detection, a 10-question scheme scorecard, a result screen (risk level with icon + label + color, each indicator explained, what to do), and automatic saving of every check to the user's history. Google Safe Browsing, QR scanning and token lookup are separate milestones.

## Features (by priority)

- **Must:** auth, offline URL analysis, one external API (Google Safe Browsing via a backend function), report CRUD, map of reports, check history, offline cache.
- **Should:** CoinGecko token lookup, QR scan, screenshot upload, password reset, moderation.
- **Could:** RDAP domain age, notifications, Tok Pisin.

## Tech stack

Expo SDK 58 · Expo Router · TypeScript · Supabase (Auth, Postgres with Row Level Security, Storage) · TanStack Query · react-hook-form + zod · AsyncStorage · EAS Build.

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

### 4. Create the database

Open **SQL Editor** in the Supabase dashboard, paste the contents of
[`supabase/migrations/20261106000000_initial_schema.sql`](supabase/migrations/20261106000000_initial_schema.sql) and click **Run**. This creates the tables, security rules and the `evidence` storage bucket. Run it once; running it again fails because the tables already exist.

Users who signed up **before** you ran the migration have no profile row. Delete those test users (Authentication → Users) and sign up again.

### 5. Configure environment variables

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

### 6. Run

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

**Wording:** a unit test fails if any result text says "safe", "legit", "is a scam" or "not a scam".

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
  migrations/           SQL to run in your Supabase project
  tests/                Database / RLS tests (npm run test:db)
```

### Architecture rules

- **No `fetch` or Supabase calls in components.** Services in `src/services` make requests, hooks in `src/hooks` wrap them with TanStack Query, and screens render the hook's state.
- **Every API call handles four states:** loading, success, empty and error (with retry). Use `<AsyncState>` from `src/components/async-state.tsx`.
- **Wording:** results say "risk indicators" or "no known warnings found", never "safe" or "this is a scam". Risk colors are always shown with a text label.
- **Reports** describe schemes and platforms, never named individuals.
- **Row Level Security:** every user-owned table restricts rows to `user_id = auth.uid()`.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm test` | Run unit tests (Jest) |
| `npm run test:db` | Run database / Row Level Security tests (PGlite) |
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

- **What AI did in M3:** wrote the link analyser, lookalike detection (edit distance + look-alike characters), the scheme scorecard, the scoring and wording, the Check tab, the result screen and saving to history, plus 112 unit tests. The rules, weights, scam-word list and known-brand list were proposed by AI and **should be reviewed by me** against real PNG scam examples.
- **How M3 was checked:** 176 unit tests pass, including realistic scam links, real sites that must *not* be flagged, and a wording test; deliberately disabling lookalike detection or adding the word "safe" made tests fail. The full flow was driven in a browser (25 checks): validation, high / medium / none results, example links, the scorecard, saving to history, a failed save with retry, and bad input.
- **What AI did in M2:** designed and wrote the SQL migration (tables, constraints, triggers, RLS and storage policies), the database tests, the TypeScript database types, the profile service and the editable display name. Design decision made with AI: reports use "approved, or your own" for reading instead of only `user_id = auth.uid()`, so the community map can show other people's approved reports.
- **How M2 was checked:** 35 database tests pass, and they were shown to catch a deliberately weakened security rule. 64 unit tests, TypeScript and ESLint pass. The Profile screen was driven in a browser (11 checks) against a simulated Supabase API, including the "database not set up" error and retry. **The migration has not yet been run on a real Supabase project.**

*Update this section at each milestone with what AI helped with and what you did yourself.*
