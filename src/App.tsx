import { useEffect, useState } from 'react';
import { Calculator } from './ui/Calculator.tsx';
import { HelpDialog } from './ui/HelpDialog.tsx';

export function App() {
  const [helpOpen, setHelpOpen] = useState(false);

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
