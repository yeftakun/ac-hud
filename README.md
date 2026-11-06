# AC HUD Prototype

Prototype HUD untuk Assetto Corsa/ACC berbasis React dan TypeScript. Saat ini proyek sudah mencakup editor layout desktop, display HUD, halaman kontrol telemetry dummy, penyimpanan profile berbasis JSON, PWA dasar, serta sinkronisasi telemetry realtime melalui Server-Sent Events (SSE).

## Persyaratan

- Node.js 20 atau lebih baru
- npm
- Browser modern yang mendukung ES modules dan EventSource
- Untuk akses dari HP: laptop dan HP berada di jaringan Wi-Fi yang sama

## Instalasi

```powershell
npm install
```

## Menjalankan prototype

Jalankan server konfigurasi dan telemetry di satu terminal:

```powershell
npm run server
```

Server berjalan di:

```text
http://localhost:3001
```

Jalankan Vite di terminal kedua:

```powershell
npm run dev
```

Konfigurasi Vite project menggunakan port `5174` dan host `0.0.0.0`. Akses dari laptop:

```text
http://localhost:5174
```

Akses dari HP menggunakan alamat IPv4 laptop, misalnya:

```text
http://10.169.143.2:5174
```

Jika port `5174` benar-benar sudah digunakan proses lain, Vite dapat berjalan di port lain seperti `5175`. Gunakan URL port yang tertulis pada output terminal. Jangan menjalankan `npm run dev` dan `npx vite` bersamaan karena keduanya membuat dua instance Vite berbeda.

## Halaman utama

| URL | Fungsi |
| --- | --- |
| `/` | Home/dashboard sederhana |
| `/editor` | Editor layout dan properti profile |
| `/display` | Display HUD final |
| `/data` | Kontrol telemetry dummy untuk pengujian |

Contoh akses dari HP jika Vite berjalan di port `5175`:

```text
http://10.169.143.2:5175/data
http://10.169.143.2:5175/display
```

Gunakan host dan port yang sama untuk halaman `/data` dan `/display` jika ingin mengandalkan komunikasi browser lokal. Sinkronisasi antar-device menggunakan server telemetry pada port `3001`.

## Arsitektur singkat

```text
React/Vite frontend
  ├─ /editor  -> GET/PUT /configs/:id
  ├─ /display -> GET /configs/:id + SSE /telemetry/events
  └─ /data    -> PUT /telemetry

Node config server
  ├─ server/data/profiles.json
  ├─ GET/POST/PUT /configs
  ├─ GET /telemetry
  ├─ PUT /telemetry
  └─ GET /telemetry/events
```

### Telemetry

Telemetry dummy berada di [`public/capture.json`](public/capture.json). Key menggunakan flat dot-notation, bukan object nested, contohnya:

```json
{
  "rpm": 4500,
  "lap.best": 98.456,
  "engine.oilTemp": 102,
  "tyres.FL.psi": 27.4,
  "abs.active": false
}
```

Semua pembacaan telemetry frontend melewati [`src/hooks/useTelemetry.ts`](src/hooks/useTelemetry.ts). Implementasinya menggunakan Zustand di [`src/lib/telemetryStore.ts`](src/lib/telemetryStore.ts).

Halaman `/data` mengubah nilai melalui `PUT /telemetry`. Server kemudian melakukan broadcast ke semua display melalui SSE. Endpoint SSE bersifat koneksi yang terus terbuka; status `pending` di DevTools adalah normal.

Telemetry server disimpan di memori. Saat server direstart, nilai kembali mengambil baseline dari `public/capture.json`.

## Profile dan Config API

Profile tersimpan di [`server/data/profiles.json`](server/data/profiles.json). Profile contoh saat ini adalah `profile_001`.

Endpoint yang tersedia:

```text
GET  /configs
GET  /configs/:id
POST /configs
PUT  /configs/:id
```

Contoh:

```powershell
Invoke-WebRequest http://localhost:3001/configs -UseBasicParsing
Invoke-WebRequest http://localhost:3001/configs/profile_001 -UseBasicParsing
```

Schema profile memuat identitas profile, canvas, serta array `widgets`. Setiap widget minimal memiliki:

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

## Fitur editor

Halaman `/editor` saat ini mendukung:

- Canvas 960×540 dengan fit-to-area.
- Edit posisi dan ukuran widget menggunakan `react-moveable`.
- Global properties: nama profile, ukuran canvas, background canvas, dan font.
- Widget properties: label, dataKey, warna, ukuran value, serta z-index.
- Add Widget dan Delete Widget.
- Import/export layout JSON.
- Save profile melalui `PUT /configs/:id`.
- Undo/redo dengan tombol atau shortcut:
  - `Ctrl+Z`: undo
  - `Ctrl+Y`: redo
  - `Ctrl+Shift+Z`: redo alternatif
- Dukungan font dari `public/fonts`.

Perubahan editor baru permanen setelah tombol `Save` ditekan.

## Widget yang tersedia

Widget saat ini berada di [`src/components/widgets`](src/components/widgets):

- `stat-box`
- `stat-group`
- `raw-value`
- `drs`
- `rpm-bar`
- `activation-lights`
- `tyres`
- `overlay-event`

`WidgetRenderer` menangani pemilihan komponen berdasarkan `widget.type`. Widget yang tidak dikenal dirender sebagai placeholder agar profile tidak crash.

`overlay-event` dirender pada layer terpisah di atas widget biasa. Widget ini mendukung trigger telemetry, coverage partial/full, fade transition, dan auto-dismiss.

## PWA dan display mode

Display memakai:

- `public/manifest.json`
- Service worker dasar di `public/sw.js`
- Wake Lock API selama halaman display aktif
- Fullscreen browser melalui tombol Fullscreen

Saat fullscreen aktif, tombol Fullscreen disembunyikan. Tombol muncul kembali setelah fullscreen ditutup.

Untuk pengujian PWA di HP, gunakan `localhost` atau HTTPS. Akses LAN melalui HTTP biasa dapat dipakai untuk pengujian display, tetapi beberapa fitur browser seperti Wake Lock atau instalasi PWA dapat memiliki batasan keamanan.

## Build dan preview production

Validasi TypeScript dan build frontend:

```powershell
npm run build
```

Menjalankan hasil build dengan Vite preview:

```powershell
npm run preview
```

Perlu diperhatikan bahwa `npm run preview` hanya melayani hasil build frontend. Config/telemetry server tetap perlu dijalankan terpisah dengan `npm run server`.

## Troubleshooting

### Port Vite berpindah ke 5175

Artinya ada proses lain yang sudah memakai `5174`. Hentikan proses Vite lama dengan `Ctrl+C`, lalu jalankan kembali:

```powershell
npm run dev
```

Untuk memeriksa proses yang memakai port:

```powershell
netstat -ano | Select-String ':5174|:5175|:3001'
```

### Profile tidak dapat dimuat dan muncul `Unexpected token '<'`

Frontend menerima HTML Vite ketika seharusnya menerima JSON. Pastikan:

1. `npm run server` sedang berjalan.
2. Hanya ada satu server Node di port `3001`.
3. URL yang dibuka sesuai dengan port Vite yang aktif.
4. Lakukan hard refresh setelah mengganti proses Vite.

Tes API langsung:

```powershell
Invoke-WebRequest http://localhost:3001/configs -UseBasicParsing
```

### SSE tidak realtime

Pastikan:

1. Server sudah direstart setelah perubahan SSE.
2. Halaman `/display` dibuka ulang agar membuat koneksi `/telemetry/events` baru.
3. DevTools Network menunjukkan request `telemetry/events` berstatus `pending`.
4. Tidak ada dua proses Node yang berebut port `3001`.

### Akses HP gagal

Pastikan Vite memakai host terbuka dan laptop/HP berada pada jaringan yang sama. Gunakan IPv4 Wi-Fi laptop, bukan `localhost` dari HP:

```text
http://10.169.143.2:5174
```

Firewall Windows juga dapat memblokir koneksi masuk pada port `5174` atau `3001`.

## Batasan prototype saat ini

- Belum ada integrasi telemetry langsung dengan Assetto Corsa atau ACC.
- `capture.json` masih menjadi baseline dummy.
- Telemetry live test disimpan di memori server dan reset saat server restart.
- Belum ada autentikasi atau multi-user profile.
- Profile editor masih memakai alur profile contoh yang sudah tersedia.
- Service worker masih sederhana dan belum menjadi strategi offline-first lengkap.
- Belum ada validasi dataKey terhadap daftar telemetry secara ketat; nilai yang tidak ditemukan ditampilkan sebagai `NA`.
