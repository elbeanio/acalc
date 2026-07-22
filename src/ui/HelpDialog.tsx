import { useEffect, useRef } from 'react';

interface Entry {
  syntax: string;
  meaning: string;
  example?: string;
}
interface Section {
  title: string;
  entries: Entry[];
}

const SECTIONS: Section[] = [
  {
    title: 'Operators',
    entries: [
      { syntax: '+  -  *  /', meaning: 'add, subtract, multiply, divide', example: '2 + 3 * 4 = 14' },
      { syntax: '^', meaning: 'power', example: '2 ^ 10 = 1024' },
      { syntax: 'x%', meaning: 'percent (÷ 100)', example: '10% = 0.1,  200 + 10% = 200.1' },
      { syntax: 'x % y', meaning: 'modulo (remainder)', example: '10 % 3 = 1' },
      { syntax: 'x!', meaning: 'factorial', example: '5! = 120' },
      { syntax: '( )', meaning: 'grouping', example: '(1 + 2) * 3 = 9' },
      { syntax: '-x', meaning: 'negate', example: '-2 ^ 2 = -4' },
    ],
  },
  {
    title: 'Functions',
    entries: [
      { syntax: 'sqrt(x)', meaning: 'square root', example: 'sqrt(16) = 4' },
      { syntax: 'x ^ (1/n)', meaning: 'nth root (via a fractional power)', example: '27 ^ (1/3) = 3' },
      { syntax: 'sin, cos, tan', meaning: 'trigonometry (radians)', example: 'sin(pi / 2) = 1' },
      { syntax: 'ln(x)', meaning: 'natural log', example: 'ln(e) = 1' },
      { syntax: 'log(x)', meaning: 'log base 10', example: 'log(1000) = 3' },
      { syntax: 'log(x, b)', meaning: 'log base b', example: 'log(8, 2) = 3' },
      { syntax: 'exp(x)', meaning: 'e to the x', example: 'exp(1) = 2.71828…' },
      { syntax: 'abs(x)', meaning: 'absolute value', example: 'abs(-5) = 5' },
      { syntax: 'round(x, dp?)', meaning: 'round (to dp places)', example: 'round(3.14159, 2) = 3.14' },
      { syntax: 'floor(x), ceil(x)', meaning: 'round down / up', example: 'floor(3.7) = 3' },
      { syntax: 'min(…), max(…)', meaning: 'smallest / largest', example: 'max(3, 1, 2) = 3' },
    ],
  },
  {
    title: 'Constants',
    entries: [
      { syntax: 'pi', meaning: 'π', example: '3.14159…' },
      { syntax: 'e', meaning: 'Euler’s number', example: '2.71828…' },
    ],
  },
  {
    title: 'References',
    entries: [
      { syntax: '$1, $2, …', meaning: 'the result of another row, by its number', example: '$1 * 10' },
      { syntax: '$name', meaning: 'reference a named row', example: '$total * 1.2' },
      { syntax: 'type  $', meaning: 'opens a picker of every row and its value' },
      { syntax: 'name box', meaning: 'the box on the left names a row, so you can use $name' },
    ],
  },
  {
    title: 'Numbers',
    entries: [
      { syntax: '3.14', meaning: 'decimals — exact, no floating-point errors', example: '0.1 + 0.2 = 0.3' },
      { syntax: '1.5e-3', meaning: 'scientific notation', example: '= 0.0015' },
      { syntax: '×  ÷  −', meaning: 'unicode operators are accepted too' },
    ],
  },
  {
    title: 'Keyboard',
    entries: [
      { syntax: 'Enter', meaning: 'new row below' },
      { syntax: '↑ / ↓', meaning: 'move to the row above / below' },
      { syntax: '⌥↑ / ⌥↓', meaning: 'reorder the current row' },
      { syntax: '⌘⇧⌫', meaning: 'delete the current row' },
      { syntax: '⌘Z / ⌘⇧Z', meaning: 'undo / redo (per stack)' },
      { syntax: '$', meaning: 'insert a reference' },
      { syntax: '?', meaning: 'open this help' },
    ],
  },
];

export function HelpDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', ''); // jsdom fallback
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="help-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click on the backdrop
      }}
    >
      <div className="help-inner">
        <div className="help-header">
          <h2>acalc cheat sheet</h2>
          <button
            className="help-close"
            onClick={onClose}
            aria-label="Close help"
            title="Close"
          >
            ×
          </button>
        </div>
        {SECTIONS.map((section) => (
          <section key={section.title} className="help-section">
            <h3>{section.title}</h3>
            <table className="help-table">
              <tbody>
                {section.entries.map((entry) => (
                  <tr key={entry.syntax}>
                    <td className="help-syntax">{entry.syntax}</td>
                    <td className="help-meaning">{entry.meaning}</td>
                    <td className="help-example">{entry.example ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </dialog>
  );
}
