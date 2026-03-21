export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9* ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function createLocalId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function toTitleLabel(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function cleanupLabel(value: string): string {
  const compact = value
    .replace(/\s+[A-Z]{2,3}$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return compact.length > 34 ? `${compact.slice(0, 31)}...` : compact;
}

export function findAliasLabel(text: string, aliases: Array<{ label: string; needles: string[] }>): string | null {
  const normalized = normalizeForMatch(text);
  for (const alias of aliases) {
    if (alias.needles.some((needle) => normalized.includes(normalizeForMatch(needle)))) {
      return alias.label;
    }
  }
  return null;
}
