// Keyboard bindings are cross-platform (CodeMirror's Mod = ⌘/Ctrl, Alt = ⌥/Alt);
// only the labels differ. Detect the platform once and format combos to match.

function detectMac(): boolean {
  if (typeof navigator === 'undefined') return true;
  const platform = navigator.platform || '';
  if (platform) return /Mac|iPhone|iPad|iPod/.test(platform);
  return /Mac/i.test(navigator.userAgent);
}

const isMac = detectMac();

const KEYS = isMac
  ? { mod: '⌘', alt: '⌥', shift: '⇧', backspace: '⌫' }
  : { mod: 'Ctrl', alt: 'Alt', shift: 'Shift', backspace: 'Backspace' };

/** Join modifier parts: run together on macOS (⌘⇧Z), `+`-joined elsewhere. */
function combo(...parts: string[]): string {
  return parts.join(isMac ? '' : '+');
}

export const SHORTCUTS = {
  moveUp: combo(KEYS.alt, '↑'),
  moveDown: combo(KEYS.alt, '↓'),
  deleteRow: combo(KEYS.mod, KEYS.shift, KEYS.backspace),
  undo: combo(KEYS.mod, 'Z'),
  redo: combo(KEYS.mod, KEYS.shift, 'Z'),
};
