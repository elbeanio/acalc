import { useEffect, useMemo, useRef, useState } from 'react';
import type { Stack } from '../state/index.ts';
import {
  buildExport,
  exportFilename,
  exportMimeType,
  type ExportFormat,
} from './export.ts';

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'csv', label: 'CSV' },
  { value: 'text', label: 'Plain text' },
];

export function ExportDialog({
  stack,
  open,
  onClose,
}: {
  stack: Stack;
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [resolveRefs, setResolveRefs] = useState(true);

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

  const content = useMemo(
    () => buildExport(stack, { format, resolveRefs }),
    [stack, format, resolveRefs],
  );

  const download = () => {
    const blob = new Blob([content], {
      type: `${exportMimeType(format)};charset=utf-8`,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFilename(stack.name, format);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <dialog
      ref={ref}
      className="export-dialog"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
    >
      <div className="export-inner">
        <div className="help-header">
          <h2>Export “{stack.name}”</h2>
          <button
            className="help-close"
            onClick={onClose}
            aria-label="Close export"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="export-controls">
          <div className="export-formats" role="radiogroup" aria-label="Format">
            {FORMATS.map((f) => (
              <label key={f.value} className="export-format">
                <input
                  type="radio"
                  name="export-format"
                  checked={format === f.value}
                  onChange={() => setFormat(f.value)}
                />
                {f.label}
              </label>
            ))}
          </div>
          <label className="export-resolve">
            <input
              type="checkbox"
              checked={resolveRefs}
              onChange={(e) => setResolveRefs(e.target.checked)}
            />
            Resolve <code>$n</code> references
          </label>
        </div>

        <textarea
          className="export-preview"
          readOnly
          value={content}
          aria-label="Export preview"
          rows={10}
        />

        <div className="export-actions">
          <button className="export-download" onClick={download}>
            Download {exportFilename(stack.name, format)}
          </button>
        </div>
      </div>
    </dialog>
  );
}
