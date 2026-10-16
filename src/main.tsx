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
      Не вдалося запустити застосунок: mock API недоступний у цьому браузері. Спробуйте інший
      браузер або звичайне (не приватне) вікно.
    </p>,
  );
}
