const STORAGE_KEY = 'fingerprint';
const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/;

let memoryFingerprint: string | undefined;

function readStored(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStored(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    return;
  }
}

function generate(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getFingerprint(): string {
  if (memoryFingerprint !== undefined) return memoryFingerprint;

  const stored = readStored();
  if (stored !== undefined && FINGERPRINT_PATTERN.test(stored)) {
    memoryFingerprint = stored;
    return stored;
  }

  memoryFingerprint = generate();
  writeStored(memoryFingerprint);
  return memoryFingerprint;
}
