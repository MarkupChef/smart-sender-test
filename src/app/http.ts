import { createEndpoints } from '@/api/endpoints';
import { createHttpClient } from '@/api/http-client';

export const API_BASE_URL = window.location.origin;

let sessionExpiredHandler: () => void = () => undefined;

export function setSessionExpiredHandler(handler: () => void): void {
  sessionExpiredHandler = handler;
}

const client = createHttpClient({
  baseUrl: API_BASE_URL,
  onSessionExpired: () => {
    sessionExpiredHandler();
  },
});

export const api = createEndpoints(client);
