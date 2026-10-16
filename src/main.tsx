import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/app';
import { API_BASE_URL } from '@/app/http';
import { startMockWorker } from '@/mocks/browser';
import '@/shared/theme.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root is missing in index.html');

const root = createRoot(rootElement);

try {
  await startMockWorker(API_BASE_URL);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error(error);
  root.render(
    <p role="alert">
      Failed to start the app: the mock API is unavailable in this browser. Try another browser or a
      regular (non-private) window.
    </p>,
  );
}
