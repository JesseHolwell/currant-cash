import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatPercent,
  formatShortDate,
  formatTimelineLabel,
  isInTimeline,
  monthKey
} from "../formatting";

describe("formatCurrency", () => {
  it("formats a whole number as AUD currency with no decimals", () => {
    expect(formatCurrency(1234, "AUD")).toMatch(/1,234/);
  });

  it("rounds to 0 decimal places", () => {
    expect(formatCurrency(1234.56, "AUD")).toMatch(/1,235/);
  });

  it("formats negative values", () => {
    expect(formatCurrency(-500, "AUD")).toMatch(/500/);
  });

  it("formats zero", () => {
    expect(formatCurrency(0, "AUD")).toMatch(/0/);
  });
});

describe("formatPercent", () => {
  it("formats 0 as 0%", () => {
    expect(formatPercent(0)).toBe("0%");
  });

  it("formats 1 as 100%", () => {
    expect(formatPercent(1)).toBe("100%");
  });

  it("formats 0.5 as 50%", () => {
    expect(formatPercent(0.5)).toBe("50%");
  });

  it("formats a value between 0 and 1% as <1%", () => {
    expect(formatPercent(0.005)).toBe("<1%");
    expect(formatPercent(0.009)).toBe("<1%");
  });

  it("rounds to nearest integer percent", () => {
    expect(formatPercent(0.456)).toBe("46%");
  });
});

describe("monthKey", () => {
  it("returns YYYY-MM from a full ISO date string", () => {
    expect(monthKey("2024-03-15")).toBe("2024-03");
    expect(monthKey("2023-12-01")).toBe("2023-12");
  });
});

describe("isInTimeline", () => {
  it("returns true for 'all' timeline regardless of date", () => {
    expect(isInTimeline("2024-06-15", "all")).toBe(true);
    expect(isInTimeline("2001-01-01", "all")).toBe(true);
  });

  it("returns true when the date matches the timeline month", () => {
    expect(isInTimeline("2024-03-15", "2024-03")).toBe(true);
  });

  it("returns false when the date does not match the timeline month", () => {
    expect(isInTimeline("2024-04-01", "2024-03")).toBe(false);
    expect(isInTimeline("2023-03-15", "2024-03")).toBe(false);
  });
});

describe("formatTimelineLabel", () => {
  it("returns 'All data' for the 'all' timeline", () => {
    expect(formatTimelineLabel("all")).toBe("All data");
  });

  it("returns a human-readable month/year for a YYYY-MM timeline", () => {
    const label = formatTimelineLabel("2024-03");
    expect(label).toMatch(/March/i);
    expect(label).toMatch(/2024/);
  });

  it("returns the period string unchanged for invalid formats", () => {
    expect(formatTimelineLabel("bad-data" as any)).toBe("bad-data");
  });
});

describe("formatShortDate", () => {
  it("formats a valid ISO date into a localised short date", () => {
    const result = formatShortDate("2024-03-15");
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/15|Mar/);
  });

  it("returns the original string when it is not a valid ISO date", () => {
    expect(formatShortDate("not-a-date")).toBe("not-a-date");
    expect(formatShortDate("2024/03/15")).toBe("2024/03/15");
  });
});
