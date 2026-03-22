import { useMemo } from "react";
import {
  buildCoveredDaySet,
  formatDateTime,
  formatShortDate,
  formatTimelineLabel,
  monthKey
} from "../../domain";
import type { TransactionBatch } from "../../domain";

type CalendarDay = {
  key: string;
  dayLabel: string;
  covered: boolean;
  isPlaceholder: boolean;
};

type CalendarMonth = {
  monthKey: string;
  label: string;
  coveredDays: number;
  totalDays: number;
  days: CalendarDay[];
};

const CALENDAR_MONTHS = 12;

function buildCoverageMonths(batches: TransactionBatch[]): CalendarMonth[] {
  const coveredDays = buildCoveredDaySet(batches);

  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth() - (CALENDAR_MONTHS - 1), 1);
  const endMarker = new Date(now.getFullYear(), now.getMonth(), 1);

  const months: CalendarMonth[] = [];

  while (cursor.getTime() <= endMarker.getTime()) {
    const currentMonth = cursor.getMonth();
    const currentYear = cursor.getFullYear();
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstWeekday = new Date(currentYear, currentMonth, 1).getDay();
    const days: CalendarDay[] = [];

    for (let blank = 0; blank < firstWeekday; blank += 1) {
      days.push({
        key: `${currentYear}-${currentMonth + 1}-blank-${blank}`,
        dayLabel: "",
        covered: false,
        isPlaceholder: true
      });
    }

    let coveredCount = 0;
    for (let day = 1; day <= totalDays; day += 1) {
      const dateIso = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const covered = coveredDays.has(dateIso);
      if (covered) {
        coveredCount += 1;
      }
      days.push({
        key: dateIso,
        dayLabel: String(day),
        covered,
        isPlaceholder: false
      });
    }

    const thisMonthKey = monthKey(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`);
    months.push({
      monthKey: thisMonthKey,
      label: new Date(currentYear, currentMonth, 1).toLocaleString("en-AU", { month: "short", year: "numeric" }),
      coveredDays: coveredCount,
      totalDays,
      days
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return months.reverse();
}

export function TransactionDataTab({
  batches,
  totalTransactionCount,
  statusMessage,
  errorMessage,
  onUpload,
  onUpdateBatchCoverage,
  onDeleteBatch,
  onDeleteAllBatches
}: {
  batches: TransactionBatch[];
  totalTransactionCount: number;
  statusMessage: string | null;
  errorMessage: string | null;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onUpdateBatchCoverage: (batchId: string, patch: { coverageStart?: string; coverageEnd?: string }) => void;
  onDeleteBatch: (batchId: string) => void;
  onDeleteAllBatches: () => void;
}) {
  const coverageMonths = useMemo(() => buildCoverageMonths(batches), [batches]);
  const coveredDayCount = useMemo(() => buildCoveredDaySet(batches).size, [batches]);

  return (
    <>
      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">CSV Library</h3>
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">
            CSVs are parsed and stored in this browser only. Adjust coverage dates when the export period starts or ends
            outside the first or last transaction.
          </p>
          {errorMessage ? <p className="text-danger text-sm mt-2">{errorMessage}</p> : null}
          {statusMessage ? <p className="text-muted text-[0.82rem] mt-[0.42rem]">{statusMessage}</p> : null}
        </div>
        <div className="flex items-center gap-[0.4rem] flex-wrap">
          <label className="mode-btn active cursor-pointer">
            Add CSV
            <input
              className="hidden"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                void onUpload(event);
              }}
            />
          </label>
          <button type="button" className="mode-btn" onClick={onDeleteAllBatches} disabled={batches.length === 0}>
            Delete All
          </button>
        </div>
      </section>

      {batches.length === 0 ? (
        <section className="border border-line rounded-md p-4 bg-surface shadow-soft flex flex-col items-center text-center gap-3">
          <div className="text-muted mb-1" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="12" width="32" height="28" rx="3" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3"/>
              <path d="M16 20h16M16 26h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="36" cy="12" r="8" fill="var(--primary)" opacity="0.15"/>
              <path d="M36 9v6M33 12h6" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className="m-0 text-[1.1rem] font-display text-ink">No transaction data yet</h3>
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">Upload a bank CSV export to get started. Your data stays in this browser — nothing is sent anywhere.</p>
          <ol className="m-0 mt-1 py-0 pl-5 grid gap-[0.38rem] text-[0.83rem] text-ink-soft text-left">
            <li>Export a CSV from your bank (look for "Export transactions" or similar)</li>
            <li>Click <strong className="text-ink">Add CSV</strong> above to upload it</li>
            <li>Head to <strong className="text-ink">Expenses</strong> or <strong className="text-ink">Dashboard</strong> to see your spending</li>
          </ol>
        </section>
      ) : (
        <section className="grid grid-cols-4 gap-[0.65rem]">
          <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
            <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">CSV Files</h2>
            <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{batches.length}</p>
          </article>
          <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
            <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Unique Transactions</h2>
            <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{totalTransactionCount}</p>
          </article>
          <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
            <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Covered Days</h2>
            <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{coveredDayCount}</p>
          </article>
          <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
            <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Covered Months</h2>
            <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{coverageMonths.length}</p>
          </article>
        </section>
      )}

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">Coverage Calendar</h3>
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">Days inside a batch coverage range are highlighted, even if there were no transactions.</p>
        </div>
        <div className="coverage-calendar">
            {coverageMonths.map((month) => (
              <article key={month.monthKey} className="coverage-month-card">
                <div className="coverage-month-header">
                  <div className="coverage-month-title">
                    <h4>{month.label}</h4>
                    <span className="coverage-month-stat">{month.coveredDays}/{month.totalDays}</span>
                  </div>
                  <div className="coverage-month-bar">
                    <div
                      className="coverage-month-bar-fill"
                      style={{ width: `${Math.round((month.coveredDays / month.totalDays) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="coverage-weekdays" aria-hidden="true">
                  {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
                    <span key={`${month.monthKey}-weekday-${index}`}>{label}</span>
                  ))}
                </div>
                <div className="coverage-grid">
                  {month.days.map((day) => (
                    <span
                      key={day.key}
                      className={
                        day.isPlaceholder
                          ? "coverage-day is-placeholder"
                          : day.covered
                            ? "coverage-day is-covered"
                            : "coverage-day"
                      }
                      title={day.isPlaceholder ? undefined : day.key}
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>
      </section>

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">Uploaded CSVs</h3>
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">Coverage dates drive the calendar and future period comparisons.</p>
        </div>
        {batches.length === 0 ? (
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">No CSVs added yet.</p>
        ) : (
          <ul className="list-none m-0 pt-3 p-0 grid gap-[0.6rem]">
            {batches.map((batch) => (
              <li key={batch.id} className="border border-line rounded-md p-3 hover:border-line-strong transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="m-0 font-display text-[0.95rem] text-ink">{batch.fileName}</h4>
                    <p className="text-muted text-[0.82rem] mt-[0.42rem]">Imported {formatDateTime(batch.importedAt)}</p>
                  </div>
                  <button type="button" className="mode-btn" onClick={() => onDeleteBatch(batch.id)}>
                    Delete
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.8rem] text-muted">
                  <span>{batch.transactionCount} transactions</span>
                  <span>{batch.warningCount} warnings</span>
                  <span>Observed {formatShortDate(batch.observedStart)} to {formatShortDate(batch.observedEnd)}</span>
                </div>

                <div className="mt-[0.65rem] grid grid-cols-2 gap-[0.5rem]">
                  <label className="grid gap-[0.24rem] text-[0.75rem] text-ink-soft font-semibold">
                    Coverage start
                    <input
                      type="date"
                      value={batch.coverageStart}
                      className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                      onChange={(event) => onUpdateBatchCoverage(batch.id, { coverageStart: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-[0.24rem] text-[0.75rem] text-ink-soft font-semibold">
                    Coverage end
                    <input
                      type="date"
                      value={batch.coverageEnd}
                      className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                      onChange={(event) => onUpdateBatchCoverage(batch.id, { coverageEnd: event.target.value })}
                    />
                  </label>
                </div>

                {batch.warningCount > 0 ? (
                  <details className="mt-[0.7rem] border-t border-line pt-[0.5rem] text-[0.8rem] text-muted">
                    <summary className="cursor-pointer font-bold">Skipped row warnings ({batch.warningCount})</summary>
                    <ul className="mt-2 pl-[1.1rem]">
                      {batch.warnings.map((warning, index) => (
                        <li key={`${batch.id}-warning-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
