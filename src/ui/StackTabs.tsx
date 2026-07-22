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
        <button
          key={stack.id}
          role="tab"
          aria-selected={stack.id === activeStackId}
          className={
            'tab' + (stack.id === activeStackId ? ' tab--active' : '')
          }
          onClick={() => store.setActiveStack(stack.id)}
        >
          {stack.name}
        </button>
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
