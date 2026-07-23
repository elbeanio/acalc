import { useEffect, useState } from 'react';
import type { Stack } from '../state/index.ts';
import { useStore } from './useStore.ts';

export function StackToolbar({ stack }: { stack: Stack }) {
  const store = useStore();
  const [name, setName] = useState(stack.name);

  useEffect(() => setName(stack.name), [stack.id, stack.name]);

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
    </div>
  );
}
