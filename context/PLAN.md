# PLAN.md — AC Telemetry HUD (Web)

## 1. Ringkasan Proyek

Frontend web HUD telemetry untuk Assetto Corsa, terhubung ke backend yang menangkap info session dari game. Berbeda dari proyek `onboard-overlay-24hnurb` (broadcast overlay AC Python App) — proyek ini adalah **telemetry dashboard** yang dirender di browser HP (landscape) dan dikustomisasi lewat editor desktop, dengan konsep drag-and-drop/resize mirip base builder (Clash of Clans style).

Dua mode dari satu codebase komponen:
- **Desktop (editor/master)** — susun layout, atur posisi, ukuran, dan warna tiap widget. Hasilnya disimpan sebagai profile/config.
- **HP (display)** — pilih profile yang sudah disimpan, render read-only, fullscreen, landscape.

## 2. Arsitektur

```
Assetto Corsa (Shared Memory / UDP)
        |
        v
  Capture Layer (proses lokal)
        |
        v
  WebSocket Server  <-- push telemetry real-time -->  Desktop Editor (browser)
        |                                                    |
        |                                              (save config)
        v                                                    v
  REST API (config/profile) <------------------------ Config Storage
        ^                                              (SQLite / JSON file)
        |
   HP Display (browser, PWA)
   (GET config → render sesuai profile aktif)
```

- **Capture layer**: proses lokal baca shared memory/UDP AC, jadi satu-satunya sumber data mentah.
- **Transport telemetry**: WebSocket, bukan REST polling — data seperti speed/RPM/gear berubah puluhan kali/detik, HTTP polling terlalu berat & delay.
- **Config/persistence**: REST API + storage ringan (SQLite atau flat JSON file, cukup untuk skala personal use) khusus untuk layout/profile, terpisah dari jalur data telemetry live.

### 2.1 MVP1 — Belum Ada Backend

Capture layer & WebSocket server di atas belum dibangun di MVP1. Sumber data telemetry sementara ditampung di **`capture.json`** (dummy values), dibaca langsung oleh frontend.

Supaya transisi ke WebSocket nanti gak perlu nyentuh widget sama sekali, data wajib diakses lewat satu layer abstraksi (mis. hook `useTelemetry()` / context) sebagai satu-satunya titik baca `telemetry` object — bukan tiap widget `fetch` `capture.json` sendiri-sendiri. Widget tetap resolve data lewat `dataKey` ke object yang sama persis; yang beda cuma provider di belakang hook itu:

| Fase | Provider di balik `useTelemetry()` |
|---|---|
| MVP1 | load/poll `capture.json` |
| Final | subscribe WebSocket Server |

`capture.json` perlu field boolean terpisah untuk status aktif (`abs.active`, `tc.active`, `pit.active`) di luar field nilai level (`abs`, `tc`) — lihat payload `activation-lights` di §5.3.

## 3. Tech Stack

| Layer | Pilihan | Alasan |
|---|---|---|
| Capture | (mengikuti proyek capture yang sudah ada) | baca shared memory/UDP AC |
| Data source (MVP1) | `capture.json` (dummy values), dibaca via `useTelemetry()` | belum ada backend, tapi widget tetap resolve lewat `dataKey` yang sama |
| Realtime transport (Final) | WebSocket (`ws`/`socket.io` atau FastAPI `websockets`) | push, bukan polling |
| Config API | REST, storage SQLite/JSON | ringan, cukup untuk personal use |
| Frontend framework | React + TypeScript (Vite) | ekosistem drag-drop paling lengkap |
| Drag & resize | `react-moveable` (+ `react-selecto` kalau perlu multi-select nanti) | free-positioning + resize handle, bukan grid-snap kaku |
| State management | Zustand | ringan, cocok pisahin state layout/config vs state telemetry live |
| Styling/theming | Tailwind (struktur) + CSS custom properties per-widget (warna dari config) | ganti warna tanpa rebuild CSS |
| HP display runtime | PWA (manifest + service worker) + Wake Lock API + orientation lock landscape | add-to-homescreen, fullscreen, layar gak sleep |

## 4. Klasifikasi Informasi

**Tampilan utama** (selalu ada, tanpa dekorasi — widget `raw-value`):
- Speed, Gear, RPM (4-5 digit), Delta (dengan tanda +/-)

**Tampilan pendukung** (pakai dekorasi kotak label — widget `stat-box` / `stat-group`):
- Lap counter, Best lap, Last lap, Est lap (punya varian short/long)
- Position
- Fuel
- ABS, TC, BB (nilai tertera)
- Oil temp, Oil pressure, Water temp, Water pressure (cluster dalam satu `stat-group`)
- Tyres (PSI besar + suhu kecil, widget khusus)

**Hidden overlay** (kondisional, menimpa tampilan utama saat trigger aktif — belum di-detail skema widget-nya, lihat §9 Open Items):
- Pit limiter, flag indicator, setup change notification, dll.

## 5. Widget System

### 5.1 Model Profile & Canvas

```json
{
  "schemaVersion": 1,
  "id": "profile_001",
  "name": "GT3 Endurance Layout",
  "canvas": { "w": 960, "h": 540 },
  "widgets": [ ]
}
```

### 5.2 Envelope Widget (berlaku untuk semua tipe)

```json
{
  "id": "w_best_lap",
  "type": "stat-box",
  "x": 120, "y": 40,
  "w": 180, "h": 70,
  "zIndex": 2,
  "style": {
    "boxBg": "#141820",
    "boxBorder": "#2a3340",
    "labelColor": "#a8b2c0",
    "valueColor": "#ffffff"
  },
  "payload": { }
}
```

### 5.3 Payload per Tipe

**`stat-box`** — lap counter, best/last/est lap, position, ABS, TC, BB, fuel
```json
{ "dataKey": "lap.best", "variant": "long", "label": "BEST LAP", "unit": null, "decimals": 3 }
```
- `variant: "short" | "long"` hanya dipakai sekali saat widget pertama ditambahkan (nentuin w/h default). Setelah itu w/h independen, resize manual, `variant` sudah tidak relevan dibaca ulang.

**`stat-group`** — cluster oil/water
```json
{
  "rows": [
    { "dataKey": "engine.oilTemp", "label": "OIL TEMP", "unit": "°C" },
    { "dataKey": "engine.oilPressure", "label": "OIL PRESS", "unit": "bar" },
    { "dataKey": "engine.waterTemp", "label": "WATER TEMP", "unit": "°C" },
    { "dataKey": "engine.waterPressure", "label": "WATER PRESS", "unit": "bar" }
  ]
}
```

**`raw-value`** — RPM, speed, gear, delta (tanpa dekorasi)
```json
{ "dataKey": "delta", "showSign": true, "decimals": 3, "suffix": null, "fontSize": 48, "color": "#ffffff" }
```

**`drs`** — kotak DRS, menyala hijau saat aktif
```json
{ "dataKey": "drs.active", "activeColor": "#2ee66b", "inactiveColor": "#2a3340", "label": "DRS" }
```

**`rpm-bar`** — model lampu, fill style configurable
```json
{
  "dataKey": "rpm",
  "style": "lamp",
  "fillDirection": "edge-to-center",
  "segments": 16,
  "zones": [
    { "upTo": 0.6,  "color": "#2ee66b" },
    { "upTo": 0.85, "color": "#ffd400" },
    { "upTo": 1.0,  "color": "#ff3b30" }
  ]
}
```
- `fillDirection`: `"left-to-right"` atau `"edge-to-center"` (gaya Porsche) — default `"edge-to-center"`.
- `upTo` = persentase dari redline; redline diambil dari data mobil hasil capture, bukan di-hardcode per widget.

**`activation-lights`** — 4 lampu vertikal yang menyala bersama
```json
{
  "lampCount": 4,
  "priority": ["pit", "abs", "tc"],
  "states": {
    "pit": { "dataKey": "pit.active", "color": "#ffd400", "blink": true, "blinkMs": 400 },
    "abs": { "dataKey": "abs.active", "color": "#ff3b30", "blink": false },
    "tc":  { "dataKey": "tc.active",  "color": "#a855f7", "blink": false }
  }
}
```
- `dataKey` tiap state **wajib** menunjuk ke field boolean khusus "aktif" (`abs.active`, `tc.active`, `pit.active`), BUKAN ke field nilai level (`abs`, `tc` — itu angka level untuk widget lain, bukan indikator aktif/nonaktif).
- Keempat lampu selalu menyala warna yang sama (bukan 4 kondisi berbeda per lampu).
- `priority` nentuin warna yang menang kalau >1 kondisi aktif bareng (mis. ABS + PIT aktif bersamaan saat masuk pit lane dengan rem keras).
- PIT pakai CSS `@keyframes blink`, bukan JS interval — lebih ringan.

**`tyres`** — mengikuti dekorasi gambar referensi (kotak 2×2, label "TYRES" di atas, PSI besar + suhu kecil di tiap kuadran)
```json
{
  "positions": ["FL", "FR", "RL", "RR"],
  "dataKeys": {
    "FL": { "psi": "tyres.FL.psi", "temp": "tyres.FL.temp" },
    "FR": { "psi": "tyres.FR.psi", "temp": "tyres.FR.temp" },
    "RL": { "psi": "tyres.RL.psi", "temp": "tyres.RL.temp" },
    "RR": { "psi": "tyres.RR.psi", "temp": "tyres.RR.temp" }
  },
  "tempThresholds": { "cold": 70, "optimal": 95, "hot": 110 }
}
```
- Background tiap kuadran dihitung on-the-fly dari suhu vs threshold: di bawah `cold` = biru, `cold`–`optimal` = hijau, `optimal`–`hot` = kuning, di atas `hot` = merah (overheat). Logic di komponen, bukan style statis dari config.
- Angka threshold di atas contoh — disesuaikan lagi per compound ban nanti.

### 5.4 Prinsip Kontrak Config

- `dataKey` pakai dot-notation flat (`"engine.oilTemp"`) → resolve tinggal `telemetry[dataKey]`, tanpa path parser.
- File config yang disimpan dari desktop dan dibaca HP adalah **file yang sama persis** — tidak ada compile step, WYSIWYG penuh.

## 6. Desktop Editor Mode

- Tiap widget adalah komponen dengan prop `mode: "edit" | "display"`.
- Mode `edit`: tampilkan handle drag (`react-moveable`) + resize handle, panel properti (warna box/border/label/value, pilih `dataKey` untuk binding).
- Simpan via `POST /configs` ke config API.

## 7. HP Display Mode

- Komponen sama, `mode: "display"` → render read-only, binding ke data WebSocket live via `dataKey`.
- Load config lewat `GET /configs/:id` (pilih profile aktif).
- PWA: manifest + service worker untuk Add to Home Screen, fullscreen tanpa address bar.
- Wake Lock API supaya layar tidak auto-sleep saat dipasang di cockpit/rig.
- Orientation lock landscape dari manifest.

## 8. Build Order (usulan)

**MVP1 (tanpa backend):**
1. `capture.json` dummy + layer abstraksi `useTelemetry()` sebagai satu-satunya titik baca data
2. Config API + storage (CRUD profile, schema validasi dasar)
3. Komponen widget inti (`stat-box`, `raw-value`, `stat-group`) dalam mode `display` saja — render dari config statis dulu, belum drag-drop
4. Sambungkan `display` mode ke `useTelemetry()` (sumbernya `capture.json`)
5. Widget khusus (`drs`, `rpm-bar`, `activation-lights`, `tyres`) — logic state-driven masing-masing
6. Desktop editor: integrasikan `react-moveable`, panel properti, save ke config API
7. HP shell: PWA manifest, Wake Lock, orientation lock, pemilihan profile

**Final (backend masuk):**
8. Capture layer → WebSocket server
9. Ganti provider di balik `useTelemetry()` dari `capture.json` ke WebSocket — widget tidak berubah
10. Hidden overlay system (lihat Open Items)

## 9. Open Items / Belum Diputuskan

- **Hidden overlay**: sudah disepakati bentuknya *menimpa* tampilan utama (bukan slot statis terpisah), tapi skema widget untuk kategori ini (area yang ketutup, durasi/transisi per event, prioritas antar overlay) belum di-breakdown — perlu sesi terpisah.
- **Daftar lengkap event hidden overlay** (pit limiter, flag, setup change notif, dll.) belum di-final-kan item per item.
- Seed `profile_001` baru punya 1 widget representatif per type (hasil Prompt 8) — field lain di `capture.json` (gear, delta, lap.counter/last/est, position, fuel, abs, tc, bb) belum punya widget sendiri.
- Threshold suhu ban di §5.3 masih contoh, perlu disesuaikan ke compound ban yang dipakai.