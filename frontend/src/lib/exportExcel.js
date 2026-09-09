import ExcelJS from 'exceljs';
import { LAYOUT } from '../data/layoutSpec.js';

// Export 1 LHA menjadi file .xlsx yang replikanya sheet "Layout" PDQC-018
// (nilai, merge, lebar kolom, tinggi baris, font Times New Roman, border) + sheet "Work Instruction".
// lha: { noAnalisa, namaBahan, flavour, jumlah, supplier, kodeLot, umur,
//        kesimpulan, tanggal, diperiksaOleh, mengetahui,
//        details: [{ no, parameter, standard, hasil }] }

const FONT = { name: 'Times New Roman', size: 11 };
const thin = { style: 'thin' };
const medium = { style: 'medium' };

function styleCell(cell, { bold = false, size = 11, h = undefined, v = 'center', italic = false } = {}) {
  cell.font = { name: 'Times New Roman', size, bold, italic };
  cell.alignment = { horizontal: h, vertical: v };
}

function borderRange(ws, r1, c1, r2, c2, fn) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const b = fn(r, c) || {};
      ws.getCell(r, c).border = {
        top: b.t || undefined,
        bottom: b.b || undefined,
        left: b.l || undefined,
        right: b.r || undefined,
      };
    }
  }
}

export async function buildLhaWorkbook(lha) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Analyta';
  const ws = wb.addWorksheet('Layout', { pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: false } });
  ws.pageMargins = { ...LAYOUT.margins, header: 0, footer: 0 };

  // Lebar kolom A-AA + tinggi baris persis template
  for (const [letter, w] of Object.entries(LAYOUT.colWidths)) ws.getColumn(letter).width = w;
  for (const [r, h] of Object.entries(LAYOUT.rowHeights)) ws.getRow(Number(r)).height = h;

  // Teks statis template (spasi ganda dipertahankan persis)
  for (const t of LAYOUT.texts) {
    const cell = ws.getCell(t.r, t.c);
    cell.value = t.v;
    const bold = (t.r === 2 || t.r === 3 || t.r === 7) && t.c === 1;
    const size = t.r === 7 ? 14 : t.r === 2 || t.r === 3 ? 12 : 11;
    let h;
    if (t.r === 7 || t.r === 8) h = 'centerContinuous';
    else if (t.c === 2 && t.r >= 43) h = 'centerContinuous';
    else if ([2, 12].includes(t.c) && t.r === 2) h = undefined;
    else if (t.c === 2 && t.r >= 11 && t.r <= 16) h = 'left';
    styleCell(cell, { bold, size, h });
  }
  // Merge persis template
  for (const m of LAYOUT.merges) ws.mergeCells(m);

  // ---- Isi data ----
  ws.getCell(8, 1).value = `No.  :  ${lha.noAnalisa || ''}`;
  ws.getCell(11, 8).value = lha.namaBahan || '';
  ws.getCell(12, 8).value = lha.flavour || '';
  ws.getCell(13, 8).value = lha.jumlah || '';
  ws.getCell(14, 8).value = lha.supplier || '';
  ws.getCell(15, 8).value = lha.kodeLot || '';
  ws.getCell(16, 8).value = lha.umur || '';
  for (const r of [11, 12, 13, 14, 15, 16]) styleCell(ws.getCell(r, 8), { h: 'left' });

  const { firstDataRow, lastDataRow } = LAYOUT.table;
  const cap = lastDataRow - firstDataRow + 1; // 18 baris di template
  const details = (lha.details || []).slice(0, 200);
  // Jika parameter > 18, tambah baris dengan gaya sama (tinggi 18)
  let nRows = cap;
  if (details.length > cap) {
    ws.spliceRows(lastDataRow + 1, 0, ...Array(details.length - cap).fill([]));
    for (let r = lastDataRow + 1; r <= lastDataRow + (details.length - cap); r++) ws.getRow(r).height = 18;
    // geser area bawah (kesimpulan dst. sudah tertulis absolut? tidak — tulis ulang di bawah)
    nRows = details.length;
  }
  details.slice(0, nRows).forEach((d, i) => {
    const r = firstDataRow + i;
    ws.getCell(r, 2).value = d.no ?? i + 1;
    ws.getCell(r, 3).value = d.parameter || '';
    ws.getCell(r, 9).value = d.standard || '';
    ws.getCell(r, 14).value = d.hasil || '';
    for (const c of [2, 3, 9, 14]) {
      const cell = ws.getCell(r, c);
      if (!cell.font?.name) styleCell(cell, {});
      cell.alignment = { ...(cell.alignment || {}), vertical: 'center', wrapText: true };
    }
  });

  const footShift = nRows - cap;
  const rc = (r) => r + footShift;
  ws.getCell(rc(38), 3).value = lha.kesimpulan || '';
  styleCell(ws.getCell(rc(38), 3), { h: 'center' });
  ws.getCell(rc(42), 2).value = `Cibitung,  ${lha.tanggal || ''}`;
  // Border persis template: header bawah medium, body grid bawah thin + vertikal B,C,I
  borderRange(ws, 18, 2, 18, 19, () => ({ t: thin, b: medium }));
  for (const c of [2, 3, 9, 14]) ws.getCell(18, c).border = { ...ws.getCell(18, c).border, left: thin };
  for (const c of [8, 13, 19]) ws.getCell(18, c).border = { ...ws.getCell(18, c).border, right: thin };
  const lastBody = firstDataRow + nRows - 1;
  borderRange(ws, firstDataRow, 2, lastBody, 19, () => ({ b: thin }));
  for (let r = firstDataRow; r <= lastBody; r++) {
    for (const c of [2, 3, 9]) ws.getCell(r, c).border = { ...ws.getCell(r, c).border, left: thin };
  }

  // ---- Sheet Work Instruction (teks + formula live ke Layout) ----
  const wi = wb.addWorksheet('Work Instruction');
  wi.getColumn('A').width = 5.66;
  for (const col of 'BCDEFGHIJKLM'.split('')) wi.getColumn(col).width = 13;
  const set = (r, c, v, o = {}) => {
    const cell = wi.getCell(r, c);
    if (v && typeof v === 'object' && v.formula) cell.value = { formula: v.formula };
    else cell.value = v;
    styleCell(cell, o);
    return cell;
  };
  wi.mergeCells('A2:H2'); set(2, 1, { formula: 'Layout!A2' }, { bold: true, size: 12, h: 'center' });
  set(2, 9, '    Kode  WI', { bold: true, size: 12 });
  set(2, 11, ':    WI / PDQC - 018', { bold: true, size: 12 });
  wi.mergeCells('A3:H3'); set(3, 1, { formula: 'Layout!A3' }, { bold: true, size: 12, h: 'center' });
  set(3, 9, '    No. Terbitan'); set(3, 11, { formula: 'Layout!O3' });
  set(4, 9, '    Tgl. Efektif'); set(4, 11, { formula: 'Layout!O4' });
  wi.mergeCells('A7:M7'); set(7, 1, 'Work  Instruction  Pengisian  Formulir', { bold: true, size: 12, h: 'center' });
  wi.mergeCells('A8:M8'); set(8, 1, { formula: 'Layout!A7' }, { h: 'center' });
  wi.mergeCells('C11:E11'); wi.mergeCells('F11:L11');
  set(11, 2, 'No.'); set(11, 3, 'Baris  /  Kolom'); set(11, 6, 'Cara  Pengisian');
  const steps = [
    ['1.', 'No : …. / ………/ M / 19..', 'Diisi  dengan  nomor  analisa  ( running  number )  untuk  setiap pelaksanaan  monitoring  bahan  baku / FG,  kode  bahan  baku misal  pengemas  adalh  P  dan  tahun.'],
    ['2.', 'Jenis  Bahan  Baku  / FG', 'Diisi  jenis  bahan  baku / FG  yang  sedang  dimonitor  misalnya terigu  dst.'],
    ['3.', 'Flavour / Merk', 'Diisi  nama  flavour / merk  dari  bahan  baku / FG  tersebut misalnya  untuk  point  2  diisi  cakra,  segitiga,  dst.'],
    ['4.', 'Jumlah', 'Diisi  jumlah  bahan  baku / FG  yang  ada  untuk  flavour / merk tersebut  berdasarkan  kode  produksi / kode  lot  untuk  bahan  baku / FG  tsb.'],
    ['5.', 'Supplier', 'Diisi  nama  supplier  dari  bahan  baku / FG  tsb.'],
    ['6.', 'Kode  Produksi / kode  lot', 'Diisi  kode  produksi / kode  lot  dari  bahan  baku / FG  tsb.'],
    ['7.', 'Umur', 'Diisi  umur  dari  bahan  baku / FG  tsb  misal  3  minggu  dst.'],
    ['8.', 'No.', 'Diisi  no  urut.'],
    ['9.', 'Parameter  pemeriksaan', 'Diisi  jenis  analisa  yang  sifatnya  monitoring  sesuai  yang  ada di  standard  IQC  atau  persetujuan  jual  beli  misalnya  untuk terigu  yang  sifatnya  monitoring  adalah  protein  dst.'],
    ['10.', 'Standard', 'Diisi  standard  parameter  analisa  dari  bahan  baku / FG  tsb misal  untuk  M310102  di  cemaran  logam  berat  standard Pb  maks  10  ppm,  dst.'],
    ['11.', 'Hasil  analisa', 'Diisi  hasil  analisa  berdasar  pemeriksaan.'],
    ['12.', 'Kesimpulan', 'Diisi  kesimpulan  hasil  analisa  yaitu  ditolak / diterima. Ditolak  jika  tidak  sesuai  standard  dan  diterima  jika sesuai  standard.'],
    ['13.', 'Tanggal', 'Diisi  tanggal  pada  waktu  dilakukan  monitoring.'],
    ['14.', 'Diperiksa  oleh', 'Diisi  tanda  tangan  &  nama  jelas  pemeriksa.'],
    ['15.', 'Mengetahui', 'Diisi  tanda  tangan  &  nama  jelas  QC  Spv.'],
  ];
  let r = 13;
  for (const [no, baris, cara] of steps) {
    set(r, 2, no); set(r, 3, baris); set(r, 6, cara);
    wi.getCell(r, 6).alignment = { vertical: 'center', wrapText: true };
    wi.getRow(r).height = 30;
    r++;
  }
  return wb;
}

export async function downloadLhaExcel(lha) {
  const wb = await buildLhaWorkbook(lha);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `LHA-${(lha.noAnalisa || 'baru').replace(/[/\\]/g, '-')}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
