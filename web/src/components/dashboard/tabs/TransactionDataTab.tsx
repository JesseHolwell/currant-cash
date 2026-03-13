import { useMemo } from "react";
import {
  buildCoveredDaySet,
  formatDateTime,
  formatShortDate,
  formatTimelineLabel,
  monthKey
} from "../../../models";
import type { TransactionBatch } from "../../../models";

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

function buildCoverageMonths(batches: TransactionBatch[]): CalendarMonth[] {
  if (batches.length === 0) {
    return [];
  }

  const coveredDays = buildCoveredDaySet(batches);
  const coverageStarts = batches.map((batch) => batch.coverageStart).sort((a, b) => a.localeCompare(b));
  const coverageEnds = batches.map((batch) => batch.coverageEnd).sort((a, b) => a.localeCompare(b));
  const startDate = new Date(`${coverageStarts[0]}T00:00:00`);
  const endDate = new Date(`${coverageEnds[coverageEnds.length - 1]}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return [];
  }

  const months: CalendarMonth[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endMarker = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

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
      label: formatTimelineLabel(thisMonthKey),
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
      <section className="panel controls-panel upload-panel">
        <div>
          <h3>CSV Library</h3>
          <p className="mode-note">
            CSVs are parsed and stored in this browser only. Adjust coverage dates when the export period starts or ends
            outside the first or last transaction.
          </p>
          {errorMessage ? <p className="error">{errorMessage}</p> : null}
          {statusMessage ? <p className="mode-note">{statusMessage}</p> : null}
        </div>
        <div className="mode-toggle">
          <label className="mode-btn active upload-btn">
            Add CSV
            <input
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

      <section className="stats">
        <article>
          <h2>CSV Files</h2>
          <p>{batches.length}</p>
        </article>
        <article>
          <h2>Unique Transactions</h2>
          <p>{totalTransactionCount}</p>
        </article>
        <article>
          <h2>Covered Days</h2>
          <p>{coveredDayCount}</p>
        </article>
        <article>
          <h2>Covered Months</h2>
          <p>{coverageMonths.length}</p>
        </article>
      </section>

      <section className="panel">
        <div className="rules-header">
          <h3>Coverage Calendar</h3>
          <p className="mode-note">Days inside a batch coverage range are highlighted, even if there were no transactions.</p>
        </div>
        {coverageMonths.length === 0 ? (
          <p className="mode-note">No CSV coverage yet. Add your first file to see the calendar.</p>
        ) : (
          <div className="coverage-calendar">
            {coverageMonths.map((month) => (
              <article key={month.monthKey} className="coverage-month-card">
                <div className="coverage-month-header">
                  <div>
                    <h4>{month.label}</h4>
                    <p>{month.coveredDays} / {month.totalDays} days covered</p>
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
                    >
                      {day.dayLabel}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="rules-header">
          <h3>Uploaded CSVs</h3>
          <p className="mode-note">Coverage dates drive the calendar and future period comparisons.</p>
        </div>
        {batches.length === 0 ? (
          <p className="mode-note">No CSVs added yet.</p>
        ) : (
          <ul className="batch-list">
            {batches.map((batch) => (
              <li key={batch.id} className="batch-item">
                <div className="batch-header">
                  <div>
                    <h4>{batch.fileName}</h4>
                    <p className="mode-note">Imported {formatDateTime(batch.importedAt)}</p>
                  </div>
                  <button type="button" className="mode-btn" onClick={() => onDeleteBatch(batch.id)}>
                    Delete
                  </button>
                </div>

                <div className="batch-stats">
                  <span>{batch.transactionCount} transactions</span>
                  <span>{batch.warningCount} warnings</span>
                  <span>Observed {formatShortDate(batch.observedStart)} to {formatShortDate(batch.observedEnd)}</span>
                </div>

                <div className="batch-range-editors">
                  <label>
                    Coverage start
                    <input
                      type="date"
                      value={batch.coverageStart}
                      onChange={(event) => onUpdateBatchCoverage(batch.id, { coverageStart: event.target.value })}
                    />
                  </label>
                  <label>
                    Coverage end
                    <input
                      type="date"
                      value={batch.coverageEnd}
                      onChange={(event) => onUpdateBatchCoverage(batch.id, { coverageEnd: event.target.value })}
                    />
                  </label>
                </div>

                {batch.warningCount > 0 ? (
                  <details className="batch-warnings">
                    <summary>Skipped row warnings ({batch.warningCount})</summary>
                    <ul>
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
