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

export async function startMockWorker(): Promise<void> {
  await setupWorker(...createHandlers(window.location.origin)).start({
    onUnhandledFrame: 'bypass',
  });
  if (import.meta.env.DEV) {
    window.__mock = { endSession, expireSession, failNextUpdate };
  }
}
