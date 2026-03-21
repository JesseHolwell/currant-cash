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
    <div className="migration-overlay" onClick={onClose}>
      <div className="migration-dialog api-key-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>OpenAI API Key</h2>
        <p>
          Enter your OpenAI API key to enable AI-powered category suggestions. Your key is stored
          locally in this browser only and is never sent to Currant&apos;s servers.
        </p>
        <div className="api-key-input-group">
          <input
            type="password"
            className="api-key-input"
            placeholder="sk-..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <p className="api-key-hint">
          Get your API key from{" "}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
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
