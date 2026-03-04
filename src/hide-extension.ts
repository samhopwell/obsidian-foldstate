import {
  EditorView,
  ViewPlugin,
  ViewUpdate,
  Decoration,
  DecorationSet,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

const FOLD_MARKER_RE = /\s*%%\s*fold\s*%%\s*$/;

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const selection = view.state.selection;

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      const match = FOLD_MARKER_RE.exec(line.text);
      if (match) {
        // Reveal the raw marker when the cursor is on this line so the user
        // can see and edit it; hide it on every other line.
        const cursorOnLine = selection.ranges.some(
          (r) => r.from >= line.from && r.from <= line.to
        );
        if (!cursorOnLine) {
          const matchFrom = line.from + line.text.length - match[0].length;
          builder.add(matchFrom, line.to, Decoration.replace({}));
        }
      }
      pos = line.to + 1;
    }
  }

  return builder.finish();
}

export function buildMarkerHideExtension() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations }
  );
}
