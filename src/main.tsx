import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { AppStore, LocalStorageAdapter } from './state/index.ts';
import { StoreProvider } from './ui/StoreProvider.tsx';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

const store = new AppStore(new LocalStorageAdapter());

createRoot(rootElement).render(
  <StrictMode>
    <StoreProvider store={store}>
      <App />
    </StoreProvider>
  </StrictMode>,
);

// Cloudflare Web Analytics — cookieless, no PII. Injected in production only so
// local dev and e2e traffic don't pollute the stats. The token is public.
if (import.meta.env.PROD) {
  const beacon = document.createElement('script');
  beacon.defer = true;
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.dataset.cfBeacon = '{"token": "0d01498688bf473e9d3fa7ad45a9dd97"}';
  document.head.appendChild(beacon);
}
