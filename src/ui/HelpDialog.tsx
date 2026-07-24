import { useEffect, useRef } from 'react';
import { SHORTCUTS } from './shortcuts.ts';

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
      { syntax: 'cbrt(x)', meaning: 'cube root', example: 'cbrt(27) = 3' },
      { syntax: 'root(x, n)', meaning: 'nth root (also x ^ (1/n))', example: 'root(32, 5) = 2' },
      { syntax: 'sin, cos, tan', meaning: 'trigonometry (radians)', example: 'sin(pi / 2) = 1' },
      { syntax: 'ln(x)', meaning: 'natural log', example: 'ln(e) = 1' },
      { syntax: 'log(x)', meaning: 'log base 10', example: 'log(1000) = 3' },
      { syntax: 'log(x, b)', meaning: 'log base b', example: 'log(8, 2) = 3' },
      { syntax: 'exp(x)', meaning: 'e to the x', example: 'exp(1) = 2.71828…' },
      { syntax: 'abs(x)', meaning: 'absolute value', example: 'abs(-5) = 5' },
      { syntax: 'round(x, dp?)', meaning: 'round (to dp places)', example: 'round(3.14159, 2) = 3.14' },
      { syntax: 'floor(x), ceil(x)', meaning: 'round down / up', example: 'floor(3.7) = 3' },
      { syntax: 'min(…), max(…)', meaning: 'smallest / largest', example: 'max(3, 1, 2) = 3' },
      { syntax: 'sum(…), product(…)', meaning: 'add / multiply all', example: 'sum(2, 3, 4) = 9' },
      { syntax: 'avg(…), count(…)', meaning: 'mean / how many', example: 'avg(2, 4, 6) = 4' },
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
      { syntax: '$', meaning: 'opens a picker of every row and its value' },
      { syntax: '$name', meaning: 'reference a named row', example: '$total * 1.2' },
      { syntax: '$1..$5', meaning: 'a range of rows (ids or names), for aggregates', example: 'sum($start..$end)' },
      { syntax: 'name box', meaning: 'the box on the left names a row, so you can use $name' },
    ],
  },
  {
    title: 'Units',
    entries: [
      { syntax: '5 km + 300 m', meaning: 'mix compatible units', example: '= 5.3km' },
      { syntax: '2h 30min', meaning: 'juxtaposed parts sum (min, not m)', example: '= 2.5 hours' },
      { syntax: 'x to unit  ·  x in unit', meaning: 'convert', example: '50 mph in km/h = 80.4672km/h' },
      { syntax: 'length / mass / time', meaning: 'km, mi, ft, kg, lb, s, h, day…' },
      { syntax: 'temperature', meaning: 'C, F, K (or °C, °F)', example: '20c in f = 68°F' },
      { syntax: 'data', meaning: 'KB, MB, GB, KiB, MiB…', example: '1 GiB in MB = 1073.741824MB' },
      { syntax: 'angles', meaning: 'deg, rad — trig takes degrees', example: 'sin(90 deg) = 1' },
      { syntax: 'currency (postfix)', meaning: 'GBP, USD, EUR… (static rates)', example: '40 USD in GBP = 31.6GBP' },
      { syntax: 'no $ prefix', meaning: '$ is the reference sigil — write 40 USD, not $40' },
      { syntax: '(1/2) rad', meaning: 'a unit binds tighter than ÷, so 1/2 rad = 1/(2 rad)', example: 'parenthesise' },
    ],
  },
  {
    title: 'Dates',
    entries: [
      { syntax: '2026-12-25', meaning: 'an ISO date', example: 'today, too' },
      { syntax: 'date - date', meaning: 'difference, in days', example: '2026-12-25 - today = 154 days' },
      { syntax: 'date + duration', meaning: 'shift a date', example: 'today + 3 weeks' },
      { syntax: '+ months / years', meaning: 'calendar math, clamped', example: '2026-01-31 + 1 month = 2026-02-28' },
      { syntax: '9:30, now', meaning: 'clock times (wrap at midnight)', example: '23:00 + 3h = 02:00' },
      { syntax: 'time - time', meaning: 'elapsed, in hours', example: '17:00 - 9:30 = 7.5 hours' },
    ],
  },
  {
    title: 'Numbers',
    entries: [
      { syntax: '3.14', meaning: 'decimal numbers' },
      { syntax: '1.5e-3', meaning: 'scientific notation', example: '= 0.0015' },
      { syntax: '0xFF, 0b1010, 0o777', meaning: 'hex / binary / octal literals', example: '0xFF = 255' },
      { syntax: 'x to hex / bin / oct', meaning: 'show a result in a base', example: '255 to hex = 0xff' },
      { syntax: '×  ÷  −', meaning: 'unicode operators are accepted too' },
    ],
  },
  {
    title: 'Keyboard',
    entries: [
      { syntax: 'Enter', meaning: 'new row below' },
      { syntax: '↑ / ↓', meaning: 'move to the row above / below' },
      { syntax: `${SHORTCUTS.moveUp} / ${SHORTCUTS.moveDown}`, meaning: 'reorder the current row' },
      { syntax: SHORTCUTS.deleteRow, meaning: 'delete the current row' },
      { syntax: `${SHORTCUTS.undo} / ${SHORTCUTS.redo}`, meaning: 'undo / redo (per stack)' },
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
      <button
        className="help-close"
        onClick={onClose}
        aria-label="Close help"
        title="Close"
      >
        ×
      </button>
      <div className="help-inner">
        <div className="help-header">
          <h2>acalc cheat sheet</h2>
        </div>
        <section className="help-section help-lead">
          <h3>How it works</h3>
          <p>
            Each row holds <strong>one complete expression</strong> — not a
            single number or operator. Press <kbd>Enter</kbd> for a new row, and
            reference an earlier result with <code>$n</code> (or <code>$name</code>{' '}
            if you name a row in the left box).
          </p>
          <table className="help-example-stack">
            <tbody>
              <tr>
                <td className="frh-expr">3 + 3</td>
                <td className="frh-arrow">→</td>
                <td className="frh-result">
                  <span className="frh-ref">$1</span> = 6
                </td>
              </tr>
              <tr>
                <td className="frh-expr">
                  <span className="frh-ref">$1</span> * 2
                </td>
                <td className="frh-arrow">→</td>
                <td className="frh-result">
                  <span className="frh-ref">$2</span> = 12
                </td>
              </tr>
            </tbody>
          </table>
        </section>
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
