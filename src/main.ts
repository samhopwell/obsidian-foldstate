import { Plugin, TFile, MarkdownView } from "obsidian";
import { EditorView } from "@codemirror/view";
import { foldEffect, unfoldEffect, foldable, ensureSyntaxTree } from "@codemirror/language";
import { buildFoldExtension, getFoldRangeMap, setsEqual } from "./fold-extension";
import { buildMarkerHideExtension } from "./hide-extension";
import { parseFoldedHeadings, updateFoldMarker } from "./marker";

export default class CollapsiblePlugin extends Plugin {
  private isSyncing = false;

  async onload() {
    this.registerEditorExtension([
      buildFoldExtension(this.handleFoldChange.bind(this)),
      buildMarkerHideExtension(),
    ]);

    // active-leaf-change fires after the view is mounted (unlike file-open),
    // which is important on mobile where editor initialisation is slower.
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if (!leaf || !(leaf.view instanceof MarkdownView)) return;
        this.applyFoldState(leaf.view.file);
      })
    );

    // Reconcile fold state whenever a file is saved or updated externally
    // (e.g. by a sync tool on another device).
    this.registerEvent(
      this.app.vault.on("modify", (abstractFile) => {
        if (!(abstractFile instanceof TFile)) return;
        this.syncFoldStateFromFile(abstractFile);
      })
    );
  }

  private async handleFoldChange(lineNum: number, folded: boolean) {
    if (this.isSyncing) return;
    const file = this.app.workspace.getActiveFile();
    if (!file) return;

    this.isSyncing = true;
    try {
      await this.app.vault.process(file, (content) =>
        updateFoldMarker(content, lineNum, folded)
      );
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncFoldStateFromFile(file: TFile) {
    // Skip our own writes to avoid reacting to markers we just placed.
    if (this.isSyncing) return;

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.file?.path !== file.path) return;

    const cm = (view.editor as unknown as { cm: EditorView }).cm;
    if (!cm) return;

    const content = await this.app.vault.read(file);
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
      this.isSyncing = true;
      cm.dispatch({ effects });
      this.isSyncing = false;
    }
  }

  private async applyFoldState(file: TFile | null) {
    if (!file || file.extension !== "md") return;

    const content = await this.app.vault.read(file);
    const foldedLines = parseFoldedHeadings(content);
    if (foldedLines.size === 0) return;

    // Defer one microtask so the CM6 editor finishes mounting.
    // On mobile, active-leaf-change can fire while the editor is still
    // being initialised, and dispatching effects too early is a no-op.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view || view.file?.path !== file.path) return;

    const cm = (view.editor as unknown as { cm: EditorView }).cm;
    if (!cm) return;

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
      this.isSyncing = true;
      cm.dispatch({ effects });
      this.isSyncing = false;
    }
  }
}
