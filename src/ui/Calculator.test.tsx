import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { Calculator } from './Calculator.tsx';
import { renderWithStore } from './test-utils.tsx';
import { AppStore, MemoryStorageAdapter } from '../state/index.ts';

afterEach(cleanup);

/**
 * CodeMirror's contenteditable is impractical to type into under jsdom, so we
 * drive edits through the same store that backs the UI and assert the rendered
 * result cells. Live typing / autocomplete is covered by manual testing.
 */
const activeId = (store: AppStore) => store.getSnapshot().activeStackId!;
const edit = (store: AppStore, rowId: number, source: string) =>
  act(() => store.updateRowSource(activeId(store), rowId, source));
const results = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('.row-result')).map(
    (el) => el.getAttribute('data-value'),
  );

describe('Calculator', () => {
  it('renders a computed result', () => {
    const { store, container } = renderWithStore(<Calculator />);
    edit(store, 1, '2 + 3 * 4');
    expect(results(container)).toContain('14');
  });

  it('references an earlier row and ripples edits through the chain', () => {
    const { store, container } = renderWithStore(<Calculator />);
    edit(store, 1, '2 + 3');
    fireEvent.click(screen.getByText('+ Add row'));
    edit(store, 2, '$1 * 10');
    expect(results(container)).toEqual(['5', '50']);

    edit(store, 1, '2 + 8'); // editing the earlier row updates the dependent
    expect(results(container)).toEqual(['10', '100']);
  });

  it('shows which reference is dangling', () => {
    const { store, container } = renderWithStore(<Calculator />);
    edit(store, 1, '$99 + 1');
    expect(results(container)).toContain('#ref!($99)');
  });

  it('shows the first-run primer while empty and hides it once typing starts', () => {
    const { store } = renderWithStore(<Calculator />);
    expect(screen.queryByText(/one complete expression/i)).not.toBeNull();
    edit(store, 1, '3 + 3');
    expect(screen.queryByText(/one complete expression/i)).toBeNull();
  });

  it('hides the primer once a second stack exists (not just any empty stack)', () => {
    renderWithStore(<Calculator />);
    expect(screen.queryByText(/one complete expression/i)).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'New stack' }));
    // The new tab is empty too, but the model has clearly been discovered.
    expect(screen.queryByText(/one complete expression/i)).toBeNull();
  });

  it('never shows the primer for a returning user (persisted state exists)', () => {
    const adapter = new MemoryStorageAdapter();
    let n = 0;
    const ids = () => `stack-${++n}`;
    new AppStore(adapter, ids); // first run persists the initial state
    const returning = new AppStore(adapter, ids); // now loads it → not fresh
    renderWithStore(<Calculator />, returning);
    expect(screen.queryByText(/one complete expression/i)).toBeNull();
  });

  it('opens help from the first-run primer', () => {
    const onOpenHelp = vi.fn();
    renderWithStore(<Calculator onOpenHelp={onOpenHelp} />);
    fireEvent.click(
      screen.getByRole('button', { name: /open the cheat sheet/i }),
    );
    expect(onOpenHelp).toHaveBeenCalledOnce();
  });

  it('adds a new stack via the + tab', () => {
    renderWithStore(<Calculator />);
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'New stack' }));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
