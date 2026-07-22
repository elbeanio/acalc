import { useEffect } from 'react';
import { StackTabs } from './StackTabs.tsx';
import { StackToolbar } from './StackToolbar.tsx';
import { StackView } from './StackView.tsx';
import { useSnapshot, useStore } from './useStore.ts';

export function Calculator() {
  const store = useStore();
  const snapshot = useSnapshot();

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

  return (
    <div className="calculator">
      <StackTabs
        document={snapshot.document}
        activeStackId={snapshot.activeStackId}
      />
      {active && (
        <>
          <StackToolbar
            stack={active}
            canUndo={snapshot.canUndo}
            canRedo={snapshot.canRedo}
          />
          <StackView stack={active} focusRequest={snapshot.focus} />
        </>
      )}
    </div>
  );
}
