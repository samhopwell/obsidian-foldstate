// Minimal Obsidian API mock for unit tests

export class Plugin {
  app: any;
  manifest: any;

  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  registerEditorExtension(_ext: any) {}
  registerEvent(_evt: any) {}
}

export class TFile {
  path: string;
  extension: string;

  constructor(path: string) {
    this.path = path;
    this.extension = path.split(".").pop() ?? "";
  }
}

export class MarkdownView {
  editor: any;
}
