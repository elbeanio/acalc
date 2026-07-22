import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { App } from './App.tsx';

afterEach(cleanup);

describe('App', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'acalc' }),
    ).toBeInTheDocument();
  });
});
