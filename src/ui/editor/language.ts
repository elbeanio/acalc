import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { tags as t } from '@lezer/highlight';

/**
 * A lightweight StreamLanguage for the acalc expression grammar — enough for
 * syntax highlighting in the editor. The authoritative parser lives in
 * `src/lang`; this only classifies tokens for colour.
 */
const acalcLanguage = StreamLanguage.define<Record<string, never>>({
  name: 'acalc',
  token(stream) {
    if (stream.eatSpace()) return null;

    // Reference: $id or $name
    if (stream.match(/^\$(?:[A-Za-z_]\w*|\d+)/)) return 'ref';

    // Number (with optional decimal / exponent)
    if (stream.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/)) return 'num';

    // Identifier: function or constant
    if (stream.match(/^[A-Za-z_]\w*/)) {
      // Peek for a following '(' to distinguish calls from constants.
      return /^\s*\(/.test(stream.string.slice(stream.pos)) ? 'func' : 'const';
    }

    if (stream.match(/^[-+*/^%×÷−]/)) return 'op';

    stream.next();
    return null;
  },
  tokenTable: {
    ref: t.variableName,
    num: t.number,
    func: t.function(t.variableName),
    const: t.atom,
    op: t.operator,
  },
});

// Colours reference CSS variables so light/dark themes are handled in CSS.
const acalcHighlight = HighlightStyle.define([
  { tag: t.number, color: 'var(--syntax-number)' },
  { tag: t.variableName, color: 'var(--syntax-ref)' },
  { tag: t.function(t.variableName), color: 'var(--syntax-func)' },
  { tag: t.atom, color: 'var(--syntax-const)' },
  { tag: t.operator, color: 'var(--syntax-op)' },
]);

export function acalcLanguageSupport(): Extension {
  return [acalcLanguage, syntaxHighlighting(acalcHighlight)];
}
