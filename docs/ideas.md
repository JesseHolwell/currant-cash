# Ideas — 2026-05-12

Captured for thinking-through. Not commitments.

## Status (2026-05-12)

- ✅ **#1 cadence** — partial. Cadence relabel shipped (snapshot field now ISO date, UI uses chosen cadence word). Read-side cadence toggle (re-bucketing Sankey/savings rate) **deferred**.
- ✅ **#2 Australian FIRE** — shipped. `lockedUntilAge` on accounts, two-phase model (bridge + perpetual), preservation age setting, Two-Phase FIRE milestones. **Loose end:** super contributions during bridge years not yet folded in (model is conservatively pessimistic). Two-line liquid/locked projection chart still pending.
- ⏸️ **#3 timeline** — deferred. Exciting but needs more thought on shape before building.
- ⏸️ **#4 travel mode** — deferred. Documented for later. Pain is real (Thailand trip) but punting because it's bigger than it looks and timeline (#3) likely subsumes the date-range primitive.

## 1. Fortnightly-first interface

**Pain:** I'm paid fortnightly but the whole app is monthly (account snapshots, expense breakdowns, "monthly update" cadence).

**Idea:** Make the cadence configurable.

- Minimum: pick a cadence at account/profile setup — `monthly` | `fortnightly` (maybe `weekly` too).
- Gold standard: toggle in the navbar that re-buckets views on the fly.

**Known unknowns / friction:**

- Existing snapshots are stored keyed by month (`snapshot.month: "YYYY-MM"`). Switching to fortnightly means a different key shape and a different storage model.
- Re-bucketing monthly → fortnightly is lossy (no way to split a monthly snapshot in half). Re-bucketing fortnightly → monthly is fine (aggregate).
- Forecast deltas, insights, FIRE math all assume "per month". Either keep the canonical unit as `per period` and label it, or store everything per-day and project.

## 2. Australian-aware FIRE

**Context:** Sole user is an Australian. Super is locked until preservation age (~60). So treating super as part of "withdrawable net worth" pre-retirement is wrong, but ignoring it post-60 is also wrong.

**Idea:**

- Track current super balance as a first-class concept (separate from regular assets, or as a tagged account).
- FIRE calculation becomes a two-phase model:
  - **Phase 1 — Bridge years:** from today to preservation age, live off non-super assets. Target = enough non-super to cover annual spend × (preservation_age − current_age).
  - **Phase 2 — Post-preservation:** super takes over. Target = super balance at preservation age must be enough to fund spend from preservation age onward (perpetuity or to ~life expectancy).
- Both phases need to be satisfied. The "FIRE number" is whichever target binds.
- Settings: current super balance, preservation age (default 60), employer SG rate, expected real return on super vs. non-super (can differ).
- Make it configurable — international users can disable the two-phase model and fall back to single-pool 4% rule.

## 3. Timeline dashboard view

**Idea:** A single explorable chart showing financial life as a narrative.

- X-axis: time. Y-axis: net worth (or stacked: by account / by category).
- Overlays: account snapshots (dots), CSV transaction periods (bands), goals reached (markers).
- **Custom event badges** pinned by date: "bought a van", "Thailand trip", "got a payrise". User-defined, free-text + optional category/colour.
- Date range filter (zoom into a year, quarter, custom window).
- Click a badge → see surrounding context (which transactions, balance change).

**Why it matters:** Turns the app from a snapshot into a story. Useful for retrospection and for explaining "why did my net worth dip in March."

## 4. Travel/cash mode — degraded gracefully

**Pain:** After a Thailand trip i notice most spend is ATM withdrawals + cash. Expense breakdown is meaningless (one big "Cash" bucket). Feels chaotic.

**Idea: travel periods as a first-class concept.**

- Define a travel period (start date, end date, location, optional budget).
- During a travel period:
  - Don't try to itemise cash spend. Show a single "Trip — Thailand" line for the period with total outflow.
  - Optionally let me log rough categories manually (food, accommodation, transport) without per-transaction detail.
  - The Sankey/pie views collapse the travel period into one node instead of fragmenting.
- Ties into idea #3 — a travel period IS a badge on the timeline.
- Insights ("you spent 40% more on food this month") suppress or annotate during travel so they don't mislead.

---

## Cross-cutting observations

- **Ideas 3 and 4 share infrastructure** — both want user-defined date-range events. Timeline badges and travel periods are the same primitive with different rendering.
- **Idea 1 is the biggest refactor** — touches storage shape, every "monthly" assumption in domain code, FIRE math, forecast math.
- **Idea 2 is mostly additive** — new fields on FIRE settings, new calc branch. Doesn't break existing data.
