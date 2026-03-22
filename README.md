# Currant

Turn bank CSV exports into a clear, local-first money dashboard with minimal friction.

`https://personal-spend.vercel.app`

## Privacy model

- All transaction data stays in the browser on the user's device.
- CSVs are parsed client-side.
- No backend or server-side financial data storage is required.
- Clearing browser storage for this app will remove saved CSVs, rules, and settings.

## Tech stack

- `Node.js + npm workspaces` (single command entry points)
- Web: `React + Vite + Recharts (Sankey)`
- Parsing/modeling: `TypeScript + Papa Parse`
- State: `Zustand` with localStorage persistence
- Testing: `Vitest` (domain unit tests)
- iOS: `Capacitor` (wraps the web build in a native `WKWebView`)

## Quick start

```bash
npm install
npm run web
```

Then open the local Vite URL (usually `http://localhost:5173`).
Upload your CSV in the `Data Source` panel.

## Supabase / Plaid bank connection (optional)

The "Connect Bank" button uses Plaid via Supabase Edge Functions. It only appears when `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set.

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) — `brew install supabase/tap/supabase`
- A [Plaid](https://dashboard.plaid.com) account (free sandbox tier is enough)

### First-time setup

```bash
# Link the CLI to your Supabase project
supabase link --project-ref <your-project-ref>

# Store Plaid credentials as Supabase secrets
supabase secrets set \
  PLAID_CLIENT_ID=your_client_id \
  PLAID_SECRET=your_sandbox_secret \
  PLAID_ENV=sandbox

# Deploy edge functions
# --no-verify-jwt is required: the publishable key format is not a JWT
supabase functions deploy plaid-create-link-token --no-verify-jwt
supabase functions deploy plaid-exchange-token --no-verify-jwt
```

### Environment variables (web/.env.local)

```bash
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

See `web/.env.example` for the template.

### Sandbox test credentials

In the Plaid Link modal, use `user_good` / `pass_good` to connect a synthetic bank.

## Product spec

- Feature scope and delivery status: [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md)

## Core workflow

1. Export CSV from your bank.
2. Start UI: `npm run web`.
3. Upload CSV in the app.
4. Review and adjust coverage dates in the `Transaction Data` tab.
5. Review Forecast, Accounts, Income, Expenses, and Categories tabs.
6. Tune categories and rules directly in the UI.

## Commands

```bash
npm run web          # Start dev server
```

```bash
# Run from web/ directory
npm test             # Run unit tests (Vitest)
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

Tests cover all pure domain functions in `web/src/domain/` — 7 test files, 127 tests.

### iOS / TestFlight

Prerequisites: macOS, Xcode, Apple Developer account.

```bash
# From web/
npm run ios          # build → sync to Xcode project → open Xcode
```

Or step by step:

```bash
cd web
npm run build        # compile to dist/
npx cap sync ios     # copy dist/ into the Xcode project
npx cap open ios     # open Xcode
```

In Xcode:
1. Select your Apple Developer team under *Signing & Capabilities*.
2. **Product → Archive** to build a release binary.
3. Upload to TestFlight via Xcode Organizer.

> Re-run `npx cap sync ios` (or `npm run ios`) after every web code change — it keeps the bundled assets up to date in the Xcode project.

Legacy (deprecated) CLI command:

- `npm run ingest -- --input ./Data_export_23022026.csv`

## Project structure

```text
.
├─ README.md
├─ PRODUCT_SPEC.md
├─ CLAUDE.md
├─ web/
│  └─ src/
│     ├─ App.tsx               # Thin shell: auth, routing, event handlers
│     ├─ main.tsx
│     ├─ domain/               # Pure business logic (no React)
│     │  ├─ types.ts
│     │  ├─ constants.ts
│     │  ├─ rules.ts
│     │  ├─ taxonomy.ts
│     │  ├─ csvImport.ts
│     │  ├─ visualization.ts
│     │  └─ ...
│     ├─ store/                # Zustand slices with localStorage persistence
│     │  ├─ transactions.ts
│     │  ├─ categories.ts
│     │  ├─ accounts.ts
│     │  ├─ forecast.ts
│     │  ├─ fire.ts
│     │  ├─ settings.ts
│     │  └─ ai.ts
│     ├─ hooks/                # Thin wrappers + derived state
│     │  ├─ useDashboardState.ts
│     │  └─ ...
│     ├─ features/             # Tab components (one folder per feature)
│     │  ├─ transactions/
│     │  ├─ categories/
│     │  ├─ expenses/
│     │  ├─ accounts/
│     │  ├─ forecast/
│     │  ├─ fire/
│     │  ├─ income/
│     │  └─ settings/
│     └─ components/           # Shared / layout components
│        ├─ dashboard/
│        │  ├─ Dashboard.tsx
│        │  ├─ Sidebar.tsx
│        │  └─ WorkspaceHeader.tsx
│        ├─ LandingPage.tsx
│        └─ ErrorBoundary.tsx
└─ cli/ (legacy, deprecated)
```
