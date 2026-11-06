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

**Hidden overlay** (kondisional, menimpa tampilan utama saat trigger aktif — widget `overlay-event`, skema di §5.3):
- Pit limiter (sudah ada `dataKey`: `pit.active`), flag indicator, setup change notification, dll. (daftar lengkap di luar pit limiter masih open — lihat §9)

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

**`overlay-event`** — hidden overlay (pit limiter, flag, notifikasi setup change, dll.), pakai envelope §5.2 yang sama, cuma visibility-nya data-driven
```json
{
  "id": "ov_pit_limiter",
  "type": "overlay-event",
  "x": 0, "y": 400, "w": 960, "h": 140,
  "zIndex": 100,
  "style": { "boxBg": "rgba(0,0,0,0.85)", "valueColor": "#ffd400" },
  "payload": {
    "triggerKey": "pit.active",
    "triggerWhen": true,
    "label": "PIT LIMITER",
    "coverage": "partial",
    "persistWhileActive": true,
    "autoDismissMs": null,
    "transition": "fade",
    "transitionMs": 250
  }
}
```
- `triggerKey` + `triggerWhen`: dataKey (boolean) dan nilai yang dianggap "aktif" — overlay cuma dirender saat kondisi ini terpenuhi, selain itu tidak ada di DOM sama sekali (bukan sekadar disembunyikan via CSS).
- `coverage`: `"full"` (menimpa seluruh canvas 960×540, `x/y/w/h` diabaikan) atau `"partial"` (cuma area `x/y/w/h` milik widget ini sendiri).
- `persistWhileActive`: `true` → overlay tampil selama `triggerKey` masih `triggerWhen`, hilang begitu kondisinya berubah (cocok untuk status seperti PIT LIMITER atau flag). `false` → overlay muncul sekali lalu auto-dismiss setelah `autoDismissMs`, walau `triggerKey` masih aktif (cocok untuk notifikasi toast seperti perubahan setup).
- `transition` / `transitionMs`: fade in/out saat overlay muncul/hilang.
- **Prioritas antar overlay yang aktif bersamaan**: pakai `zIndex` yang sudah ada di envelope §5.2 — tidak perlu field baru, konsisten dengan widget lain. Overlay dengan `zIndex` lebih tinggi dirender di atas.
- Daftar event di luar PIT LIMITER (flag, setup change notif, dll.) masih open — lihat §9.

### 5.4 Prinsip Kontrak Config

- `dataKey` pakai dot-notation flat (`"engine.oilTemp"`) → resolve tinggal `telemetry[dataKey]`, tanpa path parser.
- File config yang disimpan dari desktop dan dibaca HP adalah **file yang sama persis** — tidak ada compile step, WYSIWYG penuh.

## 6. Desktop Editor Mode

- Tiap widget adalah komponen dengan prop `mode: "edit" | "display"`.
- Mode `edit`: tampilkan handle drag (`react-moveable`) + resize handle, panel properti (warna box/border/label/value, pilih `dataKey` untuk binding).
- Simpan via `POST /configs` (profile baru) atau `PUT /configs/:id` (update) ke config API.

### 6.1 Widget CRUD (Tambah/Hapus)

Ini bagian dari requirement awal ("informasi bisa ditambah/dikurangi") yang sempat di-skip di Prompt 6 (MVP1 baru bisa edit widget yang sudah ada).

- **Tambah widget**: tombol "Add Widget" → picker pilih `type` (stat-box, stat-group, raw-value, drs, rpm-bar, activation-lights, tyres, overlay-event) dan `dataKey` awal. Widget baru masuk ke canvas dengan `x,y,w,h` default (posisi aman yang gak nimpa widget lain — mis. selalu taruh di titik tengah-atas canvas yang masih kosong, atau sekadar offset dari widget terakhir ditambahkan) dan style default dari §5.2.
- **Hapus widget**: pilih widget → tombol "Delete" (atau tombol `Delete` keyboard) → hilang dari array `widgets` di state lokal, baru permanen setelah "Save".
- Validasi dasar: gak boleh dua widget punya `id` sama (generate `id` otomatis, bukan user-input).

## 7. HP Display Mode

- Komponen sama, `mode: "display"` → render read-only, binding ke data WebSocket live via `dataKey`.
- Widget `overlay-event` dirender di atas (pakai `zIndex` tinggi) hanya saat `triggerKey`-nya aktif — lihat §5.3.
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

8. Bugfix seed (Prompt 8-9, sudah selesai): lengkapi 1 widget per type, perbaiki `activation-lights` resolve dari `dataKey` khusus

**Penyempurnaan Frontend (lanjutan MVP1, sebelum backend masuk):**
9. Lengkapi seed `profile_001` — 1 widget per field `capture.json` yang masih kosong (gear, delta, lap.counter/last/est, position, fuel, abs, tc, bb)
10. Widget CRUD di editor (§6.1) — tambah/hapus widget dari canvas
11. Implementasi `overlay-event` (§5.3) — renderer overlay yang nimpa canvas, mulai dari PIT LIMITER (`dataKey` sudah ada: `pit.active`)

**Final (backend masuk):**
12. Capture layer → WebSocket server
13. Ganti provider di balik `useTelemetry()` dari `capture.json` ke WebSocket — widget tidak berubah

## 9. Open Items / Belum Diputuskan

- **Daftar lengkap event hidden overlay** di luar PIT LIMITER (flag, setup change notif, dll.) belum di-final-kan item per item — skema `overlay-event`-nya sendiri sudah general, tinggal nambah instance baru begitu event-nya diputuskan.
- Threshold suhu ban di §5.3 masih contoh, perlu disesuaikan ke compound ban yang dipakai.