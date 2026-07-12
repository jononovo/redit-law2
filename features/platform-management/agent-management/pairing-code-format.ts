export function normalizePairingCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, "");
}

export function formatPairingCodeForDisplay(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}
