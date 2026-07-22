import { useEffect, useRef } from 'react';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  completionStatus,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete';
import { defaultKeymap } from '@codemirror/commands';
import { Annotation, EditorState } from '@codemirror/state';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { acalcLanguageSupport } from './language.ts';

/** A row that can be referenced, offered in the `$` autocomplete. */
export interface ReferenceOption {
  /** The text to insert, e.g. `$3` or `$total`. */
  readonly ref: string;
  /** Short detail shown beside the option, e.g. `= 42`. */
  readonly detail?: string;
}

/** Imperative handle so the parent can focus a specific row's editor. */
export interface EditorHandle {
  /** Focus the editor, optionally moving the cursor to the end of the text. */
  focus(cursorToEnd?: boolean): void;
}

export interface ExpressionEditorProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  /** Return true if the key was handled (e.g. focus moved to another row). */
  onArrowUp?: () => boolean;
  onArrowDown?: () => boolean;
  getCompletions: () => ReferenceOption[];
  registerHandle?: (handle: EditorHandle | null) => void;
  ariaLabel?: string;
}

/** Marks transactions that sync external value changes (to avoid echo). */
const External = Annotation.define<boolean>();

export function ExpressionEditor(props: ExpressionEditorProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Keep the latest callbacks/props in a ref so the editor is created once.
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const completionSource = (
      context: CompletionContext,
    ): CompletionResult | null => {
      const token = context.matchBefore(/\$[\w]*/);
      if (!token || (token.from === token.to && !context.explicit)) return null;
      const options = propsRef.current.getCompletions();
      if (options.length === 0) return null;
      return {
        from: token.from,
        options: options.map((o) => ({
          label: o.ref,
          detail: o.detail ?? '',
          type: 'variable',
        })),
        validFor: /^\$[\w]*$/,
      };
    };

    const isCompletionOpen = (view: EditorView) =>
      completionStatus(view.state) === 'active';

    const appKeymap = keymap.of([
      {
        key: 'Enter',
        run: (view) => {
          if (isCompletionOpen(view)) return false; // let autocomplete accept
          propsRef.current.onEnter?.();
          return true;
        },
      },
      {
        key: 'ArrowUp',
        run: (view) => {
          if (isCompletionOpen(view)) return false;
          return propsRef.current.onArrowUp?.() ?? false;
        },
      },
      {
        key: 'ArrowDown',
        run: (view) => {
          if (isCompletionOpen(view)) return false;
          return propsRef.current.onArrowDown?.() ?? false;
        },
      },
    ]);

    // Reject edits that would introduce a second line — this is single-line.
    const singleLine = EditorState.transactionFilter.of((tr) =>
      tr.newDoc.lines > 1 ? [] : tr,
    );

    const updateListener = EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      if (update.transactions.some((tr) => tr.annotation(External))) return;
      propsRef.current.onChange(update.state.doc.toString());
    });

    const view = new EditorView({
      parent: parentRef.current!,
      state: EditorState.create({
        doc: propsRef.current.value,
        extensions: [
          appKeymap,
          keymap.of([...closeBracketsKeymap, ...completionKeymap, ...defaultKeymap]),
          closeBrackets(),
          autocompletion({ override: [completionSource], activateOnTyping: true }),
          acalcLanguageSupport(),
          placeholder('expression…'),
          singleLine,
          updateListener,
          EditorView.contentAttributes.of({
            'aria-label': propsRef.current.ariaLabel ?? 'Expression',
          }),
          editorTheme,
        ],
      }),
    });

    viewRef.current = view;
    propsRef.current.registerHandle?.({
      focus: (cursorToEnd) => {
        if (cursorToEnd) {
          view.dispatch({ selection: { anchor: view.state.doc.length } });
        }
        view.focus();
      },
    });

    return () => {
      propsRef.current.registerHandle?.(null);
      view.destroy();
      viewRef.current = null;
    };
    // Created once; live values are read through propsRef.
  }, []);

  // Sync external value changes (undo, programmatic edits) into the editor.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== props.value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: props.value },
        annotations: External.of(true),
      });
    }
  }, [props.value]);

  return <div className="row-editor" ref={parentRef} />;
}

const editorTheme = EditorView.theme({
  '&': {
    fontFamily: 'var(--mono)',
    fontSize: '1rem',
  },
  '.cm-content': {
    padding: '0.5rem 0.6rem',
    caretColor: 'var(--fg)',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-line': {
    padding: '0',
  },
  '.cm-placeholder': {
    color: 'var(--muted)',
  },
  '.cm-tooltip.cm-tooltip-autocomplete': {
    border: '1px solid var(--border)',
    borderRadius: '6px',
    background: 'var(--bg)',
    fontFamily: 'var(--mono)',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': {
    background: 'var(--accent)',
    color: '#fff',
  },
});
