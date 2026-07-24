import { computeStack, type RowResult } from '../engine/index.ts';
import { tokenize } from '../lang/index.ts';
import type { Row, Stack } from '../state/index.ts';
import { formatResult } from './format.ts';

export type ExportFormat = 'markdown' | 'csv' | 'text';

export interface ExportOptions {
  readonly format: ExportFormat;
  /** Substitute referenced values into expressions (`$1 * 2` → `6 * 2`). */
  readonly resolveRefs: boolean;
}

interface ExportRow {
  readonly expression: string;
  readonly result: string;
}

/** Build the export text for a stack in the chosen format. */
export function buildExport(stack: Stack, options: ExportOptions): string {
  const results = computeStack(stack.rows);
  const rows: ExportRow[] = [];
  for (const row of stack.rows) {
    if (row.source.trim() === '') continue; // skip blank rows
    const res = results.get(row.id);
    const expression = options.resolveRefs
      ? resolveRefs(row.source, stack.rows, results)
      : row.source.trim();
    rows.push({ expression, result: formatResult(res).text });
  }
  switch (options.format) {
    case 'markdown':
      return toMarkdown(rows);
    case 'csv':
      return toCsv(rows);
    case 'text':
      return toText(rows);
  }
}

/** Suggested download filename, e.g. `my-budget.md`. */
export function exportFilename(stackName: string, format: ExportFormat): string {
  const slug =
    stackName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'stack';
  const ext = format === 'markdown' ? 'md' : format === 'csv' ? 'csv' : 'txt';
  return `${slug}.${ext}`;
}

/** MIME type for the download blob. */
export function exportMimeType(format: ExportFormat): string {
  if (format === 'csv') return 'text/csv';
  if (format === 'markdown') return 'text/markdown';
  return 'text/plain';
}

// --- reference resolution ---------------------------------------------------

/**
 * Replace `$n` / `$name` tokens in a source string with the referenced row's
 * displayed value. Dangling or not-yet-computed refs are left as-is. Negative
 * values are parenthesised so precedence is preserved (`2 - $1` → `2 - (-3)`).
 */
function resolveRefs(
  source: string,
  rows: readonly Row[],
  results: Map<number, RowResult>,
): string {
  let tokens;
  try {
    tokens = tokenize(source);
  } catch {
    return source.trim(); // unlexable (e.g. a parse-error row) — leave it alone
  }
  // Splice right-to-left so earlier token offsets stay valid.
  const refs = tokens.filter((t) => t.type === 'ref').reverse();
  let out = source;
  for (const tok of refs) {
    const value = resolveRefValue(tok.value, rows, results);
    if (value === null) continue;
    const start = tok.start;
    const end = start + 1 + tok.value.length; // the `$` plus the body
    const replacement = /^-/.test(value) ? `(${value})` : value;
    out = out.slice(0, start) + replacement + out.slice(end);
  }
  return out.trim();
}

/** The displayed value of the row a ref points at, or null if unresolvable. */
function resolveRefValue(
  body: string,
  rows: readonly Row[],
  results: Map<number, RowResult>,
): string | null {
  const row = /^\d+$/.test(body)
    ? rows.find((r) => r.id === Number(body))
    : rows.find((r) => r.name === body);
  if (!row) return null;
  const res = results.get(row.id);
  return res?.status === 'ok' ? res.value.toDisplay() : null;
}

// --- formatters -------------------------------------------------------------

function toText(rows: ExportRow[]): string {
  return rows.map((r) => `${r.expression} = ${r.result}`).join('\n');
}

function toCsv(rows: ExportRow[]): string {
  const esc = (s: string) =>
    /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  return ['Expression,Result', ...rows.map((r) => `${esc(r.expression)},${esc(r.result)}`)].join('\n');
}

function toMarkdown(rows: ExportRow[]): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  const exprs = rows.map((r) => esc(r.expression));
  const vals = rows.map((r) => esc(r.result));
  const wExpr = Math.max('Expression'.length, ...exprs.map((s) => s.length));
  const wVal = Math.max('Result'.length, ...vals.map((s) => s.length));
  const pad = (s: string, w: number) => s.padEnd(w);
  const line = (a: string, b: string) => `| ${pad(a, wExpr)} | ${pad(b, wVal)} |`;
  return [
    line('Expression', 'Result'),
    `| ${'-'.repeat(wExpr)} | ${'-'.repeat(wVal)} |`,
    ...rows.map((_, i) => line(exprs[i]!, vals[i]!)),
  ].join('\n');
}
