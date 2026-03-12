# Model Layer Guide

This folder contains domain/data logic used by the dashboard.

## File responsibilities

- `types.ts`: shared domain and chart types.
- `constants.ts`: static defaults, color maps, and storage key constants.
- `utils.ts`: generic text/id helpers.
- `taxonomy.ts`: category definition parsing and taxonomy construction.
- `storage.ts`: parsing/validation for persisted localStorage payloads.
- `payroll.ts`: payroll draft sanitization and YAML snippet generation.
- `rules.ts`: categorization/manual-rule/similarity logic.
- `formatting.ts`: currency, percent, and timeline formatting helpers.
- `visualization.ts`: Sankey dataset construction and aggregate metrics.
- `csvImport.ts`: browser-side raw CSV parsing into in-app transaction shape.
- `index.ts`: public barrel exports for app-level imports.

## Conventions

- Keep React/UI code out of this folder.
- Prefer adding new pure functions here instead of growing `App.tsx`.
- If logic is feature-specific, put it in the closest module instead of `index.ts`.
- Export from `index.ts` only when a symbol is used by multiple UI modules.
