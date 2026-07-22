import { createContext } from 'react';
import type { AppStore } from '../state/index.ts';

export const StoreContext = createContext<AppStore | null>(null);
