<p align="center">
  <img src="assets/logo.svg" width="76" height="76" alt="Forge Studio logo">
</p>

<h1 align="center">Webforge</h1>

<p align="center">
  <strong>Forge Studio</strong> is a dependency-free, browser-based IDE for small web projects.<br>
  Write HTML, CSS and JavaScript in a virtual file system, preview the result live, and export a runnable project.
</p>

<p align="center">
  <code>no build step</code> · <code>no install</code> · <code>MIT licensed</code>
</p>

---

## Features

- **Virtual project in the browser** — folders, tabs, text and binary assets, persisted locally in IndexedDB.
- **Code editor** — syntax highlighting for JS, CSS and markup, line numbers, current-line highlight, word wrap, tab indentation and a safe re-indent command.
- **Live preview** — side, bottom or pop-up modes with debounced auto-refresh. Relative URLs are rewritten to blob URLs so multi-file projects work without a server.
- **Find & replace** — search the active file or the whole project, with case, whole-word and regular-expression options.
- **Import** — drag files or ZIP archives onto the page, or use the toolbar to import files, a folder, or a ZIP. ZIP reading supports stored and DEFLATE entries.
- **Export** — download the project as a ZIP, a self-contained standalone HTML file, or the current file.
- **3D asset viewer** — inspect `.glb`, `.gltf`, `.obj` and `.stl` models with orbit controls.
- **Console bridge** — `console.*` calls and runtime errors from the preview are forwarded into the IDE console.
- **Themes** — Obsidian, Ember, Forest and Paper, with a settings panel for editor and preview preferences.

## Quick start

Forge Studio has no runtime dependencies and no build step.

```bash
git clone https://github.com/ardy03851-bit/Webforge.git
cd Webforge
bun run dev   # or: npm run dev
```

Open <http://localhost:8000>. The bundled server is a small Node script with no dependencies; any other static file server works too, and `index.html` can be opened directly. The 3D viewer fetches Three.js from jsDelivr, so it needs network access.

## Project structure

```text
.
├── assets/
│   └── logo.svg
├── css/
│   ├── base.css          # design tokens, themes, reset
│   ├── layout.css        # shell, explorer, editor, preview, console
│   ├── components.css    # modals, palette, search, menus, toasts
│   ├── viewer-3d.css     # Three.js viewport
│   └── responsive.css    # breakpoints and reduced motion
├── docs/
│   └── ARCHITECTURE.md
├── js/
│   ├── core.js           # helpers, icons, file types, settings, console
│   ├── project.js        # virtual file system, tree, tabs, editor surface
│   ├── editor.js         # highlighting, input, formatting
│   ├── preview.js        # preview builder and live preview
│   ├── files.js          # file operations, import/export, ZIP
│   ├── commands.js       # menus, find & replace, command palette
│   ├── settings.js       # settings UI and IndexedDB persistence
│   ├── viewer3d.js       # GLB / glTF / OBJ / STL viewer
│   └── main.js           # starter project, shortcuts, boot
├── scripts/
│   └── serve.mjs         # dependency-free static dev server
├── index.html
├── package.json
├── LICENSE
└── README.md
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the runtime model and script load order.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + K` or `Ctrl/Cmd + P` | Command palette |
| `Ctrl/Cmd + S` | Save project |
| `Ctrl/Cmd + Enter` | Refresh preview |
| `Ctrl/Cmd + F` | Find & replace |
| `Ctrl/Cmd + Shift + F` | Format / re-indent |
| `Ctrl/Cmd + Shift + W` | Toggle word wrap |
| `Tab` / `Shift + Tab` | Indent / outdent |

## Browser support

Forge Studio targets current versions of Chrome, Edge, Firefox and Safari. It relies on IndexedDB, `DecompressionStream` for compressed ZIP entries, and WebGL for the 3D viewer. Files are stored in the browser only; nothing is uploaded to a server.

## Contributing

1. Keep the project dependency-free and build-free.
2. Add new scripts to `index.html` in dependency order, before `js/main.js`.
3. Update `docs/ARCHITECTURE.md` when the load order or data flow changes.
4. Match the compact style of the surrounding source.

## License

Released under the [MIT License](LICENSE).
