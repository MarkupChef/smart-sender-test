import { setupWorker } from 'msw/browser';
import { endSession, expireSession, failNextUpdate } from './db';
import { createHandlers } from './handlers';

declare global {
  interface Window {
    __mock?: {
      endSession: () => void;
      expireSession: () => void;
      failNextUpdate: () => void;
    };
  }
}

export async function startMockWorker(baseUrl: string): Promise<void> {
  await setupWorker(...createHandlers(baseUrl)).start({
    onUnhandledFrame: 'bypass',
  });
  if (import.meta.env.DEV) {
    window.__mock = { endSession, expireSession, failNextUpdate };
  }
}
