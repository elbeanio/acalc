import { describe, it, expect } from 'vitest';
import type { Stack } from '../state/index.ts';
import {
  buildExport,
  exportFilename,
  exportMimeType,
  type ExportFormat,
} from './export.ts';

const mkStack = (rows: Stack['rows']): Stack => ({
  id: 's',
  name: 'My Budget',
  nextRowId: 100,
  rows,
});

const stack = mkStack([
  { id: 1, source: '3 + 3' }, // 6
  { id: 2, name: 'total', source: '$1 * 2' }, // 12
  { id: 3, source: '   ' }, // blank → skipped
  { id: 4, source: 'min(4, 9)' }, // 4, has a comma (CSV escaping)
]);

const build = (format: ExportFormat, resolveRefs: boolean) =>
  buildExport(stack, { format, resolveRefs });

describe('buildExport', () => {
  it('plain text, resolving references (default)', () => {
    expect(build('text', true)).toBe(
      ['3 + 3 = 6', '6 * 2 = 12', 'min(4, 9) = 4'].join('\n'),
    );
  });

  it('plain text, keeping references literal', () => {
    expect(build('text', false)).toBe(
      ['3 + 3 = 6', '$1 * 2 = 12', 'min(4, 9) = 4'].join('\n'),
    );
  });

  it('CSV with a header and quoted fields where needed', () => {
    expect(build('csv', true)).toBe(
      ['Expression,Result', '3 + 3,6', '6 * 2,12', '"min(4, 9)",4'].join('\n'),
    );
  });

  it('Markdown table with a header and separator', () => {
    const md = build('markdown', false).split('\n');
    expect(md[0]).toMatch(/^\| Expression +\| Result +\|$/);
    expect(md[1]).toMatch(/^\| -+ \| -+ \|$/);
    expect(md.some((l) => l.includes('$1 * 2'))).toBe(true);
  });

  it('skips blank rows', () => {
    expect(build('text', true)).not.toContain('=  =');
    expect(build('text', true).split('\n')).toHaveLength(3);
  });
});

describe('resolve references', () => {
  it('parenthesises a negative substitution to keep precedence', () => {
    const s = mkStack([
      { id: 1, source: '-5' },
      { id: 2, source: '$1 + 1' }, // -4
    ]);
    expect(buildExport(s, { format: 'text', resolveRefs: true })).toBe(
      ['-5 = -5', '(-5) + 1 = -4'].join('\n'),
    );
  });

  it('leaves a dangling reference untouched and shows its error', () => {
    const s = mkStack([{ id: 1, source: '$99 + 1' }]);
    expect(buildExport(s, { format: 'text', resolveRefs: true })).toBe(
      '$99 + 1 = #ref!($99)',
    );
  });
});

describe('filenames and mime types', () => {
  it('slugifies the stack name and picks the extension', () => {
    expect(exportFilename('My Budget', 'markdown')).toBe('my-budget.md');
    expect(exportFilename('Q3 / 2026 forecast!', 'csv')).toBe('q3-2026-forecast.csv');
    expect(exportFilename('   ', 'text')).toBe('stack.txt');
  });

  it('maps formats to mime types', () => {
    expect(exportMimeType('markdown')).toBe('text/markdown');
    expect(exportMimeType('csv')).toBe('text/csv');
    expect(exportMimeType('text')).toBe('text/plain');
  });
});
