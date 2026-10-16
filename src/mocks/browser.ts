import { setupWorker } from 'msw/browser';
import { endSession, expireSession, failNextUpdate } from './db';
import { createHandlers } from './handlers';

declare global {
  interface Window {
    /** Dev-only switches for the manual checklist (quickstart.md). */
    __mock?: {
      endSession: () => void;
      expireSession: () => void;
      failNextUpdate: () => void;
    };
  }
}

/** `baseUrl` must be the one the http client uses, or requests bypass the mock. */
export async function startMockWorker(baseUrl: string): Promise<void> {
  await setupWorker(...createHandlers(baseUrl)).start({
    onUnhandledFrame: 'bypass',
  });
  if (import.meta.env.DEV) {
    window.__mock = { endSession, expireSession, failNextUpdate };
  }
}
