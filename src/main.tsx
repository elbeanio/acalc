import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { AppStore, LocalStorageAdapter } from './state/index.ts';
import { StoreProvider } from './ui/StoreProvider.tsx';
import 'katex/dist/katex.min.css';
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
