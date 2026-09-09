# ANALYTA — App Input Hasil Analisa QC (RM/FG)

WebApp untuk input hasil analisa Lab QC Indofood: form LHA PDQC-018 → simpan ke Google Sheets → export **Excel & PDF persis layout template**.

- Database: Google Sheet [`1DhvAd6qLGVKAI9f6NEa59HbM8yn3PiC-nNxh0aTIAfA`](https://docs.google.com/spreadsheets/d/1DhvAd6qLGVKAI9f6NEa59HbM8yn3PiC-nNxh0aTIAfA/edit) (tab `Standar`, `LHA`, `LHA_Detail`, `Counter` — lihat `sheet-schema.md`)
- File export: Google Drive [`Analyta folder`](https://drive.google.com/drive/folders/1i2W5pdHQ0SMpkwQKP2LhcaKXOhsg2HJT)
- Repo: [`hitographic/Analyta`](https://github.com/hitographic/Analyta) (source code di sini; jalankan/push dari folder ini)
- Referensi data & aturan penilaian: `Gabungan RM 2021-2025 (Rumus + Standar 2026) v2.xlsx`
- Layout export: `PDQC-018  (LHA Monitoring RM-FG).xlsx`, sheet **Layout** (acuan piksel) + **Work Instruction** (aturan isi 1–15)

## Struktur

```
ANALYTA/
├── frontend/            # React + Vite (single-file build untuk Apps Script)
│   └── src/
│       ├── components/  # LhaForm.jsx (input), ResultsList.jsx, LhaPrint.jsx (PDF)
│       ├── lib/         # lha.js (penilaian Min/Maks/m/M), exportExcel.js (ExcelJS)
│       └── data/        # layoutSpec.js (ekstrak 1:1 dari PDQC-018)
├── appsscript/
│   ├── code.gs          # backend: doGet + apiGetStandar/Params/SaveLHA/ListLHA/GetLHA + setupSheets()
│   └── appsscript.json  # manifest (timezone Asia/Jakarta, scope Sheets+Drive)
└── tools/seed/          # standar.csv (691 baris master 2026) + layout_spec.json
```

## Cara pakai via link github (simpan ke Sheet)

1. Di editor Apps Script jalankan `setupToken()` sekali → salin kunci dari log.
2. Deploy > Manage deployments → New version (exec URL tetap sama).
3. Buka `https://hitographic.github.io/Analyta` → ⚙ Pengaturan → tempel URL `/exec` + kunci → Simpan & Tes.
4. Input seperti biasa — tersimpan ke tab `LHA`/`LHA_Detail`. Tanpa pengaturan = mode demo (latihan, hilang saat refresh).

## Cara jalan lokal (coba form tanpa Apps Script)

```bash
cd frontend && npm install && npm run dev
# buka http://localhost:5173 — otomatis MODE MOCK (data contoh, tidak menyentuh Sheet asli)
```

## Deploy sebagai WebApp (produksi)

1. `cd frontend && npm install && npm run build` → hasilkan `frontend/dist/index.html` (satu file).
2. Buat project Apps Script baru (atau `clasp`), lalu:
   - Tempel isi `appsscript/code.gs` sebagai `Code.gs`, `appsscript.json` sebagai manifest.
   - Buat file HTML baru bernama `Index`, tempel **seluruh isi** `frontend/dist/index.html`.
3. Di editor Apps Script jalankan `setupSheets()` sekali (otorisasi Sheets+Drive).
4. Import master standar: buka Sheet → tab `Standar` → File > Import > upload `tools/seed/standar.csv` → *Replace current sheet*.
5. Deploy > New deployment > Web app > *Execute as: Me* > akses sesuai kebutuhan → dapat URL WebApp.
6. Push source ke GitHub: `git init && git add . && git commit -m "Analyta init" && git branch -M main && git remote add origin https://github.com/hitographic/Analyta.git && git push -u origin main`.

## Alur pakai (sesuai Work Instruction poin 1–15)

Input Baru → isi header (No. analisa running number, Jenis RM untuk autofill parameter+standar) → tambah baris parameter → isi Hasil (status & kesimpulan otomatis: Diterima/Ditolak/Belum lengkap) → **Simpan & Cetak PDF** (tampilan A4 persis Layout → dialog Print → Save as PDF) atau **Simpan & Export Excel** (`.xlsx` 2 sheet: Layout terisi + Work Instruction dengan formula live `=Layout!A2` dkk., siap diarsip ke Drive).

## Verifikasi yang sudah dilakukan

- `npm run build` lolos.
- `npm run test:export` membuat LHA contoh → cek merge/nilai/sheet dengan `openpyxl` (lihat `frontend/test/export.test.js`).
