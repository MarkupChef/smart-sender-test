import { setupServer } from 'msw/node';
import { createHandlers } from './handlers';

export const TEST_BASE_URL = 'http://localhost';

export const server = setupServer(...createHandlers(TEST_BASE_URL));
