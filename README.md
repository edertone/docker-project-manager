# Docker Project Manager

A desktop application built with **Electron** and **Angular 22** that reads a JSON file from disk and displays it as plain text. The project is scaffolded with modern Angular practices — standalone components, signals, zoneless change detection, lazy-loaded routes, and a clean folder structure ready to grow over time.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Running the app](#running-the-app)
  - [Web-only mode](#web-only-mode)
  - [Electron desktop mode (recommended)](#electron-desktop-mode-recommended)
- [Development workflow](#development-workflow)
- [Building for production](#building-for-production)
- [Publishing installers](#publishing-installers)
- [Scripts reference](#scripts-reference)
- [Architecture notes](#architecture-notes)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- 📂 Opens any `.json` file via the native OS dialog.
- 🧾 Displays the file content as **plain text** (pretty-printed with 2-space indentation).
- ⚡ Built with Angular **signals** and **zoneless** change detection.
- 🖥️ Runs inside Electron with a secure `contextBridge` preload (no Node in the renderer).
- 🎨 Light/dark theme via `prefers-color-scheme`.
- 🧩 Standard Angular folder layout (`core`, `features`, `shared`, `environments`) ready to scale.

## Tech stack

| Layer       | Technology                                   |
| ----------- | -------------------------------------------- |
| Shell       | Electron 33 (production-ready stable line)   |
| UI          | Angular 22 (standalone, signals, zoneless)   |
| Language    | TypeScript 5.6                               |
| Build (web) | `@angular/build:application` (esbuild-based) |
| Build (app) | `electron-builder`                           |
| Dev tooling | Concurrently, wait-on, cross-env, Prettier   |

## Prerequisites

- **Node.js** ≥ 22.22.3 LTS (Angular 22 requires Node 22, 24, or 26) — <https://nodejs.org>
- **npm** ≥ 10 (ships with Node 22)
- For publishing macOS/Windows installers from non-native OSes, see the [electron-builder docs](https://www.electron.build).

Verify your environment:

```bash
node --version   # v22.22.3 or newer
npm --version    # 10.x or newer
```

## Project structure

```
docker-project-manager/
├── electron/                     # Electron main process (Node context)
│   ├── main.ts                   # BrowserWindow, IPC handlers, app menu
│   ├── preload.ts                # contextBridge — exposes window.electronAPI
│   └── tsconfig.json             # Separate CJS tsconfig for the main process
├── src/
│   ├── app/
│   │   ├── core/                 # Singletons: services, models, providers
│   │   │   └── electron/         # Electron bridge (service + types + provider)
│   │   ├── features/             # Feature areas (one folder per feature)
│   │   │   └── json-viewer/      # The "read & show JSON" feature
│   │   │       ├── json-viewer.component.ts
│   │   │       ├── json-viewer.component.html
│   │   │       ├── json-viewer.component.scss
│   │   │       └── json-viewer.model.ts
│   │   ├── shared/               # (Reserved) reusable pipes, directives, utils
│   │   ├── app.component.ts      # Root shell component
│   │   ├── app.config.ts         # bootstrapApplication providers
│   │   └── app.routes.ts         # Top-level lazy routes
│   ├── environments/             # environment.ts / environment.development.ts
│   ├── index.html
│   ├── main.ts                   # Angular bootstrap entry
│   └── styles.scss               # Global styles + CSS variables
├── public/                       # Static assets copied as-is (sample.json)
├── .vscode/                      # Recommended extensions + editor settings
├── angular.json                  # Angular CLI workspace config
├── electron-builder.json         # Packaging & publish config
├── package.json
├── tsconfig.json                 # Base TS config (shared by app/spec/electron)
├── tsconfig.app.json             # App compilation
├── tsconfig.spec.json            # Test compilation
└── README.md
```

> The `core / features / shared` split is the recommended Angular layout for apps that will grow over time. Add new screens under `src/app/features/<name>/` and register them as lazy routes in `app.routes.ts`.

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Run the desktop app in dev mode (Angular + Electron together)
npm run dev
```

The first run compiles the Electron main process to `dist-electron/`, starts the Angular dev server on <http://localhost:4200>, and launches Electron once the dev server is ready.

## Running the app

Electron desktop mode

```bash
npm run dev
```

- Angular dev server runs with live reload on port `4200`.
- Electron loads `http://localhost:4200` and opens DevTools detached.
- The Electron main process is recompiled automatically when `electron/**/*.ts` changes (via `npm run watch:electron`).

To run a production build of the app inside Electron (no dev server):

```bash
npm run start:electron
```

## Development workflow

| Task                           | Command                  |
| ------------------------------ | ------------------------ |
| Start dev (Angular + Electron) | `npm run dev`            |
| Angular dev server only        | `npm start`              |
| Watch-compile Electron main    | `npm run watch:electron` |
| Run unit tests                 | `npm test`               |
| Format the codebase            | `npm run format`         |
| Lint                           | `npm run lint`           |

### Adding a new feature

1. Create a folder under `src/app/features/<feature-name>/`.
2. Generate a standalone component (OnPush + signals):
   ```bash
   npx ng generate component features/<feature-name> --standalone --change-detection=OnPush
   ```
3. Register a lazy route in `src/app/app.routes.ts`:
   ```ts
   {
     path: '<feature-name>',
     loadComponent: () =>
       import('./features/<feature-name>/<feature-name>.component').then(
         (m) => m.<FeatureName>Component,
       ),
   }
   ```
4. Put shared utilities in `src/app/shared/` and singletons in `src/app/core/`.

### Signals & zoneless

- The app uses `provideExperimentalZonelessChangeDetection()` in `app.config.ts`. Prefer signals (`signal`, `computed`, `effect`) over `BehaviorSubject` for component state.
- `JsonViewerComponent` is a reference implementation: state is held in private writable signals and exposed as read-only views.

## Building for production

```bash
# 1. Build the Angular app (production) and the Electron main process
npm run build:prod
npm run build:electron

# 2. Package installers for the current OS
npm run electron:build
```

Outputs land in `release/` (e.g. `release/Docker Project Manager-0.1.0.exe` on Windows).

Platform-specific shortcuts:

```bash
npm run electron:build:win     # Windows NSIS installer
npm run electron:build:mac     # macOS dmg + zip
npm run electron:build:linux   # Linux AppImage + deb
```

## Publishing installers

Publishing is configured for **GitHub Releases** in `electron-builder.json`:

```json
"publish": {
  "provider": "github",
  "owner": "your-org",
  "repo": "docker-project-manager"
}
```

Steps:

1. Update `version` in `package.json` (semver).
2. Create a git tag: `git tag v0.1.0 && git push origin v0.1.0`.
3. Set the `GH_TOKEN` environment variable with a GitHub personal access token that has `repo` scope.
4. Publish:

   ```bash
   # macOS / Linux
   export GH_TOKEN="ghp_xxx"
   # Windows (PowerShell)
   $env:GH_TOKEN="ghp_xxx"

   npm run publish
   ```

`electron-builder` will build, upload the artifacts to the GitHub release matching the tag, and produce auto-update `latest.yml`/`latest-mac.yml`/`latest-linux.yml` manifests.

> To switch to a different provider (S3, generic HTTP, Snap Store, etc.), update the `publish` block in `electron-builder.json` — see <https://www.electron.build/configuration/publish>.

## Scripts reference

| Script                | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `ng`                  | Raw Angular CLI passthrough.                                        |
| `start`               | `ng serve` — Angular dev server only.                               |
| `dev`                 | Angular dev server + Electron watcher + launch (recommended).       |
| `build`               | `ng build` (development config).                                    |
| `build:prod`          | `ng build --configuration production`.                              |
| `build:electron`      | Compiles `electron/**/*.ts` → `dist-electron/` (CommonJS).          |
| `watch:electron`      | Same as `build:electron` but in watch mode.                         |
| `start:electron`      | Builds Electron main and launches the packaged app against `dist/`. |
| `test`                | Runs unit tests via Karma + Jasmine.                                |
| `lint`                | `ng lint`.                                                          |
| `format`              | Prettier write across `src/` and `electron/`.                       |
| `electron:build`      | Production build + packaging for the current OS.                    |
| `electron:build:<os>` | Cross-compile for `win` / `mac` / `linux`.                          |
| `publish`             | Build + publish installers to the configured `publish` provider.    |

## Architecture notes

### Process model

```
┌────────────────────────────┐        ┌──────────────────────────────────┐
│  Main process (Node)       │  IPC   │  Renderer process (Angular)      │
│  electron/main.ts          │ ◀────▶ │  src/                             │
│  - BrowserWindow           │        │  - standalone components          │
│  - dialog.showOpenDialog   │        │  - signals / zoneless             │
│  - fs.readFile + JSON.parse│        │  - ElectronService (typed bridge) │
└────────────────────────────┘        └──────────────────────────────────┘
              ▲                                   ▲
              │ contextBridge                     │ window.electronAPI
              │ (electron/preload.ts)             │ (typed via ElectronAPI)
```

- **Main process** owns all Node APIs (`fs`, `dialog`, `Menu`). It validates JSON before sending it to the renderer.
- **Preload** uses `contextBridge` with `contextIsolation: true` and `nodeIntegration: false`, so the renderer never touches Node directly.
- **Renderer** talks to the bridge through `ElectronService`, which is fully typed via `ElectronAPI` in `core/electron/electron-api.model.ts`.

### IPC channels

| Channel            | Direction       | Purpose                             |
| ------------------ | --------------- | ----------------------------------- |
| `dialog:open-json` | renderer → main | Open the native file dialog.        |
| `file:read-json`   | renderer → main | Read + validate a JSON file.        |
| `menu:open-json`   | main → renderer | Triggered by the "Open JSON…" menu. |

### Why two `tsconfig` files?

Angular's application code targets ES2022 modules and is bundled by esbuild. Electron's main process must run as **CommonJS** (Node's `require`), so `electron/tsconfig.json` overrides `module`/`moduleResolution` and emits to `dist-electron/`.

## Troubleshooting

- **`Electron bridge is not available`** — you ran `npm start` (web only). Use `npm run dev` for desktop features.
- **Blank Electron window** — the Angular dev server isn't ready yet. `npm run dev` uses `wait-on` to handle this; if you launched Electron manually, ensure `http://localhost:4200` is up first.
- **`Cannot find module 'dist-electron/main.js'`** — run `npm run build:electron` once before `npm run start:electron`.
- **Build errors after upgrading Electron/Angular** — delete `node_modules`, `dist`, `dist-electron`, and `~/.angular` cache, then `npm install` again.
- **Code-signing errors on macOS/Windows** — see <https://www.electron.build/code-signing>.

## License

MIT — see [LICENSE](./LICENSE).
