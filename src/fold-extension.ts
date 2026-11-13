import { foldEffect, foldedRanges, unfoldEffect } from "@codemirror/language";
import { Annotation, ChangeSpec, EditorState } from "@codemirror/state";
import { addFoldMarker, isHeadingLine, removeFoldMarker } from "./marker";

/** Restoring saved folds must not rewrite the document. */
export const restoringFolds = Annotation.define<boolean>();

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
 * Persist explicit fold/unfold actions in the same editor transaction.
 * Moving an existing fold during a text edit is not a fold action. Never
 * apply editor line numbers to a separately saved (possibly older) file.
 */
export function buildFoldExtension() {
  return EditorState.transactionFilter.of((tr) => {
    if (tr.annotation(restoringFolds)) return tr;

    const actions = new Map<number, boolean>();
    for (const effect of tr.effects) {
      if (effect.is(foldEffect) || effect.is(unfoldEffect)) {
        const line = tr.newDoc.lineAt(effect.value.from);
        if (isHeadingLine(line.text)) {
          actions.set(line.number, effect.is(foldEffect));
        }
      }
    }

    const changes: ChangeSpec[] = [];
    for (const [lineNum, folded] of actions) {
      const line = tr.newDoc.line(lineNum);
      const text = folded ? addFoldMarker(line.text) : removeFoldMarker(line.text);
      if (text === line.text) continue;
      // Only edit the suffix, preserving the heading and mapped fold ranges.
      changes.push({
        from: folded ? line.to : line.from + text.length,
        to: line.to,
        insert: folded ? text.slice(line.text.length) : "",
      });
    }

    // CodeMirror maps the selection and fold effects through these changes.
    return changes.length ? [tr, { changes, sequential: true }] : tr;
  });
}
