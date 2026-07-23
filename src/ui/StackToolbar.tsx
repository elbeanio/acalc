import { useEffect, useState } from 'react';
import { encodeStack, type Stack } from '../state/index.ts';
import { useStore } from './useStore.ts';

export function StackToolbar({ stack }: { stack: Stack }) {
  const store = useStore();
  const [name, setName] = useState(stack.name);
  const [shared, setShared] = useState(false);

  useEffect(() => setName(stack.name), [stack.id, stack.name]);

  const share = async () => {
    const { origin, pathname } = window.location;
    const url = `${origin}${pathname}#s=${encodeStack(stack)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — nothing to do.
    }
  };

  return (
    <div className="toolbar">
      <input
        className="stack-name"
        value={name}
        aria-label="Stack name"
        onChange={(e) => setName(e.target.value)}
        onBlur={() => store.renameStack(stack.id, name.trim() || 'Untitled')}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <button
        className="stack-share"
        onClick={share}
        title="Copy a shareable link to this stack"
        aria-label="Copy a shareable link to this stack"
      >
        {shared ? 'Link copied' : 'Share'}
      </button>
    </div>
  );
}
