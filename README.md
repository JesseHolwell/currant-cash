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

## Quick start

```bash
npm install
npm run web
```

Then open the local Vite URL (usually `http://localhost:5173`).
Upload your CSV in the `Data Source` panel.

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
npm run web
```

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
