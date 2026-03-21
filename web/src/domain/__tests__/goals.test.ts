import { describe, expect, it } from "vitest";
import {
  buildResolvedGoals,
  resolveGoalCurrent,
  resolveGoalSourceLabel
} from "../goals";
import type { AccountEntry, GoalEntry } from "../types";

const makeAccount = (overrides: Partial<AccountEntry> = {}): AccountEntry => ({
  id: "acc-1",
  name: "Savings",
  kind: "asset",
  value: 10000,
  bucket: "Cash",
  ...overrides
});

const makeGoal = (overrides: Partial<GoalEntry> = {}): GoalEntry => ({
  id: "goal-1",
  name: "Emergency Fund",
  target: 20000,
  current: 5000,
  trackingMode: "manual",
  accountIds: [],
  ...overrides
});

describe("resolveGoalCurrent", () => {
  it("returns net worth when trackingMode is 'netWorth'", () => {
    const goal = makeGoal({ trackingMode: "netWorth" });
    expect(resolveGoalCurrent(goal, [], 42000)).toBe(42000);
  });

  it("returns manual current when trackingMode is 'manual'", () => {
    const goal = makeGoal({ trackingMode: "manual", current: 7500 });
    expect(resolveGoalCurrent(goal, [], 0)).toBe(7500);
  });

  it("sums linked asset accounts for trackingMode 'accounts'", () => {
    const accounts = [makeAccount({ id: "a1", kind: "asset", value: 8000 }), makeAccount({ id: "a2", kind: "asset", value: 2000 })];
    const goal = makeGoal({ trackingMode: "accounts", accountIds: ["a1", "a2"] });
    expect(resolveGoalCurrent(goal, accounts, 0)).toBe(10000);
  });

  it("subtracts liabilities when trackingMode is 'accounts'", () => {
    const accounts = [
      makeAccount({ id: "a1", kind: "asset", value: 15000 }),
      makeAccount({ id: "a2", kind: "liability", value: 3000 })
    ];
    const goal = makeGoal({ trackingMode: "accounts", accountIds: ["a1", "a2"] });
    expect(resolveGoalCurrent(goal, accounts, 0)).toBe(12000);
  });

  it("ignores accounts not in accountIds", () => {
    const accounts = [makeAccount({ id: "a1", value: 5000 }), makeAccount({ id: "a2", value: 9000 })];
    const goal = makeGoal({ trackingMode: "accounts", accountIds: ["a1"] });
    expect(resolveGoalCurrent(goal, accounts, 0)).toBe(5000);
  });

  it("returns 0 when no linked accounts exist", () => {
    const goal = makeGoal({ trackingMode: "accounts", accountIds: ["missing"] });
    expect(resolveGoalCurrent(goal, [], 0)).toBe(0);
  });
});

describe("resolveGoalSourceLabel", () => {
  it("returns 'Tracking total net worth' for netWorth mode", () => {
    const goal = makeGoal({ trackingMode: "netWorth" });
    expect(resolveGoalSourceLabel(goal, [])).toBe("Tracking total net worth");
  });

  it("returns 'Manual current value' for manual mode", () => {
    const goal = makeGoal({ trackingMode: "manual" });
    expect(resolveGoalSourceLabel(goal, [])).toBe("Manual current value");
  });

  it("returns 'Tracking selected accounts' when accountIds exist but none found", () => {
    const goal = makeGoal({ trackingMode: "accounts", accountIds: ["missing"] });
    expect(resolveGoalSourceLabel(goal, [])).toBe("Tracking selected accounts");
  });

  it("returns 'Tracking <name>' for a single matched account", () => {
    const account = makeAccount({ id: "a1", name: "My Savings" });
    const goal = makeGoal({ trackingMode: "accounts", accountIds: ["a1"] });
    expect(resolveGoalSourceLabel(goal, [account])).toBe("Tracking My Savings");
  });

  it("returns 'Tracking N accounts' for multiple matched accounts", () => {
    const accounts = [makeAccount({ id: "a1", name: "Savings" }), makeAccount({ id: "a2", name: "ETF" })];
    const goal = makeGoal({ trackingMode: "accounts", accountIds: ["a1", "a2"] });
    expect(resolveGoalSourceLabel(goal, accounts)).toBe("Tracking 2 accounts");
  });
});

describe("buildResolvedGoals", () => {
  it("calculates progress as a ratio of current to target", () => {
    const goal = makeGoal({ target: 20000, current: 10000, trackingMode: "manual" });
    const [resolved] = buildResolvedGoals([goal], [], 0);
    expect(resolved.progress).toBe(0.5);
  });

  it("clamps progress to 0 when current is negative", () => {
    const goal = makeGoal({ target: 10000, current: -500, trackingMode: "manual" });
    const [resolved] = buildResolvedGoals([goal], [], 0);
    expect(resolved.progress).toBe(0);
  });

  it("clamps progress to 1 when current exceeds target", () => {
    const goal = makeGoal({ target: 10000, current: 15000, trackingMode: "manual" });
    const [resolved] = buildResolvedGoals([goal], [], 0);
    expect(resolved.progress).toBe(1);
  });

  it("sets progress to 0 when target is 0", () => {
    const goal = makeGoal({ target: 0, current: 5000, trackingMode: "manual" });
    const [resolved] = buildResolvedGoals([goal], [], 0);
    expect(resolved.progress).toBe(0);
  });

  it("includes linkedAccountNames for accounts mode", () => {
    const account = makeAccount({ id: "a1", name: "ETF Portfolio" });
    const goal = makeGoal({ trackingMode: "accounts", accountIds: ["a1"] });
    const [resolved] = buildResolvedGoals([goal], [account], 0);
    expect(resolved.linkedAccountNames).toEqual(["ETF Portfolio"]);
  });

  it("returns an empty array for no goals", () => {
    expect(buildResolvedGoals([], [], 0)).toEqual([]);
  });
});
