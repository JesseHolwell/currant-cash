import type { TimelinePeriod } from "./types";

export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatPercent(value: number): string {
  if (value > 0 && value < 0.01) {
    return "<1%";
  }
  return `${Math.round(value * 100)}%`;
}

export function monthKey(dateIso: string): TimelinePeriod {
  const [year, month] = dateIso.split("-");
  return `${year}-${month}` as TimelinePeriod;
}

export function isInTimeline(dateIso: string, timeline: TimelinePeriod): boolean {
  if (timeline === "all") {
    return true;
  }
  return monthKey(dateIso) === timeline;
}

export function formatTimelineLabel(period: TimelinePeriod): string {
  if (period === "all") {
    return "All data";
  }
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return period;
  }
  return new Date(year, month - 1, 1).toLocaleString("en-AU", { month: "long", year: "numeric" });
}

export function formatShortDate(dateIso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return dateIso;
  }
  const [yearStr, monthStr, dayStr] = dateIso.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return dateIso;
  }
  return new Date(year, month - 1, day).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function formatDateTime(dateIso: string): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    return dateIso;
  }
  return date.toLocaleString("en-AU");
}
