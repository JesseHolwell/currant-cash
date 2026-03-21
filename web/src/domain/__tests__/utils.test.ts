import { describe, expect, it } from "vitest";
import {
  cleanupLabel,
  findAliasLabel,
  normalizeForMatch,
  toTitleLabel
} from "../utils";

describe("normalizeForMatch", () => {
  it("lowercases input", () => {
    expect(normalizeForMatch("Hello World")).toBe("hello world");
  });

  it("replaces non-alphanumeric characters with spaces", () => {
    expect(normalizeForMatch("foo-bar!baz")).toBe("foo bar baz");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeForMatch("a   b   c")).toBe("a b c");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeForMatch("  hello  ")).toBe("hello");
  });

  it("preserves asterisks", () => {
    expect(normalizeForMatch("foo*bar")).toBe("foo*bar");
  });

  it("handles empty string", () => {
    expect(normalizeForMatch("")).toBe("");
  });
});

describe("toTitleLabel", () => {
  it("capitalises first letter of each word", () => {
    expect(toTitleLabel("hello world")).toBe("Hello World");
  });

  it("handles already-uppercase input", () => {
    expect(toTitleLabel("HELLO WORLD")).toBe("Hello World");
  });

  it("handles mixed case input", () => {
    expect(toTitleLabel("hElLo wOrLd")).toBe("Hello World");
  });

  it("filters empty tokens", () => {
    expect(toTitleLabel("  foo   bar  ")).toBe("Foo Bar");
  });

  it("handles single word", () => {
    expect(toTitleLabel("grocery")).toBe("Grocery");
  });

  it("handles empty string", () => {
    expect(toTitleLabel("")).toBe("");
  });
});

describe("cleanupLabel", () => {
  it("removes trailing 2-3 uppercase letter suffixes", () => {
    expect(cleanupLabel("Woolworths AU")).toBe("Woolworths");
    expect(cleanupLabel("Amazon AUS")).toBe("Amazon");
  });

  it("collapses double spaces", () => {
    expect(cleanupLabel("Foo  Bar")).toBe("Foo Bar");
  });

  it("truncates labels longer than 34 characters", () => {
    const long = "A".repeat(35);
    const result = cleanupLabel(long);
    expect(result).toBe(`${"A".repeat(31)}...`);
    expect(result.length).toBe(34);
  });

  it("does not truncate labels of 34 characters or fewer", () => {
    const label = "A".repeat(34);
    expect(cleanupLabel(label)).toBe(label);
  });

  it("returns the original string when short", () => {
    expect(cleanupLabel("Coles")).toBe("Coles");
  });
});

describe("findAliasLabel", () => {
  const aliases = [
    { label: "Netflix", needles: ["netflix", "NFLX"] },
    { label: "Spotify", needles: ["spotify"] }
  ];

  it("returns the matching label when a needle is found", () => {
    expect(findAliasLabel("netflix subscription", aliases)).toBe("Netflix");
    expect(findAliasLabel("spotify premium", aliases)).toBe("Spotify");
  });

  it("matches case-insensitively via normalizeForMatch", () => {
    expect(findAliasLabel("NETFLIX CHARGE", aliases)).toBe("Netflix");
  });

  it("returns null when no alias matches", () => {
    expect(findAliasLabel("unknown merchant", aliases)).toBeNull();
  });

  it("returns null for empty text", () => {
    expect(findAliasLabel("", aliases)).toBeNull();
  });

  it("returns null for empty alias list", () => {
    expect(findAliasLabel("netflix", [])).toBeNull();
  });
});
