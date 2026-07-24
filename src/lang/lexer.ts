import { ParseError } from './errors.ts';
import type { Token, TokenType } from './tokens.ts';

// ISO date literal, e.g. 2026-12-25. Checked before numbers so the year isn't
// eaten as its own number and the dashes read as subtraction.
const DATE_RE = /\d{4}-\d{2}-\d{2}/y;
// Clock time literal, e.g. 9:30 or 14:00:05. Before numbers so the hour isn't
// eaten as its own number.
const TIME_RE = /\d{1,2}:\d{2}(?::\d{2})?/y;
// Radix literals: 0xFF (hex), 0b1010 (binary), 0o777 (octal). Checked before
// the decimal rule so the leading `0` isn't eaten as its own number.
const RADIX_RE = /0[xX][0-9a-fA-F]+|0[bB][01]+|0[oO][0-7]+/y;
const NUMBER_RE = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
// Identifiers also allow ° and µ so units like °C / µm tokenise as one word.
const IDENT_RE = /[A-Za-z_°µ][A-Za-z0-9_°µ]*/y;
const DIGITS_RE = /\d+/y;
// Currency symbols are standalone tokens so `£40` splits into `£` and `40`.
const CURRENCY_CHARS = '£€¥';

/** Single-character tokens, including accepted unicode operator aliases. */
const SINGLE_CHAR: Record<string, TokenType> = {
  '+': 'plus',
  '-': 'minus',
  '−': 'minus', // − minus sign
  '*': 'star',
  '×': 'star', // × multiplication sign
  '/': 'slash',
  '÷': 'slash', // ÷ division sign
  '%': 'percent',
  '!': 'bang',
  '^': 'caret',
  '(': 'lparen',
  ')': 'rparen',
  ',': 'comma',
};

/** Tokenise an expression string. Throws {@link ParseError} on invalid input. */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i]!;

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // Range operator `..` (before number/`.` handling; e.g. $1..$5).
    if (ch === '.' && source[i + 1] === '.') {
      tokens.push({ type: 'dotdot', value: '..', start: i });
      i += 2;
      continue;
    }

    // ISO date literal (YYYY-MM-DD) — before numbers.
    if (ch >= '0' && ch <= '9') {
      DATE_RE.lastIndex = i;
      const dm = DATE_RE.exec(source);
      if (dm && dm.index === i) {
        tokens.push({ type: 'date', value: dm[0], start: i });
        i += dm[0].length;
        continue;
      }
    }

    // Clock time literal (H:MM / HH:MM:SS) — before numbers.
    if (ch >= '0' && ch <= '9') {
      TIME_RE.lastIndex = i;
      const tm = TIME_RE.exec(source);
      if (tm && tm.index === i) {
        tokens.push({ type: 'time', value: tm[0], start: i });
        i += tm[0].length;
        continue;
      }
    }

    // Radix literals (0x.., 0b.., 0o..) — before the decimal rule.
    if (ch === '0' && 'xXbBoO'.includes(source[i + 1] ?? '')) {
      RADIX_RE.lastIndex = i;
      const m = RADIX_RE.exec(source);
      if (m && m.index === i) {
        tokens.push({ type: 'number', value: m[0], start: i });
        i += m[0].length;
        continue;
      }
    }

    // Numbers (also handles a leading-dot form like `.5`).
    if ((ch >= '0' && ch <= '9') || (ch === '.' && isDigit(source[i + 1]))) {
      NUMBER_RE.lastIndex = i;
      const m = NUMBER_RE.exec(source)!;
      tokens.push({ type: 'number', value: m[0], start: i });
      i += m[0].length;
      continue;
    }

    // References: `$` followed by an identifier or digits.
    if (ch === '$') {
      IDENT_RE.lastIndex = i + 1;
      const nameMatch = IDENT_RE.exec(source);
      if (nameMatch && nameMatch.index === i + 1) {
        tokens.push({ type: 'ref', value: nameMatch[0], start: i });
        i += 1 + nameMatch[0].length;
        continue;
      }
      DIGITS_RE.lastIndex = i + 1;
      const idMatch = DIGITS_RE.exec(source);
      if (idMatch && idMatch.index === i + 1) {
        tokens.push({ type: 'ref', value: idMatch[0], start: i });
        i += 1 + idMatch[0].length;
        continue;
      }
      throw new ParseError('Expected a reference name or number after "$"', i);
    }

    // Currency symbols — emitted as single-char identifiers (units).
    if (CURRENCY_CHARS.includes(ch)) {
      tokens.push({ type: 'ident', value: ch, start: i });
      i++;
      continue;
    }

    // Identifiers (functions, constants and units).
    if (isIdentStart(ch)) {
      IDENT_RE.lastIndex = i;
      const m = IDENT_RE.exec(source)!;
      tokens.push({ type: 'ident', value: m[0], start: i });
      i += m[0].length;
      continue;
    }

    const single = SINGLE_CHAR[ch];
    if (single) {
      tokens.push({ type: single, value: ch, start: i });
      i++;
      continue;
    }

    throw new ParseError(`Unexpected character "${ch}"`, i);
  }

  tokens.push({ type: 'eof', value: '', start: source.length });
  return tokens;
}

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= '0' && ch <= '9';
}

const UNIT_SYMBOL_CHARS = '°µ';

function isIdentStart(ch: string): boolean {
  return (
    (ch >= 'a' && ch <= 'z') ||
    (ch >= 'A' && ch <= 'Z') ||
    ch === '_' ||
    UNIT_SYMBOL_CHARS.includes(ch)
  );
}
