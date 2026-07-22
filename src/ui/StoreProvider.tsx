import type { ReactNode } from 'react';
import type { AppStore } from '../state/index.ts';
import { StoreContext } from './store-context.ts';

export function StoreProvider({
  store,
  children,
}: {
  store: AppStore;
  children: ReactNode;
}) {
  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
}
