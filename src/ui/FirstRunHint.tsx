/**
 * A one-time primer shown while the active stack is still empty (nothing typed).
 * It teaches the core model — one complete expression per row, referenced with
 * `$n` — which newcomers otherwise miss, reading the rows as a token-per-line
 * calculator tape. It self-dismisses the moment any row has content, so there's
 * nothing to persist and nothing to clean up.
 */
export function FirstRunHint({
  onOpenHelp,
}: {
  onOpenHelp?: (() => void) | undefined;
}) {
  return (
    <aside className="first-run-hint">
      <p className="first-run-hint__lead">
        <strong>Each row is one complete expression.</strong> Type a calculation,
        press <kbd>Enter</kbd> for a new row, and reference an earlier result with{' '}
        <code>$n</code>:
      </p>
      <table className="first-run-hint__example" aria-hidden="true">
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
      <p className="first-run-hint__foot">
        New here?{' '}
        <button
          type="button"
          className="first-run-hint__link"
          onClick={() => onOpenHelp?.()}
        >
          Open the cheat sheet
        </button>{' '}
        for operators, functions, units and shortcuts.
      </p>
    </aside>
  );
}
