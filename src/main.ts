import { Plugin, TFile, MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { foldEffect, unfoldEffect, foldable, ensureSyntaxTree } from "@codemirror/language";
import { buildFoldExtension, getFoldRangeMap, restoringFolds, setsEqual } from "./fold-extension";
import { buildMarkerHideExtension } from "./hide-extension";
import { parseFoldedHeadings } from "./marker";

export default class CollapsiblePlugin extends Plugin {
  onload() {
    this.registerEditorExtension([
      buildFoldExtension(),
      buildMarkerHideExtension(),
    ]);

    // active-leaf-change fires after the view is mounted (unlike file-open),
    // which is important on mobile where editor initialisation is slower.
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (!leaf || !(leaf.view instanceof MarkdownView)) return;
        void this.applyFoldState(leaf.view.file);
      })
    );

    // Reconcile fold state whenever a file is saved or updated externally
    // (e.g. by a sync tool on another device).
    this.registerEvent(
      this.app.vault.on("modify", (abstractFile) => {
        if (!(abstractFile instanceof TFile)) return;
        void this.syncFoldStateFromFile(abstractFile);
      })
    );
  }

  private async syncFoldStateFromFile(file: TFile) {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.file?.path !== file.path) return;

    const cm = (view.editor as unknown as { cm: EditorView }).cm;
    if (!cm) return;

    const content = await this.app.vault.read(file);
    // A save notification may refer to an older version than the open editor.
    if (view.file?.path !== file.path || !EditorState.create({ doc: content }).doc.eq(cm.state.doc)) return;
    const markedLines = parseFoldedHeadings(content);
    const currentFoldMap = getFoldRangeMap(cm.state);
    const currentLines = new Set(currentFoldMap.keys());

    if (setsEqual(markedLines, currentLines)) return;

    const effects = [];

    for (const lineNum of markedLines) {
      if (!currentLines.has(lineNum)) {
        const line = cm.state.doc.line(lineNum + 1);
        const range = foldable(cm.state, line.from, line.to);
        if (range) effects.push(foldEffect.of(range));
      }
    }

    for (const [lineNum, range] of currentFoldMap) {
      if (!markedLines.has(lineNum)) {
        effects.push(unfoldEffect.of(range));
      }
    }

    if (effects.length) {
      cm.dispatch({ effects, annotations: restoringFolds.of(true) });
    }
  }

  private async applyFoldState(file: TFile | null) {
    if (!file || file.extension !== "md") return;

    // Defer one microtask so the CM6 editor finishes mounting.
    // On mobile, active-leaf-change can fire while the editor is still
    // being initialised, and dispatching effects too early is a no-op.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.file?.path !== file.path) return;

    const cm = (view.editor as unknown as { cm: EditorView }).cm;
    if (!cm) return;
    const foldedLines = parseFoldedHeadings(cm.state.doc.toString());
    if (foldedLines.size === 0) return;

    // Ensure the language syntax tree is available before calling foldable().
    // On mobile the tree is built lazily; without this, foldable() returns
    // null for every heading and no folds are applied.
    ensureSyntaxTree(cm.state, cm.state.doc.length, 500);

    const effects = [];
    for (const lineNum of foldedLines) {
      const line = cm.state.doc.line(lineNum + 1);
      const range = foldable(cm.state, line.from, line.to);
      if (range) effects.push(foldEffect.of(range));
    }

    if (effects.length) {
      cm.dispatch({ effects, annotations: restoringFolds.of(true) });
    }
  }
}
