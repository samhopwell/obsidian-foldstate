import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { foldedRanges } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { isHeadingLine } from "./marker";

type RangeCursor = { value: unknown; from: number; to: number; next(): void };
type RangeSet = { iter(): RangeCursor } | null;
type Line = { number: number; text: string };

/**
 * Pure function: maps a foldedRanges RangeSet + lineAt lookup to 0-indexed
 * line numbers. Extracted for testability without module mocking.
 * Non-heading folds (frontmatter, code blocks, lists) are ignored — we only
 * persist heading folds.
 */
export function iterFoldedRanges(
  rangeSet: RangeSet,
  lineAt: (pos: number) => Line
): Set<number> {
  const lines = new Set<number>();
  if (!rangeSet) return lines;
  const cursor = rangeSet.iter();
  while (cursor.value !== null) {
    const line = lineAt(cursor.from);
    if (isHeadingLine(line.text)) lines.add(line.number - 1); // 0-indexed
    cursor.next();
  }
  return lines;
}

export function getFoldedLines(state: EditorState): Set<number> {
  return iterFoldedRanges(foldedRanges(state), (pos) => state.doc.lineAt(pos));
}

/**
 * Returns a Map of 0-indexed line number → {from, to} for every currently
 * folded range. The {from, to} values are needed to dispatch unfoldEffect.
 */
export function getFoldRangeMap(
  state: EditorState
): Map<number, { from: number; to: number }> {
  const map = new Map<number, { from: number; to: number }>();
  const ranges = foldedRanges(state);
  if (!ranges) return map;
  const cursor = ranges.iter();
  while (cursor.value !== null) {
    const line = state.doc.lineAt(cursor.from);
    // Leave non-heading folds alone — otherwise sync unfolds them.
    if (isHeadingLine(line.text)) {
      map.set(line.number - 1, { from: cursor.from, to: cursor.to });
    }
    cursor.next();
  }
  return map;
}

export function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

/**
 * Builds a CodeMirror ViewPlugin that calls `onFoldChange` whenever a
 * heading is folded or unfolded.
 *
 * @param onFoldChange - callback(lineNum: 0-indexed, folded: boolean)
 */
export function buildFoldExtension(
  onFoldChange: (lineNum: number, folded: boolean) => void
) {
  return ViewPlugin.fromClass(
    class {
      private prevFolds = new Set<number>();

      update(update: ViewUpdate) {
        const current = getFoldedLines(update.state);
        if (!setsEqual(current, this.prevFolds)) {
          const added = [...current].filter((l) => !this.prevFolds.has(l));
          const removed = [...this.prevFolds].filter((l) => !current.has(l));
          added.forEach((l) => onFoldChange(l, true));
          removed.forEach((l) => onFoldChange(l, false));
          this.prevFolds = current;
        }
      }
    }
  );
}
