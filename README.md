# Foldstate

An Obsidian plugin that persists heading fold state across devices and sessions by embedding fold markers directly in your markdown files.

## The problem

Obsidian stores fold state in `localStorage`, which means it's lost when you switch devices, reinstall the app, or use any sync tool (iCloud, Git, Obsidian Sync, etc.). Every time you open a note on a new device, all your headings are expanded.

## How it works

When you fold a heading, the plugin appends `%% fold %%` to that line:

```markdown
## My Section %% fold %%

Content hidden when folded...

## Another Section

Content always visible...
```

`%% %%` is Obsidian's native comment syntax — the marker is **invisible in Reading view** and **syncs with your file** via any tool you already use.

When you open a note, the plugin reads the markers and restores the fold state automatically. No manual steps, no separate state files.

## Features

- Saves fold state on every fold/unfold — no manual save needed
- Restores state when you open a file
- Works with any sync tool (iCloud, Git, Dropbox, Obsidian Sync, etc.)
- Markers are hidden in Reading view
- No settings to configure

## Installation

### Manual installation

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/samhopwell/obsidian-foldstate/releases)
2. Create a folder at `<your vault>/.obsidian/plugins/obsidian-foldstate/`
3. Copy both files into that folder
4. Open Obsidian → **Settings → Community plugins** and enable **Foldstate**

## Requirements

- Obsidian 1.4.0 or later
- Live Preview or Source mode (fold state is not tracked in Reading view)

## The marker format

The marker `%% fold %%` is appended to heading lines:

| Mode | Appearance |
|---|---|
| Source / Live Preview | `## My Heading %% fold %%` |
| Reading view | `My Heading` (marker hidden) |

The marker only appears on headings that are currently folded. Unfolding a heading removes it automatically.

## Development

```bash
# Install dependencies
npm install

# Build in watch mode
npm run dev

# Production build
npm run build

# Run tests
npm test
```

To test locally, copy `main.js` and `manifest.json` to `.obsidian/plugins/obsidian-foldstate/` in a test vault and enable the plugin.

## Contributing

Bug reports and pull requests welcome at [github.com/samhopwell/obsidian-foldstate](https://github.com/samhopwell/obsidian-foldstate).
