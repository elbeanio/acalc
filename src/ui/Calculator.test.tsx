import { describe, it, expect, afterEach } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { Calculator } from './Calculator.tsx';
import { renderWithStore } from './test-utils.tsx';
import type { AppStore } from '../state/index.ts';

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
    (el) => el.textContent,
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

  it('shows #ref! for a dangling reference', () => {
    const { store, container } = renderWithStore(<Calculator />);
    edit(store, 1, '$99 + 1');
    expect(results(container)).toContain('#ref!');
  });

  it('adds a new stack via the + tab', () => {
    renderWithStore(<Calculator />);
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'New stack' }));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
