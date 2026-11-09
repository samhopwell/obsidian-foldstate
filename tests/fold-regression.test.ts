import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { codeFolding, foldEffect, foldedRanges, unfoldEffect } from "@codemirror/language";
import { buildFoldExtension, getFoldRangeMap, restoringFolds } from "../src/fold-extension";

function editor(doc: string) {
  return EditorState.create({ doc, extensions: [codeFolding(), buildFoldExtension()] });
}

function range(state: EditorState, heading: number, end: number) {
  return { from: state.doc.line(heading).to, to: state.doc.line(end).to };
}

function onlyFold(state: EditorState) {
  const folds = [...getFoldRangeMap(state).values()];
  expect(folds).toHaveLength(1);
  return folds[0];
}

describe("fold marker transactions (real CodeMirror state)", () => {
  it("keeps the marker on a folded heading when lines are inserted or deleted above it", () => {
    const doc = "Intro\n# Heading %% fold %%\nBody\n# Next\nText";
    let state = editor(doc);
    state = state.update({ effects: foldEffect.of(range(state, 2, 3)),
      annotations: restoringFolds.of(true) }).state;
    state = state.update({ changes: { from: 0, insert: "New\n\n" } }).state;
    expect(state.doc.toString()).toBe("New\n\n" + doc);
    expect([...getFoldRangeMap(state).keys()]).toEqual([3]);
    state = state.update({ changes: { from: 0, to: 5 } }).state;
    expect(state.doc.toString()).toBe(doc);
    expect([...getFoldRangeMap(state).keys()]).toEqual([1]);
    state = state.update({ effects: unfoldEffect.of(onlyFold(state)) }).state;
    expect(state.doc.toString()).toBe(doc.replace(" %% fold %%", ""));
  });

  it("folds an unsaved heading at its current position and maps the fold past the marker", () => {
    let state = editor("Intro\n# Heading\nBody\n# Next\nText");
    state = state.update({ changes: { from: 0, insert: "Unsaved\n" } }).state;
    state = state.update({ effects: foldEffect.of(range(state, 3, 4)) }).state;
    expect(state.doc.toString()).toBe("Unsaved\nIntro\n# Heading %% fold %%\nBody\n# Next\nText");
    expect(onlyFold(state).from).toBe(state.doc.line(3).to);
    state = state.update({ effects: unfoldEffect.of(onlyFold(state)) }).state;
    expect(state.doc.line(3).text).toBe("# Heading");
    expect(foldedRanges(state).size).toBe(0);
  });

  it("uses the new document when insertion and folding share a transaction", () => {
    const state = editor("# Heading\nBody");
    const prefix = "New\n";
    const next = state.update({
      changes: { from: 0, insert: prefix },
      effects: foldEffect.of({ from: state.doc.line(1).to + prefix.length,
        to: state.doc.length + prefix.length }),
    }).state;
    expect(next.doc.toString()).toBe("New\n# Heading %% fold %%\nBody");
    expect(onlyFold(next).from).toBe(next.doc.line(2).to);
  });

  it("handles multiple heading folds in one transaction without dropping markers", () => {
    let state = editor("# First\nBody\n# Second\nText");
    state = state.update({ effects: [
      foldEffect.of(range(state, 3, 4)), foldEffect.of(range(state, 1, 2)),
    ] }).state;
    expect(state.doc.toString()).toBe("# First %% fold %%\nBody\n# Second %% fold %%\nText");
    const folds = [...getFoldRangeMap(state).values()];
    expect(folds).toHaveLength(2);
    state = state.update({ effects: folds.map(r => unfoldEffect.of(r)) }).state;
    expect(state.doc.toString()).toBe("# First\nBody\n# Second\nText");
    expect(foldedRanges(state).size).toBe(0);
  });

  it("preserves parent and child fold ranges when their markers are added", () => {
    let state = editor("# Parent\nIntro\n## Child\nBody");
    state = state.update({ effects: [
      foldEffect.of(range(state, 1, 4)), foldEffect.of(range(state, 3, 4)),
    ] }).state;
    expect(state.doc.toString()).toBe("# Parent %% fold %%\nIntro\n## Child %% fold %%\nBody");
    expect([...getFoldRangeMap(state).keys()]).toEqual([0, 2]);
    for (const [line, fold] of getFoldRangeMap(state)) {
      expect(fold.from).toBe(state.doc.line(line + 1).to);
    }
  });

  it("restores fold state without modifying the document", () => {
    const doc = "# Heading %% fold %%\nBody";
    const state = editor(doc);
    const tr = state.update({ effects: foldEffect.of(range(state, 1, 2)),
      annotations: restoringFolds.of(true) });
    expect(tr.docChanged).toBe(false);
    expect(tr.state.doc.toString()).toBe(doc);
    expect(foldedRanges(tr.state).size).toBe(1);
  });

  it("ignores folds on body text and code blocks", () => {
    const state = editor("```\nBody\n```\n# Heading\nText");
    const tr = state.update({ effects: foldEffect.of(range(state, 1, 3)) });
    expect(tr.docChanged).toBe(false);
    expect(foldedRanges(tr.state).size).toBe(1);
  });
});
