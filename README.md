# AC HUD Frontend

React + TypeScript frontend for the Assetto Corsa HUD. The frontend contains
the operational home screen, layout editor, telemetry display, dummy telemetry
controls, widget library, PWA assets, and realtime SSE synchronization.

The separate backend/collector repository is [`ac-hud-backend`](../ac-hud-backend).
It provides the Config API, telemetry SSE service, Assetto Corsa collector, CSP
bridge, and the Windows production launcher. The backend production bundle
builds this frontend and serves its `dist` output.

## AC Display Unit v1.0.1

AC Display Unit is developed and published by **Yefta Asyel** under the [MIT
License](LICENSE).

- Repository: <https://github.com/yeftakun/ac-hud>
- Support: <yeftakun34@gmail.com>
- Target: Windows x64
- Assetto Corsa original with Content Manager and Custom Shaders Patch required;
  tested with CSP `0.2.11`.

## Requirements

- Node.js 20 or newer
- npm
- A modern browser supporting ES modules and EventSource
- For phone access, the laptop and phone must be on the same Wi-Fi network

## Installation

```powershell
npm install
```

## Development setup

Install dependencies:

```powershell
npm install
```

For standalone frontend development, start the local config/telemetry server:

```powershell
npm run server
```

The local development server runs at:

```text
http://localhost:3001
```

In a second terminal, start Vite:

```powershell
npm run dev
```

Vite is configured for port `5174` and host `0.0.0.0`:

```text
http://localhost:5174
```

From a phone on the same network, use the laptop IPv4 address:

```text
http://10.169.143.2:5174
```

If port `5174` is already occupied, Vite may select another port such as `5175`.
Use the URL printed by Vite. Do not run `npm run dev` and `npx vite` at the
same time because they create separate Vite instances.

## Application routes

| URL | Function |
| --- | --- |
| `/` | Simple operational home screen |
| `/editor` | Profile layout and widget property editor |
| `/display` | Final HUD display |
| `/data` | Dummy telemetry controls for development/testing |

The home screen loads the active profile as read-only and provides shortcuts to
Display and Editor. The profile list is intentionally hidden while the MVP uses
one profile. The Data route remains available for development but is not linked
from the production home screen.

Example phone access when Vite runs on port `5175`:

```text
http://10.169.143.2:5175/data
http://10.169.143.2:5175/display
```

Use the same host and Vite port for `/data` and `/display` when testing browser
local behavior. Cross-device telemetry synchronization uses the backend on port
`3001`.

## Architecture

```text
ac-hud (this repository)
  ├─ /editor  -> GET/PUT /configs/:id
  ├─ /display -> GET /configs/:id + SSE /telemetry/events
  └─ /data    -> PUT /telemetry (development only)

ac-hud-backend (separate repository)
  ├─ Config API and profile storage
  ├─ Telemetry ingest, patch, and SSE broadcast
  ├─ Assetto Corsa shared-memory collector
  └─ Windows launcher and production static-file host
```

### Telemetry

Dummy telemetry is stored in [`public/capture.json`](public/capture.json). Keys
use flat dot-notation rather than nested objects:

```json
{
  "rpm": 4500,
  "lap.best": 98.456,
  "engine.oilTemp": 102,
  "tyres.FL.psi": 27.4,
  "abs.active": false
}
```

All frontend telemetry reads go through [`src/hooks/useTelemetry.ts`](src/hooks/useTelemetry.ts).
The implementation uses Zustand in [`src/lib/telemetryStore.ts`](src/lib/telemetryStore.ts).

The `/data` page changes values through `PUT /telemetry`. The server broadcasts
updates to all displays through SSE. SSE is a long-lived connection, so a
`pending` status in DevTools is normal.

Telemetry server state is stored in memory. Restarting the server restores the
baseline from `public/capture.json`.

## Profiles and Config API

Profiles are stored in [`server/data/profiles.json`](server/data/profiles.json).
The example profile is `profile_001`.

Available endpoints:

```text
GET  /configs
GET  /configs/:id
POST /configs
PUT  /configs/:id
```

Example:

```powershell
Invoke-WebRequest http://localhost:3001/configs -UseBasicParsing
Invoke-WebRequest http://localhost:3001/configs/profile_001 -UseBasicParsing
```

The profile schema contains profile identity, canvas settings, and a `widgets`
array. Each widget has at least:

```json
{
  "id": "w_speed",
  "type": "raw-value",
  "x": 100,
  "y": 80,
  "w": 180,
  "h": 80
}
```

## Editor features

The `/editor` page currently supports:

- A 960×540 canvas with fit-to-area scaling.
- Widget positioning and resizing through `react-moveable`.
- Global properties: profile name, canvas size, canvas background, and font.
- Widget properties: label, dataKey, colors, value size, and z-index.
- Add Widget and Delete Widget.
- Import/export layout JSON.
- Save profile through `PUT /configs/:id`.
- Undo/redo through buttons or shortcuts:
  - `Ctrl+Z`: undo
  - `Ctrl+Y`: redo
- `Ctrl+Shift+Z`: alternate redo shortcut
- Font files from `public/fonts`.

Editor changes become permanent only after pressing `Save`.

## Available widgets

Widgets are located in [`src/components/widgets`](src/components/widgets):

- `stat-box`
- `stat-group`
- `raw-value`
- `drs`
- `rpm-bar`
- `activation-lights`
- `tyres`
- `overlay-event`

`WidgetRenderer` selects a component from `widget.type`. Unknown widget types
render as placeholders so an invalid profile does not crash the application.

`overlay-event` renders in a separate layer above regular widgets. It supports
telemetry triggers, partial/full coverage, fade transitions, and auto-dismiss.

## PWA and display mode

Display uses:

- `public/manifest.json`
- Basic service worker in `public/sw.js`
- Wake Lock API while the display page is active
- Browser fullscreen through the Fullscreen button

When fullscreen is active, the Fullscreen button is hidden and reappears when
fullscreen is exited.

For PWA testing on a phone, use `localhost` or HTTPS. Plain HTTP over LAN can
be used for display testing, but browser features such as Wake Lock and PWA
installation may be restricted by browser security.

## Build and production

Validasi TypeScript dan build frontend:

```powershell
npm run build
```

Menjalankan hasil build dengan Vite preview:

```powershell
npm run preview
```

`npm run preview` only serves the frontend build. The Config/telemetry server
still needs to run separately during development.

For the all-in-one Windows production application, use the backend repository:

```powershell
cd ..\ac-hud-backend
.\tools\build-production.ps1 -FrontendDir ..\ac-hud
```

This produces `ac-hud-backend\release\AcHud.exe`, which starts the backend,
serves this frontend, and starts the Assetto Corsa collector. See the
[backend README](../ac-hud-backend/README.md) for launcher, tray, shutdown,
and collector details.

## Branding assets

- `public/logo.png` is used by the web home screen.
- `public/favicon.ico` is used as the browser/PWA favicon.
- The source copies of the desktop assets are maintained in
  [`ac-hud-backend/assets`](../ac-hud-backend/assets).

The home screen also provides Ko-fi and Trakteer support links.

## Troubleshooting

### Port Vite berpindah ke 5175

Another process is already using `5174`. Stop the old Vite process with
`Ctrl+C`, then run:

```powershell
npm run dev
```

To inspect processes using the ports:

```powershell
netstat -ano | Select-String ':5174|:5175|:3001'
```

### Profile cannot load and shows `Unexpected token '<'`

The frontend received Vite HTML where it expected JSON. Check that:

1. `npm run server` is running.
2. Only one Node server is using port `3001`.
3. The URL uses the active Vite port.
4. Perform a hard refresh after restarting Vite.

Tes API langsung:

```powershell
Invoke-WebRequest http://localhost:3001/configs -UseBasicParsing
```

### SSE is not realtime

Pastikan:

1. Restart the server after SSE changes.
2. Reopen `/display` to create a new `/telemetry/events` connection.
3. DevTools Network shows `telemetry/events` as `pending`.
4. No two Node processes are competing for port `3001`.

### Phone access fails

Make sure Vite uses an open host and the laptop/phone are on the same network.
Use the laptop Wi-Fi IPv4 address, not `localhost` from the phone:

```text
http://10.169.143.2:5174
```

Windows Firewall may block incoming connections on ports `5174` or `3001`.

## Batasan prototype saat ini

- Direct Assetto Corsa/ACC telemetry integration is provided by the companion backend, not this frontend repository.
- `capture.json` remains the dummy baseline.
- Live test telemetry is stored in server memory and resets when the server restarts.
- Authentication and multi-user profiles are not implemented.
- The editor currently starts from the existing example profile.
- The service worker is basic and is not a complete offline-first strategy.
- dataKey values are not strictly validated against a telemetry registry; missing values render as `NA`.
