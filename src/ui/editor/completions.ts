import type { Completion } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import { unitCompletions } from '../../units/index.ts';

/** Insert `name()` and drop the cursor between the parentheses. */
function applyCall(
  view: EditorView,
  completion: Completion,
  from: number,
  to: number,
): void {
  view.dispatch({
    changes: { from, to, insert: `${completion.label}()` },
    selection: { anchor: from + completion.label.length + 1 },
  });
}

interface FnDoc {
  readonly label: string;
  readonly sig: string;
  readonly info: string;
}

const FUNCTIONS: FnDoc[] = [
  { label: 'sqrt', sig: 'sqrt(x)', info: 'Square root' },
  { label: 'cbrt', sig: 'cbrt(x)', info: 'Cube root' },
  { label: 'root', sig: 'root(x, n)', info: 'nth root of x' },
  { label: 'sin', sig: 'sin(x)', info: 'Sine (radians; or use deg)' },
  { label: 'cos', sig: 'cos(x)', info: 'Cosine' },
  { label: 'tan', sig: 'tan(x)', info: 'Tangent' },
  { label: 'ln', sig: 'ln(x)', info: 'Natural logarithm' },
  { label: 'log', sig: 'log(x, b?)', info: 'Logarithm — base 10, or base b' },
  { label: 'exp', sig: 'exp(x)', info: 'e to the power x' },
  { label: 'abs', sig: 'abs(x)', info: 'Absolute value' },
  { label: 'round', sig: 'round(x, dp?)', info: 'Round to dp decimal places' },
  { label: 'floor', sig: 'floor(x)', info: 'Round down' },
  { label: 'ceil', sig: 'ceil(x)', info: 'Round up' },
  { label: 'min', sig: 'min(…)', info: 'Smallest of the arguments' },
  { label: 'max', sig: 'max(…)', info: 'Largest of the arguments' },
  { label: 'sum', sig: 'sum(…)', info: 'Sum — e.g. sum($1..$5)' },
  { label: 'product', sig: 'product(…)', info: 'Product of the arguments' },
  { label: 'avg', sig: 'avg(…)', info: 'Mean of the arguments' },
  { label: 'mean', sig: 'mean(…)', info: 'Mean of the arguments' },
  { label: 'count', sig: 'count(…)', info: 'How many arguments (or rows)' },
];

const CONSTANTS: Completion[] = [
  { label: 'pi', detail: 'constant', info: 'π ≈ 3.14159…', type: 'constant' },
  { label: 'e', detail: 'constant', info: 'Euler’s number ≈ 2.71828…', type: 'constant' },
  { label: 'today', detail: 'date', info: 'Today’s date', type: 'keyword' },
  { label: 'now', detail: 'time', info: 'Current clock time', type: 'keyword' },
];

/** Functions + constants + keywords, offered when typing an identifier. */
export const IDENT_COMPLETIONS: Completion[] = [
  ...FUNCTIONS.map(
    (f): Completion => ({
      label: f.label,
      detail: f.sig,
      info: f.info,
      type: 'function',
      apply: applyCall,
    }),
  ),
  ...CONSTANTS,
];

/** Base keywords, offered after `to` / `in` alongside units. */
const BASES: Completion[] = [
  { label: 'hex', detail: 'base', info: 'Hexadecimal', type: 'keyword' },
  { label: 'bin', detail: 'base', info: 'Binary', type: 'keyword' },
  { label: 'oct', detail: 'base', info: 'Octal', type: 'keyword' },
  { label: 'dec', detail: 'base', info: 'Decimal', type: 'keyword' },
];

/** Units + bases, offered as conversion targets after `to` / `in`. */
export const UNIT_COMPLETIONS: Completion[] = [
  ...unitCompletions().map(
    (u): Completion => ({ label: u.label, detail: u.info, type: 'unit' }),
  ),
  ...BASES,
];
