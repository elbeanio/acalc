import { EvalError, evaluate } from '../eval/index.ts';
import { parse, type ParseError } from '../lang/index.ts';
import type { Node, RefTarget } from '../lang/index.ts';
import { extractRanges, extractRefTargets } from './dependencies.ts';
import type { Row, RowError, RowResult } from './types.ts';

interface Analysis {
  readonly ast: Node | null;
  readonly parseError: RowError | null;
  /** Resolved dependency ids (rows that exist), deduped; may include self. */
  readonly deps: number[];
  /** Display strings of references that could not be resolved, e.g. `$2`. */
  readonly danglingRefs: string[];
  readonly empty: boolean;
}

/**
 * Compute results for every row in a stack.
 *
 * Rows form a dependency graph via `$id` / `$name` references. Rows are
 * evaluated in topological order so a change to an early row ripples through
 * everything that depends on it. Cycles, dangling references, parse/eval errors
 * and downstream "blocked" rows are all reported per-row rather than throwing.
 */
export function computeStack(
  rows: readonly Row[],
  nowMs: number = Date.now(),
): Map<number, RowResult> {
  const results = new Map<number, RowResult>();
  const existingIds = new Set(rows.map((r) => r.id));

  // Names map to ids for `$name` references. State layer enforces uniqueness;
  // if duplicated here, last definition wins.
  const nameToId = new Map<string, number>();
  for (const r of rows) {
    if (r.name) nameToId.set(r.name, r.id);
  }

  const resolveId = (target: RefTarget): number | undefined =>
    target.kind === 'id'
      ? existingIds.has(target.id)
        ? target.id
        : undefined
      : nameToId.get(target.name);

  // --- parse + dependency analysis ----------------------------------------
  const analyses = new Map<number, Analysis>();
  for (const r of rows) {
    if (r.source.trim() === '') {
      analyses.set(r.id, {
        ast: null,
        parseError: null,
        deps: [],
        danglingRefs: [],
        empty: true,
      });
      continue;
    }

    let ast: Node;
    try {
      ast = parse(r.source);
    } catch (err) {
      const pe = err as ParseError;
      analyses.set(r.id, {
        ast: null,
        parseError: { kind: 'parse', message: pe.message, position: pe.position },
        deps: [],
        danglingRefs: [],
        empty: false,
      });
      continue;
    }

    const deps = new Set<number>();
    const dangling = new Set<string>();
    for (const target of extractRefTargets(ast)) {
      const id = resolveId(target);
      if (id === undefined) {
        dangling.add(target.kind === 'id' ? `$${target.id}` : `$${target.name}`);
      } else {
        deps.add(id);
      }
    }
    // A range depends on every existing row it spans; gaps are skipped silently
    // (a missing id in a range is not a dangling reference).
    for (const { from, to } of extractRanges(ast)) {
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      for (const id of existingIds) if (id >= lo && id <= hi) deps.add(id);
    }
    analyses.set(r.id, {
      ast,
      parseError: null,
      deps: [...deps],
      danglingRefs: [...dangling],
      empty: false,
    });
  }

  // --- topological order (Kahn) -------------------------------------------
  const remaining = new Map<number, number>();
  const dependents = new Map<number, number[]>();
  for (const r of rows) dependents.set(r.id, []);
  for (const r of rows) {
    const a = analyses.get(r.id)!;
    remaining.set(r.id, a.deps.length);
    for (const dep of a.deps) dependents.get(dep)!.push(r.id);
  }

  const queue = rows.filter((r) => remaining.get(r.id) === 0).map((r) => r.id);
  const order: number[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const dependent of dependents.get(id)!) {
      const next = remaining.get(dependent)! - 1;
      remaining.set(dependent, next);
      if (next === 0) queue.push(dependent);
    }
  }
  const ordered = new Set(order);

  // --- evaluate in dependency order ---------------------------------------
  for (const id of order) {
    const a = analyses.get(id)!;
    if (a.empty) {
      results.set(id, { status: 'empty' });
      continue;
    }
    if (a.parseError) {
      results.set(id, { status: 'error', error: a.parseError });
      continue;
    }
    if (a.danglingRefs.length > 0) {
      const list = a.danglingRefs.join(', ');
      results.set(id, {
        status: 'error',
        error: {
          kind: 'ref',
          message: `Unknown reference ${list}`,
          refs: a.danglingRefs,
        },
      });
      continue;
    }
    if (a.deps.some((d) => results.get(d)?.status !== 'ok')) {
      results.set(id, {
        status: 'error',
        error: { kind: 'blocked', message: 'Depends on a row with an error' },
      });
      continue;
    }

    try {
      const value = evaluate(
        a.ast!,
        (target) => {
          const depId = resolveId(target)!;
          const dep = results.get(depId);
          if (dep?.status !== 'ok') {
            throw new EvalError('#ref!', 'ref');
          }
          return dep.value;
        },
        (from, to) => {
          // Expand to the existing rows the range spans, in row order.
          const lo = Math.min(from, to);
          const hi = Math.max(from, to);
          return rows
            .filter((r) => r.id >= lo && r.id <= hi)
            .map((r) => {
              const dep = results.get(r.id);
              if (dep?.status !== 'ok') throw new EvalError('#ref!', 'ref');
              return dep.value;
            });
        },
        nowMs,
      );
      results.set(id, { status: 'ok', value });
    } catch (err) {
      const ee = err as EvalError;
      results.set(id, {
        status: 'error',
        error: {
          kind: ee.kind === 'ref' ? 'ref' : 'eval',
          message: ee.message,
        },
      });
    }
  }

  // --- whatever Kahn could not order is in, or downstream of, a cycle ------
  for (const r of rows) {
    if (ordered.has(r.id)) continue;
    results.set(r.id, {
      status: 'error',
      error: inCycle(r.id, analyses)
        ? { kind: 'cycle', message: 'Circular reference' }
        : { kind: 'blocked', message: 'Depends on a circular reference' },
    });
  }

  return results;
}

/** True if `start` can reach itself by following dependency edges. */
function inCycle(start: number, analyses: Map<number, Analysis>): boolean {
  const seen = new Set<number>();
  const stack = [...(analyses.get(start)?.deps ?? [])];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (id === start) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(analyses.get(id)?.deps ?? []));
  }
  return false;
}
