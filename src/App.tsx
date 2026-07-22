import { Calculator } from './ui/Calculator.tsx';

export function App() {
  return (
    <main className="app">
      <header className="app-header">
        <h1>acalc</h1>
        <p className="tagline">A keyboard-first calculator.</p>
      </header>
      <Calculator />
    </main>
  );
}
