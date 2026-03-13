# Product Spec

Feature checklist for the product.  
Legend: `[x]` shipped, `[ ]` not shipped.

## Navigation and layout

- [x] Sidebar navigation with these tabs: `Forecast`, `Accounts`, `Income`, `Expenses`, `Categories`.
- [x] Honeyjar-inspired two-pane layout (left nav + right workspace).
- [x] Keep these tabs out of scope for now: `Cards`, `Investments`, `Scenarios`, `Projections`, `Reimburse`.

## Forecast tab

- [x] Line chart forecast for projected net worth over upcoming months.
- [x] Input for start net worth value.
- [x] Input for monthly delta override.
- [x] Inferred monthly delta from historical transaction cash flow.
- [x] Goal overlay line on forecast chart when goals exist.
- [ ] Compare multiple forecast scenarios.

## Accounts tab

- [x] User-defined accounts list with editable rows.
- [x] User-defined account categories (for bank, crypto, stocks, etc).
- [x] Asset vs liability account type (`Credit`/`Debit` style impact on net worth).
- [x] Automatic net worth calculation from account balances.
- [x] Account breakdown summary by category.
- [ ] CSV/account import for balances.

## Income tab

- [x] In-app payroll configuration editor (values aligned to payroll YAML concept).
- [x] Editable fields: net pay, gross pay, tax, super, tolerance, employer keywords.
- [x] Generated YAML snippet preview for `payroll.private.yml`.
- [x] Local browser persistence for income settings.
- [ ] Write payroll config directly to filesystem from the UI.

## Expenses tab

- [x] Sankey flow visualization from uploaded CSV transactions.
- [x] Chart mode toggle (`Raw Deposits`, `Modeled Salary`, `Expense Overview`).
- [x] Timeline filtering (`All data` and month selection).
- [x] Merchant detail mode toggle (`Summary` / `Detailed`).
- [x] Expense pie chart for category breakdown.
- [ ] Month-over-month comparison chart.

## Categories tab

- [x] Category taxonomy editor (category + subcategory definitions).
- [x] Add/delete/reset category setup from UI.
- [x] Transaction rule editor for categorization and nicknames.
- [x] Filter rules view by `Needs Category` or `All Debits`.
- [x] Apply manual rules to similar transactions.
- [x] Local browser persistence for category setup and rules.
- [ ] Rule suggestion helper from uncategorized transactions.

## Transaction Data tab

- [x] Uploaded CSV batch list with local browser persistence.
- [x] Editable coverage start/end dates per CSV.
- [x] Coverage calendar showing which days are covered across uploaded files.
- [x] Delete individual CSV batches or clear all CSV data.
- [ ] Replace an existing CSV batch with a new file.

## Goals

- [x] Goal list with editable name/current/target values.
- [x] Goal progress bars in Forecast and sidebar.
- [ ] Goal-linked notifications/milestones.

## Data ingestion

- [x] Upload bank CSV directly from web UI.
- [x] Persist uploaded CSV batches and merged transaction data in browser storage.
- [x] Normalize source rows into deterministic transaction records with stable IDs.
- [x] Support current CSV format (`Debit Amount`, `Credit Amount`, `Narrative`, and related fields).
- [x] Infer observed CSV date range from parsed transactions.
- [x] Allow manual coverage-date adjustments for historical period tracking.
- [ ] CLI ingestion (`npm run ingest -- --input <csv-path>`) - deprecated, no active development.
- [ ] Ingest additional bank CSV formats.
- [ ] Add output JSON schema contracts.
- [ ] Add regression tests for classification and artifact stability.
