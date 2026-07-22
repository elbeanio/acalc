import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { App } from './App.tsx';
import { renderWithStore } from './ui/test-utils.tsx';

afterEach(cleanup);

describe('App', () => {
  it('renders the app title and a calculator with one row', () => {
    renderWithStore(<App />);
    expect(screen.getByRole('heading', { name: 'acalc' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('expression…')).toBeInTheDocument();
  });
});
