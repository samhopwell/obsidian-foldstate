import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorState, TransactionSpec } from "@codemirror/state";
import { codeFolding, foldEffect, foldService, foldedRanges } from "@codemirror/language";
import type { App, PluginManifest } from "obsidian";
import { TFile } from "obsidian";
import CollapsiblePlugin from "../src/main";
import { buildFoldExtension, getFoldRangeMap, restoringFolds } from "../src/fold-extension";

function fixture(doc: string, diskContent = doc) {
  const file = new TFile("note.md");
  const cm = {
    state: EditorState.create({ doc, extensions: [codeFolding(), buildFoldExtension(),
      foldService.of((state, from, to) => {
        const line = state.doc.lineAt(from);
        return line.text.startsWith("#") && line.number < state.doc.lines
          ? { from: to, to: state.doc.line(line.number + 1).to } : null;
      }),
    ] }),
    dispatch: vi.fn((spec: TransactionSpec) => { cm.state = cm.state.update(spec).state; }),
  };
  const view = { file, editor: { cm } };
  const app = {
    workspace: { getActiveViewOfType: () => view },
    vault: { read: vi.fn(() => Promise.resolve(diskContent)) },
  };
  const plugin = new CollapsiblePlugin(app as unknown as App, {} as PluginManifest);
  return { plugin, file, cm, app };
}

afterEach(() => vi.unstubAllGlobals());

describe("fold restoration coordinates", () => {
  it("ignores a saved version whose heading is above the current editor heading", async () => {
    const saved = "Intro\n# Heading %% fold %%\nBody";
    const { plugin, cm, file } = fixture("New\n" + saved, saved);
    cm.state = cm.state.update({ effects: foldEffect.of({
      from: cm.state.doc.line(3).to, to: cm.state.doc.line(4).to,
    }), annotations: restoringFolds.of(true) }).state;
    await plugin["syncFoldStateFromFile"](file);
    expect(cm.dispatch).not.toHaveBeenCalled();
    expect([...getFoldRangeMap(cm.state).keys()]).toEqual([2]);
  });

  it("ignores a read that becomes stale while it is pending", async () => {
    const doc = "# Heading %% fold %%\nBody";
    const { plugin, cm, file } = fixture(doc);
    const pending = plugin["syncFoldStateFromFile"](file);
    cm.state = cm.state.update({ changes: { from: 0, insert: "New\n" } }).state;
    await pending;
    expect(cm.dispatch).not.toHaveBeenCalled();
    expect(cm.state.doc.toString()).toBe("New\n" + doc);
  });

  it("restores matching saved markers without editing text", async () => {
    const doc = "# Heading %% fold %%\nBody";
    const { plugin, cm, file } = fixture(doc);
    await plugin["syncFoldStateFromFile"](file);
    expect(foldedRanges(cm.state).size).toBe(1);
    expect(cm.state.doc.toString()).toBe(doc);
    expect(cm.dispatch.mock.calls[0][0].changes).toBeUndefined();
  });

  it("opens the current editor content rather than reading an older saved copy", async () => {
    vi.stubGlobal("window", globalThis);
    const doc = "New\n# Heading %% fold %%\nBody";
    const { plugin, cm, file, app } = fixture(doc, "# Heading %% fold %%\nBody");
    await plugin["applyFoldState"](file);
    expect(app.vault.read).not.toHaveBeenCalled();
    expect([...getFoldRangeMap(cm.state).keys()]).toEqual([1]);
    expect(cm.state.doc.toString()).toBe(doc);
  });
});
