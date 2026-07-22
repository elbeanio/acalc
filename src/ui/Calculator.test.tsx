import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { Calculator } from './Calculator.tsx';
import { renderWithStore } from './test-utils.tsx';

afterEach(cleanup);

function sources() {
  return screen.getAllByPlaceholderText('expression…') as HTMLInputElement[];
}

describe('Calculator', () => {
  it('evaluates an expression live as you type', () => {
    renderWithStore(<Calculator />);
    fireEvent.change(sources()[0]!, { target: { value: '2 + 3 * 4' } });
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  it('references an earlier row and recomputes the chain', () => {
    renderWithStore(<Calculator />);
    fireEvent.change(sources()[0]!, { target: { value: '2 + 3' } });
    fireEvent.click(screen.getByText('+ Add row'));
    fireEvent.change(sources()[1]!, { target: { value: '$1 * 10' } });
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();

    // Editing the earlier row ripples to the dependent row.
    fireEvent.change(sources()[0]!, { target: { value: '2 + 8' } });
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('shows #ref! for a dangling reference', () => {
    renderWithStore(<Calculator />);
    fireEvent.change(sources()[0]!, { target: { value: '$99 + 1' } });
    expect(screen.getByText('#ref!')).toBeInTheDocument();
  });

  it('adds a new stack via the + tab', () => {
    renderWithStore(<Calculator />);
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'New stack' }));
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
