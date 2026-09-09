# AGENTS.md — Instruksi untuk AI coding agent di repo ini

> Dibaca dulu sebelum mengubah apapun. Konteks lengkap ada di `docs/RIWAYAT-PROJECT.md`.
> Operasional lokal (URL WebApp dsb.) ada di `docs/LOCAL.md` (file lokal, TIDAK di-commit).

## Apa ini
**Analyta** — WebApp input hasil analisa QC Indofood (RM/FG), form LHA **PDQC-018**.
- Frontend: React + Vite (`frontend/`), build single-file untuk ditempel ke Apps Script.
- Backend: Google Apps Script (`appsscript/code.gs`), database = Google Sheet, arsip = Google Drive.
- Aturan penilaian hasil vs standar + konversi mikro mengikuti file referensi
  `Gabungan RM 2021-2025 (Rumus + Standar 2026) v2.xlsx` (ada di folder RM, BUKAN di repo ini).

## Perintah
```bash
cd frontend
npm install
npm run dev      # mode mock (?mock=1 otomatis bila tanpa Apps Script)
npm run build    # -> frontend/dist/index.html (satu file, tempel sebagai Html "Index" di Apps Script)
npm run test:export  # uji export Excel vs template PDQC-018
```

## Aturan keras
1. **Layout export = sakral.** Replika 1:1 sheet `Layout` PDQC-018 (teks spasi ganda, merge, lebar kolom, tinggi baris, Times New Roman, border thin/medium). Sumber kebenaran: `frontend/src/data/layoutSpec.js` (auto-generated, JANGAN EDIT MANUAL) + `tools/seed/layout_spec.json`. Verifikasi tiap ubah export: `npm run test:export` + cek openpyxl (merge/nilai/dimensi/font/border).
2. **Desimal pakai TITIK** di semua nilai (aturan user, Excel Mac). Di JS: konversi koma-desimal antar-digit (`/(?<=\d),(?=\d)/` → `.`). Di Excel/Sheet biarkan teks bertitik untuk display; kolom numerik untuk pivot.
3. **Hasil mengandung "negat" = kualitatif** (jangan pecah angkanya — `25g` pada `Negatif / 25 g` BUKAN hasil).
4. **Mikro wajib konversi numerik**: `a.b x 10^e` → angka; `103` → `10^3`=1000 (pola `^10[0-9]$`); `1.0 x 104` (tanpa `^`) → 10000; dual `m/M` = 3-class; `M=NA` = single; `Negatif` = kualitatif. Jangan pisah sheet mikro — satu tabel + kolom khusus (`Hasil_num`, `log10`, `m/M`, flag, Status).
5. **Standar dari master 2026**, kunci lookup BASE `rm|jenis|param` (lowercase, spasi tunggal, tanpa supplier). Param `-` (nama hilang) tidak ada di master → status `Cek Standar`.
6. **Jangan commit rahasia/URL operasional** (exec URL WebApp, token). Hanya di `docs/LOCAL.md` (gitignored).
   Pengecualian disengaja atas permintaan owner: `EXEC_URL`/`API_KEY` bawaan di `frontend/src/config.js`
   agar github.io auto-terhubung (risiko: tulis publik — putar via `setupToken()` bila disalahgunakan).
7. `dist/` dan `node_modules/` tidak di-commit. Setiap perubahan yang memengaruhi `dist/index.html` WAJIB ingatkan user untuk tempel ulang ke Apps Script + update deployment (file build ≠ source).

## Peta file penting
- `frontend/src/lib/lha.js` — `extractNumber`, `hasilToNum`, `microStdToNum`, `flagOf`, `evalStatus`, `kesimpulanOf`, `stdText`.
- `frontend/src/lib/exportExcel.js` — bangun workbook LHA via ExcelJS.
- `frontend/src/components/LhaPrint.jsx` + `styles.css` (`@media print`, A4 portrait) — export PDF.
- `frontend/src/gas.js` — `callGas()` 3 mode (gas/http-JSONP/mock) + kunci di localStorage (JANGAN hardcode exec URL/kunci di repo).
- `frontend/src/data/standarSeed.js` (auto-generated dari `tools/seed/standar.csv`, JANGAN EDIT MANUAL) — fallback 691 master bila Sheet kosong/demo.
- `appsscript/code.gs` — `doGet`, `setupSheets`, `apiGetStandar/Params/SaveLHA/ListLHA/GetLHA`.
- `sheet-schema.md`, `tools/seed/standar.csv` (691 baris master).
