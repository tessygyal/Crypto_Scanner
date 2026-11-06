# Scam Detector PNG

An Expo (managed) + Expo Router + TypeScript mobile app for **IS323**. It helps people in Papua New Guinea check whether a crypto offer, token or website shows scam **risk indicators**, and lets them report scam schemes to a community map.

> **Disclaimer.** The app only informs. It never handles money, and it never says something is "safe" or "a scam". Results are worded as **"risk indicators"** or **"no known warnings found"**.

## Status

| Milestone | Status |
|---|---|
| **M0 — Project setup** | ✅ Done |
| **M1 — Auth + navigation** | ✅ Done |
| M2 – M5 | Planned (see the project plan) |

**M0 delivers:** project structure (`app/` + `src/`), theme, TanStack Query provider, Supabase client, environment-variable validation, shared UI states (loading / success / empty / error), visible disclaimer, `eas.json` build profiles, Jest + ESLint, and a temporary setup-status home screen that checks the Supabase connection. The auth flow and tabs replace that screen in M1.

**M1 delivers:** login, register and forgot-password screens (react-hook-form + zod), password reset with an emailed code, protected routes (signed-out users only see auth screens; signed-in users only see the app), the five tabs (Check, Reports, Map, History, Profile — placeholders except Profile), sign-out, and friendly error messages that never reveal whether an email has an account.

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

### 4. Configure environment variables

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

### 5. Run

```bash
npx expo start           # press a (Android), w (web), or scan the QR code with Expo Go
```

Register an account, then open the **Profile** tab: *App status* should say *Connected to Supabase*. After changing `.env`, restart with `npx expo start --clear`.

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
  utils/                Pure helpers (env + form validation, auth error messages) + unit tests
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

*Update this section at each milestone with what AI helped with and what you did yourself.*
