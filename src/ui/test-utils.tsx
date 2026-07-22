import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { AppStore, MemoryStorageAdapter } from '../state/index.ts';
import { StoreProvider } from './StoreProvider.tsx';

function seededIds() {
  let n = 0;
  return () => `stack-${++n}`;
}

/** Render `ui` wrapped in a StoreProvider backed by an in-memory store. */
export function renderWithStore(
  ui: ReactElement,
  store = new AppStore(new MemoryStorageAdapter(), seededIds()),
): RenderResult & { store: AppStore } {
  return {
    store,
    ...render(<StoreProvider store={store}>{ui}</StoreProvider>),
  };
}
