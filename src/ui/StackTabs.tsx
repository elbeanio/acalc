import type { Document } from '../state/index.ts';
import { useStore } from './useStore.ts';

interface StackTabsProps {
  document: Document;
  activeStackId: string | null;
}

export function StackTabs({ document, activeStackId }: StackTabsProps) {
  const store = useStore();
  return (
    <div className="tabs" role="tablist">
      {document.stacks.map((stack) => (
        <div
          key={stack.id}
          role="tab"
          tabIndex={0}
          aria-selected={stack.id === activeStackId}
          className={'tab' + (stack.id === activeStackId ? ' tab--active' : '')}
          onClick={() => store.setActiveStack(stack.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              store.setActiveStack(stack.id);
            }
          }}
        >
          <span className="tab-label">{stack.name}</span>
          <button
            className="tab-close"
            title="Close stack"
            aria-label={`Close ${stack.name}`}
            onClick={(e) => {
              e.stopPropagation();
              if (
                globalThis.confirm(`Delete stack "${stack.name}" and all its rows?`)
              ) {
                store.deleteStack(stack.id);
              }
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="tab tab--add"
        title="New stack"
        aria-label="New stack"
        onClick={() => store.addStack('Untitled')}
      >
        +
      </button>
    </div>
  );
}
