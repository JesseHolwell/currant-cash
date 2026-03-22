import './ApiKeyModal.css';
import { useState } from "react";

export function ApiKeyModal({
  currentKey,
  onSave,
  onClose,
}: {
  currentKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentKey);

  function handleSave() {
    onSave(value.trim());
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  }

  return (
    <div className="migration-overlay" onClick={onClose} aria-hidden="true">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-key-dialog-title"
        className="migration-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="api-key-dialog-title">OpenAI API Key</h2>
        <p>
          Enter your OpenAI API key to enable AI-powered category suggestions. Your key is stored
          locally in this browser only and is never sent to Currant&apos;s servers.
        </p>
        <div className="mt-3">
          <input
            type="password"
            className="w-full border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)] font-mono"
            placeholder="sk-..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <p className="text-muted text-[0.8rem] mt-2">
          Get your API key from{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline hover:opacity-80"
          >
            platform.openai.com/api-keys
          </a>
          . Usage is billed to your OpenAI account.
        </p>
        <div className="migration-actions">
          <button
            type="button"
            className="migration-btn-primary"
            onClick={handleSave}
            disabled={!value.trim()}
          >
            Save key
          </button>
          <button type="button" className="migration-btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
