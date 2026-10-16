const STORAGE_KEY = 'fingerprint';
const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/;

// Used when storage is unavailable (private mode, Node tests), so the id stays stable per load.
let memoryFingerprint: string | undefined;

function readStored(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function generate(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Device id: the only value the app keeps in browser storage. */
export function getFingerprint(): string {
  const stored = readStored();
  if (stored !== undefined && FINGERPRINT_PATTERN.test(stored)) return stored;

  memoryFingerprint ??= generate();
  try {
    localStorage.setItem(STORAGE_KEY, memoryFingerprint);
  } catch {
    // Storage is unavailable: the in-memory value is used for this page load.
  }
  return memoryFingerprint;
}
