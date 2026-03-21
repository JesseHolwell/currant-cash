# Currant — Claude Code Instructions

## Quick orientation

Personal finance dashboard. Local-first (browser storage), optional Supabase cloud sync, optional OpenAI categorisation.

**Start dev server:** `npm run web` (from repo root)
**Type-check:** `cd web && npx tsc --noEmit`
**Build:** `cd web && npm run build`
**Tests:** `cd web && npm test`

## Architecture layers

```
domain/       Pure TypeScript — no React, no localStorage. All business logic lives here.
store/        Zustand slices. Each slice owns its localStorage keys via persist middleware.
hooks/        Thin wrappers around stores + useDashboardState (derived/computed state).
features/     One folder per tab. TabComponent.tsx + any tab-specific sub-components.
components/   Shared layout: Dashboard.tsx, Sidebar.tsx, WorkspaceHeader.tsx, ErrorBoundary.tsx.
App.tsx       Shell only: auth state, cloud sync effects, event handlers, routes to <Dashboard />.
```

## Key conventions

- **Domain functions are pure.** No side effects, no React, no localStorage in `domain/`.
- **Zustand stores own persistence.** Do not read/write localStorage directly for app state — go through the store. Each store uses custom `PersistStorage` adapters when multiple keys are involved (categories, accounts, forecast).
- **Updater pattern on setters.** Store setters accept `T | ((prev: T) => T)` so callers can use either form.
- **Derived state lives in `useDashboardState`.** All `useMemo` chains that compute from raw store data belong there, not in App.tsx or components.
- **Feature components are prop-driven.** No feature component reads directly from a Zustand store — all data flows in from App.tsx via Dashboard.tsx props.

## Adding a new feature

1. Add types to `domain/types.ts`
2. Add pure logic to a `domain/*.ts` file, export from `domain/index.ts`
3. Add a store slice in `store/` if state needs persistence
4. Add a hook in `hooks/` if the feature needs a thin wrapper
5. Create `features/<name>/<Name>Tab.tsx`
6. Add the tab to `domain/types.ts` (`DashboardTab` union), `Dashboard.tsx` (`TAB_META`, `OUTPUT_TABS`/`INPUT_TABS`, tab render block), and wire props through `App.tsx`

## Testing

Tests live in `domain/__tests__/`. Run with `npm test` in `web/`. Coverage: `npm run test:coverage`.

Only domain functions are unit-tested. Components are not tested yet.

## localStorage keys

Defined as constants in `domain/constants.ts`. The stores own these keys — don't add new direct `localStorage.getItem/setItem` calls in components or App.tsx. Use a store.

## Supabase / auth

Configured via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars. When not configured, `isSupabaseConfigured` is `false` and all auth UI is hidden. The app works fully without Supabase.

## FIRE Insights

Free-tier feature (not premium). Settings (currentAge, annualReturn, multiplier) are persisted in `store/fire.ts` under the `fire_settings` localStorage key.
