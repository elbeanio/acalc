type KatexRender = (tex: string, options: object) => string;

// KaTeX (JS + fonts/CSS) is loaded on demand, then cached module-wide. It's
// kept out of the initial bundle but prewarmed on idle (see prewarmKatex), so
// the first typeset row renders instantly rather than triggering a load.
let render: KatexRender | null = null;
let loading: Promise<void> | null = null;

export function ensureKatex(): Promise<void> {
  if (render) return Promise.resolve();
  if (!loading) {
    loading = Promise.all([
      import('katex'),
      import('katex/dist/katex.min.css'),
    ]).then(([mod]) => {
      render = mod.default.renderToString;
    });
  }
  return loading;
}

/** The loaded renderer, or null until KaTeX has finished loading. */
export function getKatexRender(): KatexRender | null {
  return render;
}

/** Kick off the KaTeX load when the browser is idle. Safe to call repeatedly. */
export function prewarmKatex(): void {
  const idle = globalThis.requestIdleCallback;
  if (idle) idle(() => void ensureKatex());
  else globalThis.setTimeout(() => void ensureKatex(), 200);
}
