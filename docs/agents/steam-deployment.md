# Steam Deployment Guide

- **Audience:** Developers, operators, and AI agents implementing a Steam release of Narrative Engine / LOTM.
- **Goal:** Map the real client/server architecture to Steam's distribution, runtime, and store requirements — grounded in this codebase, not generic Steamworks tutorials.
- **Sister docs:**
  - [electron-desktop-packaging.md](./electron-desktop-packaging.md) — Electron architecture hooks, electron-builder recipe, Mac/Windows/Linux packaging constraints, native module + ASAR checklist
  - [monetization-and-deployment.md](./monetization-and-deployment.md) — Revenue models, Stage 1 download-sale roadmap, LOTM IP vs engine-only SKU
  - [demo-vps-player-deployment.md](./demo-vps-player-deployment.md) — Hosted demo path; future Downloads section
  - [docker-build-performance.md](./docker-build-performance.md) — Native rebuild timing (`better-sqlite3`, `sqlite-vec`, `onnxruntime-node`) — same pain as Electron ABI
  - [COOLIFY.md](../COOLIFY.md) — Current production ship path (Docker), not Steam
  - [AI_CODEBASE_MAP.md](../../AI_CODEBASE_MAP.md) — Module boundaries, data flows, and blast-radius matrix

---

## 1. Steam Deployment Prerequisites

### 1.1 Steamworks account and app ID

| Requirement | Detail |
|---|---|
| **Steam Partner account** | A Valve-approved publisher account at [partner.steamgames.com](https://partner.steamgames.com). Requires company verification. |
| **Steam App ID** | Assigned by Valve when you create a new app in the partner backend. This 64-bit ID is referenced in `steam_appid.txt` (development) and embedded in the build manifest. |
| **Steamworks SDK** | Download from the partner site. The SDK provides `steam_api64.dll` (Windows), `libsteam_api.dylib` (macOS), and `libsteam_api.so` (Linux). |
| **SteamCMD** | Command-line tool for uploading builds via the SteamPipe depot system. Used in CI to push builds without the GUI. |

### 1.2 What Steam requires from a desktop app

| Steam requirement | How this app maps |
|---|---|
| **Executable** | Electron `main.cjs` produces `NarrativeEngine.exe` (Windows), `.app` (macOS), `AppImage`/`deb` (Linux). See [electron-desktop-packaging.md](./electron-desktop-packaging.md) §4. |
| **App manifest** | `steam_appid.txt` at the game root during development; production builds are identified by the depot manifest uploaded via SteamCMD. |
| **Store page** | Created in the Steam partner backend — not a code artifact. Requires store assets, description, system requirements, and a trailer. |
| **Depot configuration** | Defined in the partner backend: one depot per OS (Windows/macOS/Linux), each with a content root and file filters. |
| **Steam overlay** | Requires the Steamworks API to be initialized in the Electron main process and the renderer to be a child of the overlay-aware window. |
| **Steam Cloud** | Optional but recommended for save-game sync. Maps to the app's `DATA_DIR` campaign files. |
| **Achievements / Stats** | Optional. Requires Steamworks API calls from the main process. |

---

## 2. System Map: Steam Runtime Architecture

Narrative Engine is a **local-first** TTRPG manager: a React/Vite frontend talks to an Express API on `127.0.0.1:3001`. For Steam, the Electron wrapper bundles both the renderer (`dist/`) and the server (`server.bundle.cjs`) into a single desktop package.

```mermaid
flowchart LR
  subgraph steam [Steam Client]
    Overlay["Steam Overlay\n(injected into Electron window)"]
    Cloud["Steam Cloud\n(syncs DATA_DIR/campaigns)"]
  end
  subgraph electronApp [Electron package (Steam depot)]
    Main["electron/main.cjs\nBrowserWindow + SteamAPI init + spawn server"]
    Preload["electron/preload.cjs\ncontextBridge only"]
    Renderer["Vite dist/\nloadFile via file://"]
    Server["Express server\nserver.bundle.cjs on 127.0.0.1:3001"]
  end
  subgraph writable [userData writable]
    DataDir["DATA_DIR\ncampaigns, embeddings.db, caches, vault"]
  end
  SteamAPI["steam_api64.dll\nin package root"]
  SteamAPI --> Main
  Main -->|spawn + env| Server
  Main -->|loadFile| Renderer
  Renderer -->|"http://localhost:3001/api"| Server
  Server --> DataDir
  Overlay --> Renderer
  Cloud --> DataDir
```

### Runtime modes

| Mode | How it runs | Frontend ↔ API | Steam-relevant |
|---|---|---|---|
| **Dev** | [`scripts/start-dev.mjs`](../../scripts/start-dev.mjs): Vite `:5173` + `node server.js` `:3001` | Relative `/api` via Vite proxy | Not Steam-shipped; local dev only |
| **Web prod** | Docker / Coolify: Express serves `dist/` same-origin | Relative `/api` | Not Steam — VPS demo path |
| **Electron prod** | **Not implemented** — main must start Express, then `loadFile(dist/index.html)` | Absolute `http://localhost:3001/api` via [`apiBase.ts`](../../src/lib/apiBase.ts) | **This is the Steam target** |

### Layers agents must keep in mind

| Layer | Stack | Steam packaging note |
|---|---|---|
| Frontend | React 19 + Vite 8 + Zustand + Tailwind 4 | Build to `dist/`; `base: './'` already set in [`vite.config.ts`](../../vite.config.ts) |
| Backend | Express 5 ESM ([`server.js`](../../server.js) + `server/`) | Bundle to CJS for Electron; externalize `.node` natives |
| Storage | `data/campaigns/*.json`, `data/embeddings.db` | Must be **writable** under `app.getPath('userData')`; Steam Cloud syncs `campaigns/` |
| Natives | `better-sqlite3`, `sqlite-vec`, `onnxruntime-node`, `sharp` | Rebuild for Electron ABI; unpack from ASAR |
| Models | HF embedder + Kokoro TTS | First-run downloads; caches must not live inside ASAR |
| Steamworks | `steam_api64.dll` / `libsteam_api` | Placed in package root; loaded by Electron main process |

---

## 3. Current State vs Steam Readiness

| Steam requirement | Repo truth |
|---|---|
| Electron packaging pipeline | **Not implemented** — `electron/` is gitignored ([`.gitignore`](../../.gitignore) lines 76–78); no `electron-builder` in [`package.json`](../../package.json) |
| Steamworks SDK integration | **Absent** — no `steam_api` import, no `steam_appid.txt`, no achievements/stats code |
| Steam Cloud sync | **Absent** — no `steam_cloud` config; `DATA_DIR` is local-only |
| Steam overlay support | **Absent** — no overlay initialization in Electron main |
| SteamCMD upload pipeline | **Absent** — no `.github/workflows/steam-deploy.yml`, no `steamcmd` in CI |
| Steam store assets | **Absent** — no `steam/` asset directory, no store page config |
| App manifest / depot config | **Absent** — no `steam_appid.txt`, no `depots.vdf` |
| Native module rebuild for Electron ABI | **Hooks exist** but not wired — see [electron-desktop-packaging.md](./electron-desktop-packaging.md) §5 |
| CORS for `file://` origin | **Already wired** — [`server.js`](../../server.js) CORS allowlist includes `'null'` |
| API base for `file://` protocol | **Already wired** — [`src/lib/apiBase.ts`](../../src/lib/apiBase.ts) detects `window.location.protocol === 'file:'` |
| Vault OS encryption | **Already wired** — [`server/vault.js`](../../server/vault.js) uses `electron.safeStorage` when `process.versions.electron` is set |
| Writable data paths | **Already wired** — [`server/lib/fileStore.js`](../../server/lib/fileStore.js) honors `DATA_DIR` env override |

**Trap for agents:** Do not assume Steam deployment works because Electron hooks exist in the code. Those hooks are forward-compatible stubs — the actual `electron/` directory, Steamworks integration, and SteamCMD pipeline must all be built. Until then, the landing page must not promise Steam downloads ([lotm-landing-page.md](./lotm-landing-page.md)).

---

## 4. Steam Packaging Pipeline

Steam distribution requires a **Windows executable** as the primary target, with macOS and Linux as optional secondary depots. The packaging pipeline builds on the Electron recipe in [electron-desktop-packaging.md](./electron-desktop-packaging.md).

### 4.1 Files to create

| Path | Role |
|---|---|
| `electron/main.cjs` | App lifecycle, single-instance lock, spawn server, create window, **Steamworks init + shutdown**, quit/cleanup |
| `electron/preload.cjs` | Minimal `contextBridge` API if needed (prefer none initially) |
| `build-server.mjs` | esbuild entry: bundle `server.js` + `server/**` → `server.bundle.cjs`; **external** native addons |
| `electron-builder.yml` or `package.json` `build` key | `appId`, files, `asarUnpack`, per-OS targets, **Steamworks DLL placement** |
| `steam_appid.txt` | Contains the numeric App ID (development only; production uses depot manifest) |
| `steam/` | Directory for Steam store assets, `depots.vdf`, `build.vdf` (SteamCMD config) |
| `.github/workflows/steam-deploy.yml` | CI: build Electron artifacts → upload via SteamCMD |
| `scripts/steam-upload.sh` | Wrapper around `steamcmd` for local testing |

### 4.2 Steamworks SDK integration

The Steamworks SDK must be initialized in the Electron **main process** (not the renderer). The SDK shared library (`steam_api64.dll` on Windows, `libsteam_api.dylib` on macOS, `libsteam_api.so` on Linux) must be placed in the package root alongside the executable.

#### 4.2.1 Installing the SDK

1. Download the Steamworks SDK from the partner backend.
2. Extract `redistributable_bin/` into the project:
   ```text
   steam/sdk/
     steam_api64.dll      (Windows)
     libsteam_api.dylib   (macOS)
     libsteam_api.so      (Linux)
   ```
3. In `electron-builder.yml`, include the SDK in the package:
   ```yaml
   extraResources:
     - from: steam/sdk
       to: steam
       filter: ["steam_api64.dll", "libsteam_api.dylib", "libsteam_api.so"]
   ```

#### 4.2.2 Initializing Steamworks in the main process

In `electron/main.cjs`, after `app.whenReady()`:

```js
// electron/main.cjs (sketch)
const { app, BrowserWindow } = require('electron');
const path = require('path');

let steamworks = null;
let steamAppId = null;

async function initSteam() {
    try {
        // Use a Node-native Steamworks binding (e.g. node-steamworks or greenworks)
        // or call the C SDK via ffi-napi. The binding must be rebuilt for Electron ABI.
        steamworks = require('node-steamworks');
        steamworks.init();
        steamAppId = steamworks.getAppID();
        console.log('[Steam] Initialized for App ID:', steamAppId);
    } catch (e) {
        console.warn('[Steam] Steamworks init failed (running outside Steam?):', e.message);
        // Non-fatal — the app should still run standalone
    }
}

app.whenReady().then(async () => {
    await initSteam();
    createWindow();
});
```

**Important:** Steamworks initialization must happen **before** creating the `BrowserWindow` so the overlay can attach. If Steam is not running (e.g., during local development), the app must gracefully fall back to standalone mode.

#### 4.2.3 Steamworks dependency in package.json

Add a Steamworks binding to `devDependencies`. Options:

| Package | Pros | Cons |
|---|---|---|
| `node-steamworks` | Actively maintained, TypeScript types | Requires native rebuild for Electron ABI |
| `greenworks` | Valve-supported fork | Less actively maintained |
| `ffi-napi` + raw SDK | Full control | Complex, manual FFI declarations |

Regardless of choice, the native binding must be rebuilt for the Electron ABI using `@electron/rebuild` (same as `better-sqlite3`, `sqlite-vec`, etc. — see [electron-desktop-packaging.md](./electron-desktop-packaging.md) §5).

### 4.3 electron-builder config sketch

```yaml
appId: com.narrativeengine.steam
productName: Narrative Engine
directories:
  output: release
files:
  - dist/**
  - electron/**
  - server.bundle.cjs
  - package.json
  - steam/sdk/**
  - node_modules/better-sqlite3/**
  - node_modules/sqlite-vec/**
  - node_modules/onnxruntime-node/**
  - node_modules/sharp/**
  - node_modules/node-steamworks/**  # or chosen Steamworks binding
asar: true
asarUnpack:
  - "**/*.node"
  - "**/better-sqlite3/**"
  - "**/sqlite-vec/**"
  - "**/onnxruntime-node/**"
  - "**/sharp/**"
  - "**/node-steamworks/**"
  - "steam/sdk/**"
extraResources:
  - from: steam/sdk
    to: steam
win:
  target:
    - nsis
  verifyUpdateCodeSignature: false
mac:
  target:
    - dmg
  category: public.app-category.games
linux:
  target:
    - AppImage
  category: Game
```

### 4.4 Build pipeline order

1. `npm ci`
2. Rebuild natives for **Electron** ABI (not system Node):
   ```bash
   npx electron-rebuild -f -w better-sqlite3,sqlite-vec,onnxruntime-node,sharp,node-steamworks
   ```
3. `npm run build` → Vite `dist/`
4. `npm run build:server` → `server.bundle.cjs`
5. `electron-builder` per OS → `release/`
6. Code-sign (macOS notarize + Windows Authenticode) using CI secrets — never commit certs
7. Upload artifacts to GitHub Releases (for manual SteamCMD testing)
8. Upload to Steam depots via SteamCMD (see §5)

---

## 5. SteamCMD Build Upload

SteamCMD is Valve's command-line tool for uploading builds to SteamPipe depots. The upload is configured via a `build.vdf` file that maps local build output to Steam depots.

### 5.1 Depot configuration

In the Steam partner backend, create three depots:

| Depot | OS | Content root | File filters |
|---|---|---|---|
| `1234561` (Windows) | Windows | `dist/win-unpacked/` | Include all; exclude `*.pdb`, `*.map` |
| `1234562` (macOS) | macOS | `dist/mac/` | Include `.app` bundle; exclude `._*` |
| `1234563` (Linux) | Linux | `dist/linux-unpacked/` | Include all; exclude `*.debug` |

> Replace `123456` with the actual App ID assigned by Valve.

### 5.2 `build.vdf` (SteamCMD config)

Create `steam/build.vdf`:

```vdf
"appbuild"
{
    "appid" "123456"
    "desc" "Automated build from GitHub Actions"
    "buildversion" "1.0.0"
    "buildid" "1"
    "contentroot" "/path/to/build/output"
    "depots"
    {
        "1234561"
        {
            "FileMapping"
            {
                "LocalPath" "win-unpacked/*"
                "DepotPath" "."
                "recursive" "1"
            }
        }
        "1234562"
        {
            "FileMapping"
            {
                "LocalPath" "mac/*"
                "DepotPath" "."
                "recursive" "1"
            }
        }
        "1234563"
        {
            "FileMapping"
            {
                "LocalPath" "linux-unpacked/*"
                "DepotPath" "."
                "recursive" "1"
            }
        }
    }
}
```

### 5.3 SteamCMD upload script

Create `scripts/steam-upload.sh`:

```bash
#!/bin/bash
set -euo pipefail

STEAM_USER="${STEAM_USER:?Set STEAM_USER}"
STEAM_PASSWORD="${STEAM_PASSWORD:?Set STEAM_PASSWORD}"
BUILD_DIR="${1:-release}"
BUILD_VDF="${2:-steam/build.vdf}"

# Update the contentroot in build.vdf to point at the local build output
sed -i "s|/path/to/build/output|$(pwd)/${BUILD_DIR}|g" "$BUILD_VDF"

docker run --rm \
  -v "$(pwd)/${BUILD_DIR}:/build" \
  -v "$(pwd)/${BUILD_VDF}:/build/build.vdf" \
  -e STEAM_USER="$STEAM_USER" \
  -e STEAM_PASSWORD="$STEAM_PASSWORD" \
  steamcmd/steamcmd:latest \
  +login "$STEAM_USER" "$STEAM_PASSWORD" \
  +run_app_build "$BUILD_VDF" \
  +quit
```

> **Note:** SteamCMD requires a Steam account with builder rights for the app. Use a dedicated bot account, not a personal account.

### 5.4 CI workflow sketch

Create `.github/workflows/steam-deploy.yml`:

```yaml
name: Deploy to Steam

on:
  push:
    tags:
      - "v*"  # Tag-based releases only

concurrency:
  group: steam-deploy
  cancel-in-progress: false

jobs:
  build-and-upload:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc

      - name: Install dependencies
        run: npm ci

      - name: Rebuild natives for Electron
        run: npx electron-rebuild -f -w better-sqlite3,sqlite-vec,onnxruntime-node,sharp,node-steamworks

      - name: Build frontend
        run: npm run build

      - name: Build server bundle
        run: npm run build:server

      - name: Package for Steam
        run: npx electron-builder --publish never

      - name: Upload to Steam
        if: github.event_name == 'push'
        env:
          STEAM_USER: ${{ secrets.STEAM_USER }}
          STEAM_PASSWORD: ${{ secrets.STEAM_PASSWORD }}
        run: |
          ./scripts/steam-upload.sh release steam/build.vdf
```

**Steam secrets required in GitHub:**

| Secret | Purpose |
|---|---|
| `STEAM_USER` | Steam account with builder rights for the app |
| `STEAM_PASSWORD` | Password for the builder account (use Steam Guard app password) |
| `STEAM_API_KEY` | Optional — for querying build status post-upload |

---

## 6. Steam Cloud Integration

Steam Cloud automatically syncs files between the user's machines. For Narrative Engine, the natural sync target is the campaign data under `DATA_DIR`.

### 6.1 What to sync

| Path | Sync? | Reason |
|---|---|---|
| `data/campaigns/*.json` | **Yes** | Player's campaign progress — the core save data |
| `data/campaigns/*.state.json` | **Yes** | Active turn state |
| `data/embeddings.db` | **No** | Large binary; can be regenerated from campaign JSON via embedder warmup |
| `data/.embeddings_cache/` | **No** | Model weights; downloaded once, not user data |
| `data/.tts_cache/` | **No** | Generated audio; large, regenerable |
| `data/settings.json` | **Yes** | User preferences (LLM provider, UI settings) |
| `data/apikeys.vault` | **No** | Encrypted vault — should NOT sync (security risk; each machine has its own vault) |
| `data/backups/` | **No** | Redundant with campaign sync; large |
| `data/portraits/` | **No** | Generated images; regenerable |
| `data/mods/` | **No** | User-installed mods; better managed via Steam Workshop (see §7) |

### 6.2 Steam Cloud configuration

In the Steam partner backend, configure `steam_cloud` in `config.vdf`:

```vdf
"steam_cloud"
{
    "max_file_size_1048576" "1048576"
    "max_file_size_10485760" "10485760"
    "max_file_size_104857600" "104857600"
    "total_quota" "104857600"
    "file_persistence" "1"
    "root" "data"
    "whitelist"
    {
        "1" "campaigns/*.json"
        "2" "campaigns/*.state.json"
        "3" "settings.json"
    }
}
```

### 6.3 Mapping Steam Cloud to DATA_DIR

The Electron main process must set `DATA_DIR` to the Steam Cloud-synced directory. Steam Cloud uses a platform-specific path:

- **Windows:** `%PROGRAMFILES(x86)%/Steam/steamapps/compatdata/<appid>/pfx/drive_c/users/steamuser/AppData/Roaming/NarrativeEngine/`
- **macOS:** `~/Library/Application Support/Steam/steamapps/common/Narrative Engine/`
- **Linux:** `~/.steam/steam/steamapps/compatdata/<appid>/pfx/drive_c/users/steamuser/AppData/Roaming/NarrativeEngine/`

However, the recommended approach is to use `app.getPath('userData')` (which Electron resolves to the correct platform path) and let Steam Cloud handle the sync at the OS level. The app already supports `DATA_DIR` env override ([`server/lib/fileStore.js`](../../server/lib/fileStore.js) line 11), so the main process should set:

```js
// electron/main.cjs
const userDataPath = app.getPath('userData');
process.env.DATA_DIR = path.join(userDataPath, 'data');
```

This ensures campaign files land in the Steam Cloud-synced `userData` directory.

---

## 7. Steam Workshop Integration (Optional)

Steam Workshop allows users to share and discover mods. The app already has a mod system (`mods/`, Extensions tab in Settings), so Workshop integration is a natural extension.

### 7.1 Current mod system

| Component | File |
|---|---|
| Mod loader | [`server/lib/modLoader.js`](../../server/lib/modLoader.js) |
| Mod table registry | [`server/lib/modTableRegistry.js`](../../server/lib/modTableRegistry.js) |
| Mods API route | [`server/routes/mods.js`](../../server/routes/mods.js) |
| Bundled mods dir | `public/bundled-mods/` (read-only, ships with app) |
| User mods dir | `data/mods/` (writable, user-installed) |

### 7.2 Workshop integration plan

| Step | Touch point |
|---|---|
| 1. Steam UGC API binding | Add `node-steamworks` UGC calls in Electron main |
| 2. Workshop item metadata | Map mod `.mod.json` descriptor to Workshop item tags |
| 3. Download/Subscribe | On app start, query subscribed items → download to `data/mods/` |
| 4. Publish | UI button in Extensions tab → upload mod to Workshop via UGC create/update |
| 5. Content root | Workshop items install to Steam's `workshop/` directory; symlink or copy to `data/mods/` |

**Note:** Workshop integration is a post-MVP feature. The initial Steam release can ship with bundled mods only and add Workshop support in a later update.

---

## 8. Steam Overlay Support

The Steam overlay (Shift+Tab in-game menu) requires:

1. **Steamworks initialized** before window creation (see §4.2.2).
2. **Window created with overlay-compatible flags** — the `BrowserWindow` must not use `frame: false` in a way that breaks overlay injection.
3. **Renderer must be a child of the overlay-aware window** — Electron handles this automatically when Steam is detected.

### 8.1 Overlay compatibility checklist

| Check | Status |
|---|---|
| Steamworks init before `BrowserWindow` creation | **To implement** in `electron/main.cjs` |
| `BrowserWindow` uses standard frame (not frameless) | **Default** — no frameless window in current hooks |
| No conflicting keyboard shortcuts | **Check** — verify no Shift+Tab conflicts in [`src/`](../../src/) |
| WebGL / canvas rendering | **Compatible** — PixiJS 8 renders to canvas, overlay injects via DirectX/Native |
| Audio focus | **Check** — Kokoro TTS and Chatterbox may need to release audio device when overlay is active |

### 8.2 Known overlay issues

- **PixiJS fullscreen:** If the game enters a PixiJS fullscreen canvas, the Steam overlay may not inject. Ensure the game does not call `requestFullscreen()` on the canvas — use CSS fullscreen instead, or handle overlay visibility events.
- **Keyboard capture:** If the game captures all keyboard input (e.g., during dice rolls), the overlay hotkey may not fire. Release keyboard capture when the overlay is active.

---

## 9. Steam Store Page Requirements

The Steam store page is configured in the partner backend, not in code. However, the app must provide certain assets and metadata.

### 9.1 Required store assets

| Asset | Dimensions | Location |
|---|---|---|
| Store banner | 460×215 px | `steam/assets/store_banner.jpg` |
| Store capsule | 616×353 px | `steam/assets/store_capsule.jpg` |
| Store logo | 460×215 px | `steam/assets/store_logo.png` |
| Hero image | 3840×1280 px (min 1280 height) | `steam/assets/hero.jpg` |
| Trailer | 1080p MP4 | Upload via Steam partner backend |
| Screenshots | 1920×1080 | `steam/assets/screenshots/` |
| Icon | 256×256 px | `steam/assets/icon_256.png` |

### 9.2 System requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| OS | Windows 10 64-bit | Windows 11 64-bit |
| CPU | Intel i5-4460 or AMD FX-6300 | Intel i7-8700K or AMD Ryzen 5 3600 |
| RAM | 8 GB | 16 GB |
| GPU | DirectX 11 compatible | DirectX 12 compatible |
| Storage | 5 GB available | 10 GB available (for model caches) |
| Network | Broadband Internet (for LLM API calls) | Broadband Internet |

> **Note:** The app is local-first but requires an internet connection for LLM API calls (BYOK). This must be clearly stated on the store page.

### 9.3 Store page copy

Lift gameplay descriptions from [lotm-how-to-play-guide.md](./lotm-how-to-play-guide.md) and [lotm-landing-page.md](./lotm-landing-page.md). Key messaging:

- **Hero:** "Lord of the Mysteries — AI narrative RPG"
- **Description:** "A self-hosted TTRPG engine that runs extended, multi-session campaigns with persistent memory, living NPCs, and automated world management — powered by any OpenAI-compatible LLM or local Ollama model."
- **Features:**
  - Local-first: your campaigns stay on your machine
  - Bring your own API key (OpenAI, Ollama, DeepSeek, OpenRouter)
  - Lord of the Mysteries campaign pack included
  - Steam Cloud sync for campaign progress
  - Steam Workshop for community mods

---

## 10. Legal and IP Considerations

### 10.1 LOTM fan content

The `mechanics/World_compendium/` and `gamedata/` directories contain Lord of the Mysteries fan content. Commercial sale on Steam requires either:

- **IP clearance** from the LOTM copyright holder (Cuttlefish / Lin Jiuwu), or
- **Engine-only SKU** — ship the MIT-licensed engine without LOTM-branded content, with LOTM as a free mod pack

See [monetization-and-deployment.md](./monetization-and-deployment.md) §6 for the full legal checklist.

### 10.2 Steam distribution agreement

- **Steam Distribution Agreement** must be signed in the partner backend.
- **Revenue share:** Valve takes 30% of gross revenue (standard tier).
- **Steam DRM:** The Steam runtime provides DRM; the app does not need additional copy protection.
- **Refund policy:** Steam's standard 2-hour / 14-day refund policy applies.

### 10.3 Third-party dependencies

| Dependency | License | Steam redistribution |
|---|---|---|
| `better-sqlite3` | BSD-3 | ✅ Bundled |
| `sqlite-vec` | MIT | ✅ Bundled |
| `onnxruntime-node` | MIT | ✅ Bundled |
| `sharp` | Apache-2.0 | ✅ Bundled |
| `pixi.js` | MIT | ✅ Bundled |
| `react` | MIT | ✅ Bundled |
| `kokoro-js` | MIT | ✅ Bundled |
| `@huggingface/transformers` | Apache-2.0 | ✅ Bundled |

All dependencies are permissively licensed and can be redistributed in a Steam build.

---

## 11. Steam Build Configuration

### 11.1 `steam_appid.txt`

For development builds, create `steam_appid.txt` at the project root containing the numeric App ID:

```text
123456
```

This file tells the Steam runtime which app is running. **Do not ship this file in the Steam build** — production builds are identified by the depot manifest.

### 11.2 Steam launch options

In the partner backend, configure default launch options:

| Option | Value | Purpose |
|---|---|---|
| Default | (empty) | Launches the app normally |
| `-dev` | (optional) | Launches in development mode (skips Steam Cloud, enables debug) |

### 11.3 Steam input (controller support)

The app currently has no controller support. If adding controller support:

- Use the Steam Input API via `node-steamworks`
- Map controller actions to keyboard events in the renderer
- Test with Steam Deck (the app should be playable on Deck)

**Note:** Steam Deck compatibility is a strong selling point. The app's local-first nature and BYOK model make it well-suited for Deck, but the Electron + native module stack must be tested on Linux.

---

## 12. Implementation Pointer Table (for Agents)

| Feature needed | Likely touch points |
|---|---|
| Electron main / preload | New `electron/main.cjs`, `electron/preload.cjs` (see [electron-desktop-packaging.md](./electron-desktop-packaging.md) §4.1) |
| Server bundle | New `build-server.mjs`; stop gitignoring it ([`.gitignore`](../../.gitignore) lines 76–78) |
| Pack scripts / builder | [`package.json`](../../package.json) `main`, `scripts`, `build` key or `electron-builder.yml` |
| Steamworks SDK | `steam/sdk/` directory; `node-steamworks` or `greenworks` in `package.json` |
| Steamworks init | `electron/main.cjs` — init before `BrowserWindow`, shutdown on quit |
| Steam Cloud config | `steam/config.vdf` (partner backend); `DATA_DIR` → `app.getPath('userData')` in main |
| SteamCMD upload | `steam/build.vdf`, `scripts/steam-upload.sh`, `.github/workflows/steam-deploy.yml` |
| Steam store assets | `steam/assets/` directory (banner, capsule, hero, screenshots, icon) |
| Steam overlay | Verify `BrowserWindow` config; test Shift+Tab injection |
| Steam Workshop | [`server/lib/modLoader.js`](../../server/lib/modLoader.js), [`server/routes/mods.js`](../../server/routes/mods.js), UGC API in main |
| Steam Deck compat | Test Linux AppImage build; verify native modules load on SteamOS |
| API under `file://` | Already [`src/lib/apiBase.ts`](../../src/lib/apiBase.ts) |
| CORS for Electron | Already [`server.js`](../../server.js) (`'null'`) |
| Writable data paths | Main sets env → [`server/lib/fileStore.js`](../../server/lib/fileStore.js) |
| Vault OS encryption | Already [`server/vault.js`](../../server/vault.js) |
| Native module rebuild | `npx electron-rebuild` in CI (same as [electron-desktop-packaging.md](./electron-desktop-packaging.md) §4.2) |
| Steam secrets | GitHub repo secrets: `STEAM_USER`, `STEAM_PASSWORD` |
| Landing Downloads | [`LandingPage.tsx`](../../src/components/landing/LandingPage.tsx) — only after Steam store page is live |
| Monetization Stage 1 | [monetization-and-deployment.md](./monetization-and-deployment.md) Model A |

---

## 13. Steam Deployment Checklist

### Pre-requisites

- [ ] Steam Partner account approved
- [ ] Steam App ID assigned
- [ ] Steamworks SDK downloaded
- [ ] Builder Steam account created (with Steam Guard)
- [ ] Steam store assets prepared (banner, capsule, hero, screenshots, icon, trailer)

### Packaging

- [ ] Implement `electron/main.cjs` with Steamworks init
- [ ] Implement `electron/preload.cjs`
- [ ] Implement `build-server.mjs` (esbuild → CJS, externalize natives)
- [ ] Add `electron-builder.yml` with Steamworks DLL in `extraResources`
- [ ] Add `electron`, `electron-builder`, `electron-rebuild`, `node-steamworks` to `package.json`
- [ ] Remove `electron/` and `build-server.mjs` from [`.gitignore`](../../.gitignore)
- [ ] Create `steam_appid.txt` (dev only)
- [ ] Rebuild natives for Electron ABI: `npx electron-rebuild -f -w better-sqlite3,sqlite-vec,onnxruntime-node,sharp,node-steamworks`
- [ ] Build: `npm run build && npm run build:server && electron-builder`
- [ ] Code-sign: macOS notarize + Windows Authenticode
- [ ] Test standalone (no Steam running) — must still work

### Steam integration

- [ ] Steamworks init before `BrowserWindow` creation
- [ ] Steamworks shutdown on app quit
- [ ] Steam Cloud config in partner backend (`config.vdf`)
- [ ] `DATA_DIR` → `app.getPath('userData')` in main process
- [ ] Verify campaign files sync via Steam Cloud
- [ ] Verify vault keys do NOT sync (security)
- [ ] Test Steam overlay (Shift+Tab) injection
- [ ] Test Steam Deck (Linux build)

### SteamCMD upload

- [ ] Create `steam/build.vdf` with depot mappings
- [ ] Create `scripts/steam-upload.sh`
- [ ] Create `.github/workflows/steam-deploy.yml` (tag-based trigger)
- [ ] Add `STEAM_USER` and `STEAM_PASSWORD` to GitHub secrets
- [ ] Test SteamCMD upload locally
- [ ] Verify build appears in partner backend

### Store page

- [ ] Upload store assets to partner backend
- [ ] Write store description (lift from [lotm-how-to-play-guide.md](./lotm-how-to-play-guide.md))
- [ ] Set system requirements
- [ ] Configure launch options
- [ ] Submit for Steam review
- [ ] Update landing page with Steam store link

### Post-launch

- [ ] Monitor Steam Cloud sync errors
- [ ] Monitor crash reports via Steam
- [ ] Plan Steam Workshop integration (see §7)
- [ ] Plan Steam Deck compatibility rating

---

## 14. What NOT to Do

- Do not ship `steam_appid.txt` in the production Steam build — it is for development only.
- Do not pack native `.node` binaries only inside ASAR without `asarUnpack` — load fails or crashes.
- Do not let HF / Kokoro / ONNX caches write under the ASAR or install directory — they must be under `DATA_DIR` (see [`server/lib/tts/cache.js`](../../server/lib/tts/cache.js) `applyHfCacheEnv()`).
- Do not point `DATA_DIR` at the project root inside the install directory — use `app.getPath('userData')`.
- Do not enable `nodeIntegration: true` or disable `contextIsolation` in the Electron renderer.
- Do not sync `apikeys.vault` via Steam Cloud — each machine has its own encrypted vault.
- Do not sync `embeddings.db` or model caches via Steam Cloud — they are large and regenerable.
- Do not initialize Steamworks in the renderer process — it must be in the main process before window creation.
- Do not promise Steam Deck compatibility without testing the Linux build on SteamOS.
- Do not commit Steam builder account credentials or code-signing certificates.
- Do not ship a commercial LOTM-branded build without IP review ([monetization-and-deployment.md](./monetization-and-deployment.md) §6).
- Do not treat [`AI_CODEBASE_MAP.md`](../../AI_CODEBASE_MAP.md) / [`ARCHITECTURE.md`](../../ARCHITECTURE.md) Electron file listings as present until the pipeline is implemented.
- Do not promise Steam downloads on the landing page until the Steam store page is live and reviewed.

---

## 15. Out of Scope for This Guide

- Implementing `electron/`, adding npm deps, or adding GitHub Actions workflows (documentation only)
- Steam store page copywriting (store assets are listed; copy is referenced from existing docs)
- Steam Workshop implementation (see §7 for the plan)
- Steam Deck certification process (beyond compatibility testing notes)
- Mobile companion packaging ([NarrativeEngine-M](https://github.com/Sagesheep/NarrativeEngine-M))
- Rewriting [`AI_CODEBASE_MAP.md`](../../AI_CODEBASE_MAP.md) / [`ARCHITECTURE.md`](../../ARCHITECTURE.md) (optional follow-up once the pipeline exists)
- Changing the hosted Docker/Coolify deploy path
- Legal advice on LOTM fan content — see [monetization-and-deployment.md](./monetization-and-deployment.md) §6

---

## 16. Related Files

| File | Role |
|---|---|
| [`electron-desktop-packaging.md`](./electron-desktop-packaging.md) | Electron architecture hooks, electron-builder recipe, native module + ASAR checklist |
| [`monetization-and-deployment.md`](./monetization-and-deployment.md) | Revenue models, Stage 1 download-sale roadmap, LOTM IP vs engine-only SKU |
| [`demo-vps-player-deployment.md`](./demo-vps-player-deployment.md) | Hosted demo path; future Downloads section |
| [`docker-build-performance.md`](./docker-build-performance.md) | Native rebuild timing — same pain as Electron ABI |
| [`COOLIFY.md`](../COOLIFY.md) | Current production ship path (Docker), not Steam |
| [`Dockerfile`](../../Dockerfile) | Three-stage image definition (reference for native module rebuild steps) |
| [`server.js`](../../server.js) | Express server; CORS allowlist includes `'null'` for Electron `file://` |
| [`src/lib/apiBase.ts`](../../src/lib/apiBase.ts) | API base URL — detects `file:` protocol for Electron |
| [`server/vault.js`](../../server/vault.js) | AES-256-GCM vault; uses `electron.safeStorage` when Electron is detected |
| [`server/lib/fileStore.js`](../../server/lib/fileStore.js) | `DATA_DIR`, `MODS_DIR`, `BUNDLED_MODS_DIR`, `LOTM_ASSETS_DIR` env overrides |
| [`server/lib/tts/cache.js`](../../server/lib/tts/cache.js) | `applyHfCacheEnv()` — sets HF cache dirs before importing kokoro-js |
| [`server/lib/embedder.js`](../../server/lib/embedder.js) | ONNX embedder; cache under `DATA_DIR/.embeddings_cache` |
| [`vite.config.ts`](../../vite.config.ts) | `base: './'` for `file://` protocol; demo compendium plugin |
| [`package.json`](../../package.json) | Dependencies; no Electron/Steam deps yet |
| [`.gitignore`](../../.gitignore) | Lines 76–78 ignore `electron/` and `build-server.mjs` |
| [`start.sh`](../../start.sh) | Local Node.js startup script (reference for env vars) |
| [`Start_Narrative_Engine.bat`](../../Start_Narrative_Engine.bat) | Windows startup script |
| [`docker-compose.yml`](../../docker-compose.yml) | Local compose (reference for env vars) |
| [`docker-compose.prod.yml`](../../docker-compose.prod.yml) | Coolify compose (reference for production env) |
| [`scripts/start-dev.mjs`](../../scripts/start-dev.mjs) | Dev script (reference for env var setup) |
| [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) | CI build + GHCR push (reference for Steam CI) |
| [`server/routes/mods.js`](../../server/routes/mods.js) | Mod API route (reference for Workshop integration) |
| [`server/lib/modLoader.js`](../../server/lib/modLoader.js) | Mod loader (reference for Workshop integration) |
