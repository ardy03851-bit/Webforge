# Architecture

Forge Studio is deliberately **build-free and dependency-free**. `index.html` is a static document; the browser loads the stylesheets and classic scripts directly. There is no bundler, package manager, or transpilation step.

## Why classic scripts?

The application uses ordinary `<script src="…">` files rather than ES modules for two reasons:

1. **`file://` compatibility** — module scripts are blocked by CORS when opened from disk, while classic scripts are not.
2. **Zero tooling** — no server or build is required to run or edit the app.

The trade-off is that all scripts share one global lexical scope. Each top-level declaration is created once, and later scripts can use functions and state declared by earlier ones. Keep the load order below intact.

## Script load order

| Order | File | Responsibility |
| --- | --- | --- |
| 1 | `js/core.js` | DOM helpers, SVG icons, file-type metadata, settings, toast and console plumbing. |
| 2 | `js/project.js` | Virtual file system (`nodes`, `openTabs`, `activePath`), explorer tree, tabs, editor surface. |
| 3 | `js/editor.js` | Syntax highlighting, editor appearance, typing behaviour, cursor state, formatting. |
| 4 | `js/preview.js` | Preview bundler, relative URL rewriting, live preview and pop-out windows. |
| 5 | `js/files.js` | File operations, import (files/folders/ZIP), export (ZIP/standalone/single file). |
| 6 | `js/commands.js` | Toolbar menus, find & replace, command palette. |
| 7 | `js/settings.js` | Settings modal bindings and IndexedDB persistence. |
| 8 | `js/viewer3d.js` | Three.js viewer for GLB, glTF, OBJ and STL assets. |
| 9 | `js/main.js` | Starter project, keyboard shortcuts, global error reporting, boot sequence. |

`js/main.js` must remain last because its boot function starts the application.

## Stylesheet order

`css/base.css` → `css/layout.css` → `css/components.css` → `css/viewer-3d.css` → `css/responsive.css`.

The responsive layer is loaded last so media-query overrides win over the base layout. Design tokens live on `:root`, with theme overrides on `[data-theme="…"]`.

## State

There is no framework or store. The live project is an in-memory `Map` of paths to nodes:

```js
{ type: "file" | "folder", name, path, content?, data?, binary? }
```

Shared UI state is held in top-level bindings in `js/project.js` and `js/core.js` (`nodes`, `expanded`, `openTabs`, `selectedPath`, `activePath`, `entryPath`, `isTemplate`, `settings`). Because the scripts share a global lexical scope, modules can read and reassign those bindings directly.

Persistence is split in two:

- **Project data** — IndexedDB database `forge-studio`, object store `kv`, key `project`.
- **Preferences** — `localStorage` key `forge.settings`.

## Preview pipeline

1. `resolveEntry()` picks the configured entry file, falling back to `index.html`, then any HTML file, then the first file.
2. `Build` walks the project and rewrites relative `src`, `href`, `@import`, `url()`, `import` and `fetch` references.
3. Inline `<style>` and `<script>` blocks are rewritten recursively.
4. Assets are emitted as blob URLs (live preview) or data URLs (standalone export).
5. A small runtime is injected into the preview document. It forwards `console.*`, `error` and `unhandledrejection` events back to the IDE through `postMessage`.

## 3D viewer

Three.js and its loaders are loaded from jsDelivr. Models are resolved through a custom `LoadingManager` that maps project paths to blob URLs, so external textures and `.bin` sidecars work. The viewer disposes geometry, materials, textures, and renderer resources when switching files.

## Adding a module

1. Create the file in `js/`.
2. Add its `<script>` tag to `index.html` before `js/main.js` and after its dependencies.
3. Document the new entry in the load-order table above.
4. Keep new CSS in the appropriate layer rather than adding another stylesheet.
