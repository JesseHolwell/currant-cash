# User Flows

Three primary flows mapped to the app's information architecture.

---

## ✅ Flow 1 — Onboarding (first visit)

Entry points: "Continue for free" or first Google sign-up (no existing cloud data).

```
Landing
  → Sample Preview (full app, sample data, banner)
  → [Start with my data] → Onboarding Wizard

  Step 0: About You
    - Display name (optional, prefilled from Google auth)
    - Age (optional, stored as birth year for FIRE projections)
    - Currency (required, default AUD)

  Step 1: Income
    - Net pay, gross pay, pay frequency
    - Employer name (for salary transaction matching)

  Step 2: Accounts
    - Account list (name, type, current balance)
    - Live net worth total

  Step 3: Upload
    - CSV drag-and-drop
    - Compatible with most major bank export formats

  Step 4: Categorize
    - Prompt to set up category rules
    - Routes to Categories tab on completion

  Step 5: Goals
    - Savings targets with name, current, and target values
    - Emergency fund suggestion based on inferred monthly expenses

  → Dashboard (Forecast tab) — "setup complete" moment
```

Wizard state persists across steps. Each step can be skipped.
Completion sets `currant-onboarding-complete` in localStorage.
Re-entry is blocked once the key is set.

---

## 🔲 Flow 2 — Monthly Check-in (returning user) — PENDING

Entry point: Home tab banner triggered when last import is >30 days ago.

```
Home tab → "It's been 31 days" banner + [Start monthly update]

  → Lightweight 3-step modal (not full wizard):

  Step 1: Update account balances
    - Quick delta edit on existing accounts

  Step 2: Upload new transactions
    - Pre-dated from last import's coverage end date

  Step 3: Review new categories
    - Uncategorized transactions from the new batch (AI or manual rules)

```

---

## ✅ Flow 3 — Ad Hoc / Investigative (any time)

No flow, no prompts. User navigates freely between tabs.

- **Expenses** — drill into a Sankey node to see the underlying transactions
- **Forecast** — adjust scenario inputs (start net worth, monthly delta)
- **FIRE** — change assumptions (age, annual return, multiplier)
- **Categories** — find uncategorized transactions, define keyword rules
- **Accounts** — add or edit accounts, enter monthly balance snapshots
- **Goals** — add or update savings targets
- **Settings** — edit profile (name, age, currency), export/import data backup
