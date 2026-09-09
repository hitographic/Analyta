# RIWAYAT PROJECT — transfer konteks chat ke folder ANALYTA

Dokumen ini merangkum SELURUH riwayat pengerjaan (3 fase) agar sesi AI berikutnya
langsung paham tanpa membaca ulang chat. Status: semua fase selesai; app sudah di-push ke GitHub.

Tanggal rangkuman: 9 September 2026. Model: Muse Spark 1.3.

---

## FASE 1 — Gabung data monitoring RM 2021–2025 (Excel)

**Sumber:** `/INDOFOOD/DOCUMENT CONTROL/REKAP/RM/Rekap Monitoring Analisa RM {2021..2026}.xlsx`
(sheet `Monitoring`; 2026: `Monitoring RM`) + `Contoh.xlsx` (sheet `Revisi Satuan Data Siap Pivot`).

**Temuan kunci dari `Contoh.xlsx`:**
- Contoh = data **2021** yang di-unpivot (529 baris = tepat jumlah sel bulan terisi 2021).
- Contoh diurut **Bulan (Jan→Des) lalu No** (tertib kalender, bukan urutan baris sumber).
- Contoh dibuat dari Google Sheets (`Breakdown Data` + rumus `REGEXEXTRACT`):
  - `Nilai Standard` = angka pertama dari teks standar (range `a - b` dipertahankan).
  - `Nilai Hasil` = angka pertama dari sel bulan; `Keterangan` = sisa teks **setelah SEMUA angka dibuang global**
    (`REGEXREPLACE` global — inilah sebab `85.6 mg/100g` jadi `mg/g` di Contoh!).
  - Desimal Contoh campur (standar koma `4,0`, hasil titik `96.70`).

**Aturan ETL yang dipakai (user: desimal TITIK karena Excel MacBook):**
1. Unpivot wide→long: tiap sel bulan terisi = 1 baris; sel kosong dilewati.
2. Forward-fill `No/RM/Supplier`; `Cakra Kembar`+`Orange` (terpisah 2 baris) digabung → `Cakra Kembar Orange`.
3. `Jenis Analisa` HANYA dari header kolom D yang mengandung `:` (`Kimia:`, `Cemaran Logam:`, …).
   Header tanpa `:` (cth `Cemaran logam`, `Mikrobiologi`) **diabaikan** (jenis ikut sebelumnya) — persis perilaku Contoh.
4. Standar dipecah `Kriteria|Nilai|Satuan` via regex angka pertama/range.
5. Sel numerik berformat `%` dikali 100 (0.967→96.70, desimal ikut format `0.00%`→2 digit, `0.000%`→3 digit).
6. SEMUA koma desimal antar-digit → titik (termasuk di nama parameter `6,25`→`6.25`).
7. Sel multi-nilai 2025 (6 sel Feb, cth `6,9 x 10^3, 1,0 x 10^4, … col/g`) dipecah per nilai (unit fallback dari bagian terakhir) → total 3738+16 = **3754 baris**.
8. Sortir: `Tahun → Bulan (kalender) → No`.
9. Tambah kolom `Tahun` dari nama file.

**Perbedaan disengaja vs Contoh (lebih akurat, didokumentasikan):**
- `Nilai_std` titik (Contoh koma).
- Keterangan pertahankan `mg/100g` (Contoh `mg/g` karena buang global `100`).
- Glycidol `mcg/kg` dipertahankan (Contoh `ppb`; setara 1:1, konsisten dengan logam `mg/kg` vs `ppm`).
- Supplier kosong → `x` (No31 M504950: kami `x`, Contoh ffill `PT Damai Sukses M` — cek manual, kemungkinan memang supplier itu).
- Param `-` (nama pestisida hilang) tetap jadi baris `-`.

**Output fase 1:** `REKAP/RM/Gabungan Rekap Monitoring Analisa RM 2021-2025.xlsx` (values-only, 3754 baris).

---

## FASE 2 — Workbook rumus + Standar master 2026

**Keputusan:** standar 2021–2025 memakai **master 2026** (paling lengkap). Contoh user:
`M 308502 | Kimia | Kemurnian / Total Warna` → `Min. 87 %` dari 2026.

**Desain (hybrid, disepakati user):** sheet `DATA` = unpivot sebagai NILAI (stabil);
sheet `Data Siap Pivot` = **100% rumus** (mirror DATA + `XLOOKUP` standar + parsing/konversi mikro);
sheet `Standar` khusus master. Unpivot murni via rumus sel ditolak (rapuh: merge + struktur beda tiap tahun).

**Standar 2026:** 926 baris param → 696 kunci base `rm|jenis|param` (lower, spasi tunggal)
→ 691 baris master (param `-` dikeluarkan, ambigu 0.2 vs 0.3).
Konflik tersisa 3 (dicatat di kolom Catatan, dipakai mayoritas/terketat):
`M 304702 Ethylene Oxide` (0.01 vs 0.02 → 0.01), `Total Etillena Oksida` (0.02 vs None → 0.02),
`Olein Cd` (0.1 vs 40 → 0.1, 40 kemungkinan typo Sn).

**Parsing standar (kolom I–M):** tipe `Min/Maks/Range/m/m+M/Kualitatif/Cek/NA` +
`Std_min/Std_max` (kimia) + `m_num/M_num` (mikro).
- Mikro `103`→1000 (pola `^10[0-9]$`); `1.0 x 104` tanpa `^` tetap →10000; dual
  `m = 102 kol/g, M = 104 kol/g` → 100/10000 + tipe `m/M` (3-class); `M = NA` → single;
  `Negatif` → kualitatif (angka `25g` pada `Negatif/25g` BUKAN batas!).
- Standar tanpa angka murni unit (`CFU/100mL`) → tipe `Cek` (tanpa batas numerik).

**Kolom mikro di Data (jawaban pertanyaan user — TIDAK dipisah sheet):**
`Hasil_num` (`1.8 x 10^2`=180, wajib agar bisa dianalisis), `Hasil_log10` (hanya mikro & >0),
`m_num/M_num` (lookup), `Hasil_flag` (`Blm/Negatif/TTD/</''`), `Status`.
Logika Status: mikro numerik `m/M` → ≤m Memenuhi, ≤M Marginal, >M Tidak;
single m → ≤m Memenuhi; `<` tersensor → Memenuhi hanya bila limit≤m else Cek manual;
TTD/Negatif vs batas numerik → dianggap 0 (`Memenuhi (tak terdeteksi ≤m)`);
kimia `TTD + Min/Maks/Range` → `Memenuhi (tak terdeteksi) [CEK Min!]` — **LONGGAR untuk Min
(TTD=0<Min seperti Fe Min 50), filter `[CEK Min!]` dan konfirmasi ke lab!**;
SO2 `0 ppm` vs `Tidak boleh ada` → `Memenuhi (nol)`.

**Insiden kompatibilitas (PENTING):** v1 pakai `LET`+`XLOOKUP`+array `{0..9}` → di
Excel user (16.78 **LTSC 2021**, butuh 365) muncul *“problem with content / recover”* + banyak sel error.
XML file-nya sendiri valid (dicek: zip + parse XML + karakter ilegal = bersih).
**v2 ditulis ulang TANPA ketiganya**: `INDEX+MATCH` terbatas `$A$2:$A$692`,
kolom bantu tersembunyi **Y–AP** (rumus kecil `FIND/SEARCH/MID/NUMBERVALUE` tanpa array),
penanganan blank-vs-0 (`INDEX(...)&""="0"` → `""`, karena tidak ada ambang yang bernilai 0).
File: `REKAP/RM/Gabungan RM 2021-2025 (Rumus + Standar 2026) v2.xlsx` (3755×42).
Aturan: jangan kembalikan `LET`/`XLOOKUP`/konstanta array ke file itu.

---

## FASE 3 — App ANALYTA (repo ini)

**Tujuan:** input hasil analisa (web) → database Google Sheet → export Excel+PDF
**persis layout** `PDQC-018 (LHA Monitoring RM-FG).xlsx` (sheet `Layout` acuan piksel,
sheet `Work Instruction` = aturan isi poin 1–15).

**Spec Layout yang diekstrak** (`frontend/src/data/layoutSpec.js`, dari `tools/seed/layout_spec.json`):
- Kolom A 5.66, B–T 13.0, U 9.16, V–AA 13.0; tinggi baris s.d. R73 (judul 21, info 18, tabel 18).
- Merge: `A2:J2, A3:J3, C18:H18, I18:M18, N18:S18`.
- Font SEMUA Times New Roman 11 (judul 14 bold, kop 12 bold); vertikal center.
- Border: header R18 atas thin + bawah **medium**, vertikal di B,C,I,N + kanan H,M,S;
  body R19–R36 bawah thin + vertikal kiri B,C,I (kolom HASIL N–S tanpa vertikal — persis template).
- 18 slot baris data (R19–R36); bila parameter >18, export menyisip baris + menggeser footer.
- Info H11:H16, No di A8 (`No.  :  …`), Kesimpulan C38, tanggal B42, tanda tangan R43/R49.
- WI: teks statis + formula live `=Layout!A2`, `=Layout!A3`, `=Layout!O3`, `=Layout!O4`, `=Layout!A7`.
- Kertas A4 portrait (paperSize 9), margin L0.39/R0.20/T0.59/B0.39.

**Arsitektur (disepakati: `code.gs` + Vite React):**
- `appsscript/code.gs`: `doGet` (sajikan Html `Index`), `setupSheets()` (sekali),
  `apiGetStandar/apiGetParams/apiGetJenisRM/apiSaveLHA/apiListLHA/apiGetLHA`.
  Tab: `Standar | LHA | LHA_Detail | Counter` (skema: `sheet-schema.md`).
- `frontend/`: `gas.js` (`callGas` + mock lokal `?mock=1`), `lib/lha.js`
  (cerminan aturan v2: `extractNumber/hasilToNum/microStdToNum/flagOf/evalStatus/kesimpulanOf`),
  `LhaForm` (autofill standar per Jenis RM, status+kesimpulan otomatis),
  `ResultsList`, `LhaPrint` (PDF via dialog Print, CSS A4 portrait),
  `lib/exportExcel.js` (ExcelJS replika Layout+WI).
- Build single-file (`vite-plugin-singlefile`) → tempel ke Apps Script sebagai `Index`.
- ID: Sheet `1DhvAd6qLGVKAI9f6NEa59HbM8yn3PiC-nNxh0aTIAfA`, Folder `1i2W5pdHQ0SMpkwQKP2LhcaKXOhsg2HJT`
  (sudah di `config.js` + `code.gs`).
- `tools/seed/standar.csv` = 691 baris master (Import → Replace ke tab Standar).

**Verifikasi yang SUDAH dilakukan:**
- `npm run build` lolos (dist 1,1 MB); `npm run test:export` OK.
- Hasil export dicek vs template via openpyxl: merge sama, teks statis sama,
  lebar/tinggi sama, font judul TNR14 bold, border header thin/medium, sheet WI + formula live ada.
- Repo `hitographic/Analyta` (kosong) → commit `74dd29c` (23 file) → push `main` sukses (auth `gh` hitographic).
- WebApp exec merespons HTTP 200 — TAPI saat dicek hanya ±5 KB (bukan frontend 1,1 MB),
  artinya `Index` di Apps Script BELUM ditempel hasil build → user wajib tempel ulang + update deployment.

**Yang BELUM / butuh user (butuh akun user, tidak bisa dilakukan AI):**
1. Tempel `frontend/dist/index.html` sebagai `Index` + update deployment WebApp.
2. Pastikan `standar.csv` sudah di-import ke tab Standar (user baru menjalankan `setupSheets()`).
3. Konfirmasi lab untuk kasus `[CEK Min!]` (TTD vs standar Min).
4. Perbaiki nama parameter `-` (Residu pestisida) di sumber bila dipakai lookup.
5. Cek manual No31 M504950 (supplier `x` vs kemungkinan `PT Damai Sukses M`).

**Riwayat file di luar repo (jangan dihapus):**
- `REKAP/RM/Gabungan Rekap Monitoring Analisa RM 2021-2025.xlsx` (values-only fase 1)
- `REKAP/RM/Gabungan RM 2021-2025 (Rumus + Standar 2026).xlsx` (v1, rusak di LTSC — arsip)
- `REKAP/RM/Gabungan RM 2021-2025 (Rumus + Standar 2026) v2.xlsx` (v2 kompatibel — referensi aktif)
- `PROJECT/24. Analyta/PDQC-018 (LHA Monitoring RM-FG).xlsx` (template sakral export)
