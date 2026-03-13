import type { AccountEntry, GoalEntry, ResolvedGoalEntry } from "./types";

function signedAccountValue(account: AccountEntry): number {
  return account.kind === "asset" ? account.value : -account.value;
}

export function resolveGoalCurrent(goal: GoalEntry, accountEntries: AccountEntry[], netWorth: number): number {
  if (goal.trackingMode === "netWorth") {
    return netWorth;
  }
  if (goal.trackingMode === "accounts") {
    const accountsById = new Map(accountEntries.map((account) => [account.id, account]));
    let total = 0;
    for (const accountId of goal.accountIds) {
      const account = accountsById.get(accountId);
      if (!account) {
        continue;
      }
      total += signedAccountValue(account);
    }
    return Number(total.toFixed(2));
  }
  return Number(goal.current.toFixed(2));
}

export function resolveGoalSourceLabel(goal: GoalEntry, accountEntries: AccountEntry[]): string {
  if (goal.trackingMode === "netWorth") {
    return "Tracking total net worth";
  }
  if (goal.trackingMode === "accounts") {
    const names = accountEntries
      .filter((account) => goal.accountIds.includes(account.id))
      .map((account) => account.name)
      .filter(Boolean);

    if (names.length === 0) {
      return "Tracking selected accounts";
    }
    if (names.length === 1) {
      return `Tracking ${names[0]}`;
    }
    return `Tracking ${names.length} accounts`;
  }
  return "Manual current value";
}

export function buildResolvedGoals(goals: GoalEntry[], accountEntries: AccountEntry[], netWorth: number): ResolvedGoalEntry[] {
  return goals.map((goal) => {
    const linkedAccountNames = accountEntries
      .filter((account) => goal.accountIds.includes(account.id))
      .map((account) => account.name || "Untitled Account");
    const currentValue = resolveGoalCurrent(goal, accountEntries, netWorth);
    const progress = goal.target > 0 ? Math.max(0, Math.min(1, currentValue / goal.target)) : 0;

    return {
      ...goal,
      currentValue,
      progress,
      sourceLabel: resolveGoalSourceLabel(goal, accountEntries),
      linkedAccountNames
    };
  });
}
