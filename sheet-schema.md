# Skema Database — Google Sheet

Sheet ID: `1DhvAd6qLGVKAI9f6NEa59HbM8yn3PiC-nNxh0aTIAfA`
Dibuat otomatis via `setupSheets()` di `appsscript/code.gs` (jalankan sekali dari editor Apps Script).

## 1. Tab `Standar` (master batas, dari file referensi Standar 2026)
Diisi awal dengan `tools/seed/standar.csv` (691 baris dari Gabungan v2): **File > Import > Replace current sheet**.
| Kolom | Isi | Contoh |
|---|---|---|
| KeyBase | kunci lookup `rm|jenis|param` (lowercase, spasi tunggal, koma desimal→titik) | `m 308602|kimia|kadar air (karl fisher)` |
| Jenis RM | kode bahan | `M 308602` |
| Jenis Analisa | Kimia / Cemaran Logam / Mikrobiologi / Fisik | `Kimia` |
| Parameter | nama parameter | `Kadar air (Karl Fisher)` |
| Std_mentah_2026 | teks standar asli 2026 | `Maks. 0,5%` |
| Kriteria | Min. / Maks. / m = / … | `Maks.` |
| Nilai_std | angka standar **titik** (range pakai ` - `) | `0.5` |
| Satuan | satuan standar | `%` |
| Std_tipe | Min / Maks / Range / m / m+M / Kualitatif / Cek / NA | `Maks` |
| Std_min | angka batas bawah (kosong bila tidak ada) | |
| Std_max | angka batas atas | `0.5` |
| m_num | batas m mikro numerik (`103`→1000) | |
| M_num | batas M mikro numerik (kosong = NA/single) | |
| Catatan | konflik/flag (`Konflik di 2026…`, dsb.) | |

> Baris `Parameter = -` (nama pestisida hilang di sumber) **sengaja tidak masuk** Standar — tidak bisa di-lookup andal. Perbaiki nama parameternya di sumber bila dipakai.

## 2. Tab `LHA` (1 baris per laporan)
`ID | NoAnalisa | Tanggal | NamaBahan | Flavour | Jumlah | Supplier | KodeLot | Umur | Kesimpulan | DiperiksaOleh | Mengetahui | JenisRM | CreatedAt`

## 3. Tab `LHA_Detail` (1 baris per parameter)
`LHA_ID | No | JenisAnalisa | Parameter | Standard | Hasil | Status`

## 4. Tab `Counter`
`Name | Value` — berisi `LHA | <running number>` untuk penomoran ID (`LHA-0001`, …).

## Export file (opsional via backend)
File Excel hasil export disimpan manual oleh user ke Drive folder `1i2W5pdHQ0SMpkwQKP2LhcaKXOhsg2HJT` (export berjalan di browser/frontend, bukan di Apps Script).
