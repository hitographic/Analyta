// node test/export.test.js — dijalankan via `npm run test:export` dari folder frontend/
// Membuat 1 LHA contoh -> build workbook -> tulis /tmp/LHA-test.xlsx -> asersi dasar.
import { writeFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { buildLhaWorkbook } from '../src/lib/exportExcel.js';

const lha = {
  noAnalisa: '001/IX/M/25',
  namaBahan: 'M 308602',
  flavour: '-',
  jumlah: '25 kg',
  supplier: 'PT Prisel Giuga',
  kodeLot: 'LOT-001',
  umur: '3 minggu',
  kesimpulan: 'Diterima',
  tanggal: '12 September 2026',
  diperiksaOleh: 'Analis QC',
  mengetahui: 'QC Spv',
  details: [
    { no: 1, parameter: 'Kadar air (Karl Fisher)', standard: 'Maks. 0.5 %', hasil: '2.00 %' },
    { no: 2, parameter: 'As', standard: 'Maks. 3 ppm', hasil: 'TTD' },
    { no: 3, parameter: 'Pb', standard: 'Maks. 2 ppm', hasil: '0.020 mg/kg' },
  ],
};

const wb = await buildLhaWorkbook(lha);
const buf = await wb.xlsx.writeBuffer();
writeFileSync('/tmp/LHA-test.xlsx', Buffer.from(buf));

// Verifikasi ulang dengan membaca kembali
const wb2 = new ExcelJS.Workbook();
await wb2.xlsx.load(buf);
const ws = wb2.getWorksheet('Layout');
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } };
assert(ws.getCell('H11').value === 'M 308602', 'H11 nama bahan');
assert(ws.getCell('C19').value === 'Kadar air (Karl Fisher)', 'C19 parameter');
assert(ws.getCell('I19').value === 'Maks. 0.5 %', 'I19 standard');
assert(ws.getCell('N19').value === '2.00 %', 'N19 hasil');
assert(ws.getCell('C38').value === 'Diterima', 'C38 kesimpulan');
assert(ws.getCell('A8').value === 'No.  :  001/IX/M/25', 'A8 no analisa');
const wi = wb2.getWorksheet('Work Instruction');
assert(!!wi, 'sheet Work Instruction ada');
assert(String(wi.getCell('A2').value?.formula || '') === 'Layout!A2', 'WI A2 formula live');
console.log('export test: OK (/tmp/LHA-test.xlsx)');
