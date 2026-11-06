# Scam Detector PNG

An Expo (managed) + Expo Router + TypeScript mobile app for **IS323**. It helps people in Papua New Guinea check whether a crypto offer, token or website shows scam **risk indicators**, and lets them report scam schemes to a community map.

> **Disclaimer.** The app only informs. It never handles money, and it never says something is "safe" or "a scam". Results are worded as **"risk indicators"** or **"no known warnings found"**.

## Status

| Milestone | Status |
|---|---|
| **M0 — Project setup** | ✅ Done (see below) |
| M1 – M5 | Planned (see the project plan) |

**M0 delivers:** project structure (`app/` + `src/`), theme, TanStack Query provider, Supabase client, environment-variable validation, shared UI states (loading / success / empty / error), visible disclaimer, `eas.json` build profiles, Jest + ESLint, and a temporary setup-status home screen that checks the Supabase connection. The auth flow and tabs replace that screen in M1.

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

### 3. Configure environment variables

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

### 4. Run

```bash
npx expo start           # press a (Android), w (web), or scan the QR code with Expo Go
```

The home screen shows **Setup status**. It should say *Connected to Supabase*. After changing `.env`, restart with `npx expo start --clear`.

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
  _layout.tsx           Root layout: providers + navigation
  index.tsx             M0 setup-status screen (replaced in M1)
src/
  components/           Reusable UI (Screen, Button, Disclaimer, AsyncState, …)
  context/              React context providers (TanStack Query, auth in M1)
  hooks/                Data hooks wrapping services with TanStack Query
  services/             All network/API code (Supabase client, health check, …)
  theme/                Colors, risk colors, spacing, typography
  utils/                Pure helpers (env validation, …) + unit tests
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

*Update this section at each milestone with what AI helped with and what you did yourself.*
