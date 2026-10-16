import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/app';
import { API_BASE_URL } from '@/app/http';
import { startMockWorker } from '@/mocks/browser';
import '@/shared/theme.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root is missing in index.html');

await startMockWorker(API_BASE_URL);

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
