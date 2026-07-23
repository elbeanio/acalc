import { useEffect } from 'react';
import { prewarmKatex } from './katex-loader.ts';
import { SHORTCUTS } from './shortcuts.ts';
import { StackTabs } from './StackTabs.tsx';
import { StackToolbar } from './StackToolbar.tsx';
import { StackView } from './StackView.tsx';
import { useSnapshot, useStore } from './useStore.ts';

export function Calculator({
  onOpenHelp,
}: {
  onOpenHelp?: (() => void) | undefined;
}) {
  const store = useStore();
  const snapshot = useSnapshot();

  // Load KaTeX during idle time so the first typeset row is instant.
  useEffect(() => prewarmKatex(), []);

  // Global undo/redo shortcuts.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
      }
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [store]);

  const active = snapshot.document.stacks.find(
    (s) => s.id === snapshot.activeStackId,
  );

  // The newcomer primer is for a genuine first run only: no state was ever
  // loaded and the document is still the untouched single empty stack. It's
  // gone for good once anything is typed — and never returns for new tabs.
  const { stacks } = snapshot.document;
  const showFirstRun =
    snapshot.startedFresh &&
    stacks.length === 1 &&
    stacks[0]!.rows.length === 1 &&
    stacks[0]!.rows[0]!.source.trim() === '';

  return (
    <div className="calculator">
      <StackTabs
        document={snapshot.document}
        activeStackId={snapshot.activeStackId}
      />
      {active && (
        <>
          <StackToolbar stack={active} />
          <StackView
            stack={active}
            focusRequest={snapshot.focus}
            showFirstRun={showFirstRun}
            onOpenHelp={onOpenHelp}
          />
        </>
      )}
      <p className="hints">
        <kbd>Enter</kbd> new row · <kbd>$</kbd> reference ·{' '}
        <kbd>{SHORTCUTS.moveUp}</kbd>
        <kbd>{SHORTCUTS.moveDown}</kbd> move · <kbd>{SHORTCUTS.deleteRow}</kbd>{' '}
        delete row · <kbd>{SHORTCUTS.undo}</kbd> undo · <kbd>?</kbd> help
      </p>
    </div>
  );
}
