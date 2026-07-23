import { useEffect, useRef, useState } from 'react';
import { decodeStack } from './state/index.ts';
import { Calculator } from './ui/Calculator.tsx';
import { HelpDialog } from './ui/HelpDialog.tsx';
import { useStore } from './ui/useStore.ts';

export function App() {
  const store = useStore();
  const [helpOpen, setHelpOpen] = useState(false);

  // A share link carries a stack in the URL hash (`#s=…`). On open, clone it in
  // as a new stack, then strip the hash so a refresh doesn't re-clone it.
  const importedShare = useRef(false);
  useEffect(() => {
    if (importedShare.current) return;
    importedShare.current = true;
    const match = /^#s=(.+)$/.exec(window.location.hash);
    if (!match) return;
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    );
    const shared = decodeStack(match[1]!);
    if (shared) store.importStack(shared);
  }, [store]);

  // "?" opens help — but not while typing in a row/name field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !isEditable(e.target)) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, []);

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>acalc</h1>
          <p className="tagline">A keyboard-first calculator.</p>
        </div>
        <button
          className="help-button"
          onClick={() => setHelpOpen(true)}
          aria-label="Help"
          title="Help (?)"
        >
          ?
        </button>
      </header>
      <Calculator onOpenHelp={() => setHelpOpen(true)} />
      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  );
}

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('input, textarea, [contenteditable="true"]') !== null
  );
}
