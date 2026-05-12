import { useEffect, useMemo, useState } from "react";
import {
  buildSnapshotsFromImport,
  detectDateFormat,
  parseDateForFormat,
  parsePastedTable,
  suggestColumnMappings,
  validatePlan,
} from "../../domain";
import type {
  AccountEntry,
  AccountHistorySnapshot,
  ColumnRole,
  DateFormat,
  DuplicatePolicy,
  ImportPlan,
  ParsedTable,
} from "../../domain";

type Step = "paste" | "map" | "confirm";

const PREVIEW_ROW_LIMIT = 5;

const inputCls =
  "border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.4rem] text-[0.82rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]";

export function ImportSnapshotsModal({
  accounts,
  existingSnapshots,
  onClose,
  onImport,
}: {
  accounts: AccountEntry[];
  existingSnapshots: AccountHistorySnapshot[];
  onClose: () => void;
  onImport: (snapshots: AccountHistorySnapshot[]) => void;
}) {
  const [step, setStep] = useState<Step>("paste");
  const [pasted, setPasted] = useState("");
  const [table, setTable] = useState<ParsedTable | null>(null);
  const [columnRoles, setColumnRoles] = useState<ColumnRole[]>([]);
  const [dateFormat, setDateFormat] = useState<DateFormat>("DMY");
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>("skip");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleParse() {
    const parsed = parsePastedTable(pasted);
    if (parsed.rows.length === 0) return;
    setTable(parsed);
    // Detect date column from first non-empty sample row.
    const sampleRow = parsed.rows[0];
    const suggested = suggestColumnMappings(parsed.headers, sampleRow, accounts);
    setColumnRoles(suggested);
    // Detect date format from the column suggested as date.
    const dateColIdx = suggested.findIndex((r) => r.kind === "date");
    if (dateColIdx >= 0) {
      const samples = parsed.rows.slice(0, 20).map((row) => row[dateColIdx] ?? "");
      setDateFormat(detectDateFormat(samples));
    }
    setStep("map");
  }

  const plan: ImportPlan = useMemo(
    () => ({ columnRoles, dateFormat, duplicatePolicy }),
    [columnRoles, dateFormat, duplicatePolicy]
  );

  const validation = useMemo(() => validatePlan(plan), [plan]);

  const dryRun = useMemo(() => {
    if (!table) return null;
    if (!validation.valid) return null;
    return buildSnapshotsFromImport(table, plan, existingSnapshots);
  }, [table, plan, validation.valid, existingSnapshots]);

  const accountById = useMemo(() => {
    const m = new Map<string, AccountEntry>();
    for (const a of accounts) m.set(a.id, a);
    return m;
  }, [accounts]);

  function setColumnRole(index: number, role: ColumnRole) {
    setColumnRoles((prev) => {
      const next = [...prev];
      // Ensure only one "date" column at a time.
      if (role.kind === "date") {
        for (let i = 0; i < next.length; i++) {
          if (i !== index && next[i].kind === "date") next[i] = { kind: "skip" };
        }
      }
      // Ensure no account is mapped twice.
      if (role.kind === "account") {
        for (let i = 0; i < next.length; i++) {
          const existing = next[i];
          if (i !== index && existing.kind === "account" && existing.accountId === role.accountId) {
            next[i] = { kind: "skip" };
          }
        }
      }
      next[index] = role;
      return next;
    });
  }

  function handleCommit() {
    if (!dryRun) return;
    onImport(dryRun.snapshots);
    onClose();
  }

  return (
    <div className="migration-overlay" onClick={onClose} aria-hidden="true">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-snapshots-title"
        className="bg-surface border border-line-strong rounded-xl shadow-soft"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "min(1100px, 95vw)",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="px-6 pt-5 pb-3 border-b border-line">
          <div className="flex items-center justify-between gap-3">
            <h2 id="import-snapshots-title" className="font-display text-[1.3rem] tracking-[-0.02em] text-ink m-0">
              Import account balance history
            </h2>
            <div className="flex items-center gap-2">
              <StepDot active={step === "paste"} done={step !== "paste"} label="1 Paste" />
              <StepDot active={step === "map"} done={step === "confirm"} label="2 Map" />
              <StepDot active={step === "confirm"} done={false} label="3 Confirm" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          {step === "paste" ? (
            <PasteStep pasted={pasted} onChange={setPasted} />
          ) : null}

          {step === "map" && table ? (
            <MapStep
              table={table}
              columnRoles={columnRoles}
              dateFormat={dateFormat}
              onColumnRoleChange={setColumnRole}
              onDateFormatChange={setDateFormat}
              accounts={accounts}
              validation={validation}
              accountById={accountById}
            />
          ) : null}

          {step === "confirm" && table && dryRun ? (
            <ConfirmStep
              table={table}
              dryRun={dryRun}
              duplicatePolicy={duplicatePolicy}
              onDuplicatePolicyChange={setDuplicatePolicy}
            />
          ) : null}
        </div>

        <div className="px-6 py-3 border-t border-line flex items-center justify-between gap-3">
          <button type="button" className="mode-btn" onClick={onClose}>Cancel</button>
          <div className="flex items-center gap-2">
            {step !== "paste" ? (
              <button type="button" className="mode-btn" onClick={() => setStep(step === "confirm" ? "map" : "paste")}>
                Back
              </button>
            ) : null}
            {step === "paste" ? (
              <button
                type="button"
                className="mode-btn active"
                onClick={handleParse}
                disabled={pasted.trim().length === 0}
              >
                Parse →
              </button>
            ) : null}
            {step === "map" ? (
              <button
                type="button"
                className="mode-btn active"
                onClick={() => setStep("confirm")}
                disabled={!validation.valid}
              >
                Continue →
              </button>
            ) : null}
            {step === "confirm" ? (
              <button
                type="button"
                className="mode-btn active"
                onClick={handleCommit}
                disabled={!dryRun || dryRun.newDates + dryRun.replacedDuplicates === 0}
              >
                Import
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  const cls = active
    ? "text-ink font-bold"
    : done
      ? "text-accent"
      : "text-muted";
  return <span className={`text-[0.72rem] uppercase tracking-[0.08em] ${cls}`}>{label}</span>;
}

function PasteStep({ pasted, onChange }: { pasted: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-3">
      <p className="text-ink-soft text-[0.88rem] m-0">
        Copy rows from your spreadsheet (Excel, Google Sheets, Numbers) and paste them below.
        Include the header row if you have one — it helps auto-detect column mappings.
      </p>
      <textarea
        value={pasted}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        placeholder={"Date\tBank\tSavings\tCrypto\n07/12/2021\t1000\t2000\t500\n..."}
        className="font-mono text-[0.82rem] border border-line-strong bg-surface text-ink rounded-sm px-3 py-2 focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)] w-full"
        spellCheck={false}
        autoFocus
      />
      <p className="text-muted text-[0.78rem] m-0">
        Tab-separated (from spreadsheets) or comma-separated both work. Computed columns like
        "Net worth" or "Assets" are auto-skipped — you can still override on the next step.
      </p>
    </div>
  );
}

function MapStep({
  table,
  columnRoles,
  dateFormat,
  onColumnRoleChange,
  onDateFormatChange,
  accounts,
  validation,
  accountById,
}: {
  table: ParsedTable;
  columnRoles: ColumnRole[];
  dateFormat: DateFormat;
  onColumnRoleChange: (index: number, role: ColumnRole) => void;
  onDateFormatChange: (f: DateFormat) => void;
  accounts: AccountEntry[];
  validation: { valid: boolean; reasons: string[] };
  accountById: Map<string, AccountEntry>;
}) {
  const previewRows = table.rows.slice(0, PREVIEW_ROW_LIMIT);
  const totalRows = table.rows.length;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-ink-soft text-[0.86rem] m-0">
          Map each column to an account. Skip computed/aggregate columns.
          {totalRows > PREVIEW_ROW_LIMIT ? ` Showing ${PREVIEW_ROW_LIMIT} of ${totalRows} rows.` : ` ${totalRows} rows.`}
        </p>
        <label className="flex items-center gap-2 text-[0.82rem] text-ink-soft">
          <span>Date format</span>
          <select
            value={dateFormat}
            className={inputCls}
            onChange={(e) => onDateFormatChange(e.target.value as DateFormat)}
          >
            <option value="DMY">Day / Month / Year</option>
            <option value="MDY">Month / Day / Year</option>
            <option value="YMD">Year - Month - Day</option>
          </select>
        </label>
      </div>

      <div className="overflow-auto border border-line rounded-md">
        <table className="w-full border-collapse text-[0.82rem]">
          <thead>
            <tr>
              {table.headers.map((header, i) => (
                <th key={i} className="text-left p-2 border-b border-line bg-[var(--bg-warm)] align-top">
                  <div className="font-bold text-ink text-[0.84rem] mb-1">{header}</div>
                  <ColumnRoleSelect
                    role={columnRoles[i] ?? { kind: "skip" }}
                    onChange={(role) => onColumnRoleChange(i, role)}
                    accounts={accounts}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => {
                  const role = columnRoles[c];
                  const isDate = role?.kind === "date";
                  const isAccount = role?.kind === "account";
                  let display: string = cell;
                  let invalid = false;
                  if (isDate && cell.trim()) {
                    const iso = parseDateForFormat(cell, dateFormat);
                    if (!iso) invalid = true;
                    else display = iso;
                  }
                  return (
                    <td
                      key={c}
                      className={`p-2 border-b border-line ${role?.kind === "skip" ? "text-muted" : "text-ink"} ${invalid ? "bg-danger-soft text-danger" : ""}`}
                    >
                      <span className="font-mono">{display || "—"}</span>
                      {isAccount && accountById.get((role).accountId) ? (
                        <div className="text-[0.7rem] text-muted mt-0.5">
                          → {accountById.get((role).accountId)?.name}
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!validation.valid ? (
        <div className="text-danger text-[0.82rem]">{validation.reasons.join(" ")}</div>
      ) : null}
    </div>
  );
}

function ColumnRoleSelect({
  role,
  onChange,
  accounts,
}: {
  role: ColumnRole;
  onChange: (role: ColumnRole) => void;
  accounts: AccountEntry[];
}) {
  const value = role.kind === "date" ? "__date__" : role.kind === "account" ? `acct:${role.accountId}` : "__skip__";

  return (
    <select
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__date__") onChange({ kind: "date" });
        else if (v === "__skip__") onChange({ kind: "skip" });
        else if (v.startsWith("acct:")) onChange({ kind: "account", accountId: v.slice(5) });
      }}
      className="border border-line-strong bg-surface text-ink rounded-sm px-[0.4rem] py-[0.3rem] text-[0.78rem] w-full focus:outline-none focus:border-[var(--accent-border)]"
    >
      <option value="__skip__">Skip</option>
      <option value="__date__">📅 Date</option>
      <optgroup label="Map to account">
        {accounts.map((a) => (
          <option key={a.id} value={`acct:${a.id}`}>
            {a.name}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

function ConfirmStep({
  table,
  dryRun,
  duplicatePolicy,
  onDuplicatePolicyChange,
}: {
  table: ParsedTable;
  dryRun: ReturnType<typeof buildSnapshotsFromImport>;
  duplicatePolicy: DuplicatePolicy;
  onDuplicatePolicyChange: (p: DuplicatePolicy) => void;
}) {
  const totalRowsParsed = table.rows.length;
  const hasDuplicates = dryRun.skippedDuplicates + dryRun.replacedDuplicates > 0
    || (duplicatePolicy === "skip" && dryRun.skippedDuplicates > 0)
    || (duplicatePolicy === "replace" && dryRun.replacedDuplicates > 0);
  const hasErrors = dryRun.errors.length > 0;

  return (
    <div className="grid gap-3">
      <div className="grid gap-1 text-[0.92rem]">
        <p className="m-0 text-ink">
          <strong>{dryRun.newDates}</strong> new date{dryRun.newDates === 1 ? "" : "s"} will be added.
          {duplicatePolicy === "skip" && dryRun.skippedDuplicates > 0 ? (
            <>
              {" "}<strong>{dryRun.skippedDuplicates}</strong> existing date{dryRun.skippedDuplicates === 1 ? "" : "s"} will be skipped.
            </>
          ) : null}
          {duplicatePolicy === "replace" && dryRun.replacedDuplicates > 0 ? (
            <>
              {" "}<strong>{dryRun.replacedDuplicates}</strong> existing date{dryRun.replacedDuplicates === 1 ? "" : "s"} will have balances updated.
            </>
          ) : null}
        </p>
        {hasErrors ? (
          <p className="m-0 text-danger text-[0.86rem]">
            {dryRun.errors.length} row{dryRun.errors.length === 1 ? "" : "s"} couldn't be parsed and will be skipped.
            {totalRowsParsed > dryRun.errors.length ? " The rest will be imported." : ""}
          </p>
        ) : null}
      </div>

      <fieldset className="grid gap-2 border border-line rounded-md p-3">
        <legend className="text-[0.72rem] uppercase tracking-[0.08em] text-muted font-bold px-1">
          If a date already exists
        </legend>
        <label className="flex items-center gap-2 text-[0.86rem] text-ink-soft">
          <input
            type="radio"
            name="dup-policy"
            checked={duplicatePolicy === "skip"}
            onChange={() => onDuplicatePolicyChange("skip")}
          />
          <span>Skip — keep the existing snapshot as-is.</span>
        </label>
        <label className="flex items-center gap-2 text-[0.86rem] text-ink-soft">
          <input
            type="radio"
            name="dup-policy"
            checked={duplicatePolicy === "replace"}
            onChange={() => onDuplicatePolicyChange("replace")}
          />
          <span>Replace — overwrite mapped account balances on that date (other balances kept).</span>
        </label>
      </fieldset>

      {hasErrors ? (
        <details className="border border-line rounded-md p-3 text-[0.82rem]">
          <summary className="cursor-pointer text-ink-soft">View {dryRun.errors.length} error{dryRun.errors.length === 1 ? "" : "s"}</summary>
          <ul className="mt-2 m-0 p-0 list-none grid gap-1">
            {dryRun.errors.slice(0, 30).map((err, i) => (
              <li key={i} className="text-danger">Row {err.row}: {err.message}</li>
            ))}
            {dryRun.errors.length > 30 ? <li className="text-muted">…and {dryRun.errors.length - 30} more</li> : null}
          </ul>
        </details>
      ) : null}

      {!hasDuplicates && !hasErrors && dryRun.newDates === 0 ? (
        <p className="text-muted text-[0.86rem] m-0">Nothing to import.</p>
      ) : null}
    </div>
  );
}
