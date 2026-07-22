import { useContext, useSyncExternalStore } from 'react';
import type { AppStore, StoreSnapshot } from '../state/index.ts';
import { StoreContext } from './store-context.ts';

export function useStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used within a StoreProvider');
  return store;
}

/** Subscribe to the store and re-render on change. */
export function useSnapshot(): StoreSnapshot {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
