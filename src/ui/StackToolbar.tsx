import { useEffect, useState } from 'react';
import type { Stack } from '../state/index.ts';
import { useStore } from './useStore.ts';

interface StackToolbarProps {
  stack: Stack;
  canUndo: boolean;
  canRedo: boolean;
}

export function StackToolbar({ stack, canUndo, canRedo }: StackToolbarProps) {
  const store = useStore();
  const [name, setName] = useState(stack.name);

  useEffect(() => setName(stack.name), [stack.id, stack.name]);

  const commitName = () => store.renameStack(stack.id, name.trim() || 'Untitled');

  return (
    <div className="toolbar">
      <input
        className="stack-name"
        value={name}
        aria-label="Stack name"
        onChange={(e) => setName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <span className="toolbar-spacer" />
      <button
        className="toolbar-btn"
        onClick={() => store.undo()}
        disabled={!canUndo}
        title="Undo (⌘Z)"
        aria-label="Undo"
      >
        ↶
      </button>
      <button
        className="toolbar-btn"
        onClick={() => store.redo()}
        disabled={!canRedo}
        title="Redo (⇧⌘Z)"
        aria-label="Redo"
      >
        ↷
      </button>
      <button
        className="toolbar-btn toolbar-btn--danger"
        onClick={() => {
          if (
            globalThis.confirm(`Delete stack "${stack.name}" and all its rows?`)
          ) {
            store.deleteStack(stack.id);
          }
        }}
        title="Delete stack"
        aria-label="Delete stack"
      >
        🗑
      </button>
    </div>
  );
}
