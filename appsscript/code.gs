/**
 * Analyta — Backend Google Apps Script.
 *
 * Arsitektur: frontend React (Vite, build single-file) ditempel sebagai file
 * Html "Index" di project Apps Script ini. doGet() menyajikan WebApp.
 * Database = Google Sheet (ID di bawah) dengan tab: Standar, LHA, LHA_Detail, Counter.
 * File export (opsional, bila backend yang menyimpan) = Google Drive folder di bawah.
 *
 * SETUP:
 * 1. Buat project Apps Script baru (atau `clasp create`), copy file ini sebagai Code.gs,
 *    copy appsscript.json menimpa manifest, dan tempel hasil `npm run build`
 *    (frontend/dist/index.html) sebagai file Html bernama "Index".
 * 2. Ganti SHEET_ID / FOLDER_ID bila beda, lalu di editor jalankan setupSheets() sekali (Run).
 * 3. Deploy > New deployment > Web app > Execute as: Me, Who has access: sesuai kebutuhan.
 * 4. Isi tab Standar dengan tools/seed/standar.csv (File > Import > Replace),
 *    atau biarkan kosong — form tetap jalan, standar diisi manual per baris.
 */

const SHEET_ID = '1DhvAd6qLGVKAI9f6NEa59HbM8yn3PiC-nNxh0aTIAfA';
const FOLDER_ID = '1i2W5pdHQ0SMpkwQKP2LhcaKXOhsg2HJT';

const TABS = { standar: 'Standar', lha: 'LHA', detail: 'LHA_Detail', counter: 'Counter' };

const HEADERS = {};
HEADERS[TABS.standar] = ['KeyBase','Jenis RM','Jenis Analisa','Parameter','Std_mentah_2026','Kriteria','Nilai_std','Satuan','Std_tipe','Std_min','Std_max','m_num','M_num','Catatan'];
HEADERS[TABS.lha] = ['ID','NoAnalisa','Tanggal','NamaBahan','Flavour','Jumlah','Supplier','KodeLot','Umur','Kesimpulan','DiperiksaOleh','Mengetahui','JenisRM','CreatedAt'];
HEADERS[TABS.detail] = ['LHA_ID','No','JenisAnalisa','Parameter','Standard','Hasil','Status'];
HEADERS[TABS.counter] = ['Name','Value'];

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }
function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Tab "' + name + '" tidak ada. Jalankan setupSheets() dulu.');
  return sh;
}

/** Buat tab + header bila belum ada. Jalankan sekali dari editor Apps Script. */
function setupSheets() {
  const ss = ss_();
  Object.keys(HEADERS).forEach((name) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS[name]);
    else {
      const cur = sh.getRange(1, 1, 1, HEADERS[name].length).getValues()[0];
      if (cur.join('') === '') sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
    }
  });
  const c = ss.getSheetByName(TABS.counter);
  const vals = c.getDataRange().getValues();
  const hasLha = vals.some((r) => r[0] === 'LHA');
  if (!hasLha) c.appendRow(['LHA', 0]);
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Analyta — Input Hasil Analisa QC')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function rows_(name) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const w = sh.getLastColumn();
  const head = sh.getRange(1, 1, 1, w).getValues()[0];
  return sh.getRange(2, 1, last - 1, w).getValues().map((r) => {
    const o = {};
    head.forEach((h, i) => { o[h] = r[i]; });
    return o;
  });
}

function keyBase_(jenisRM, jenisAnalisa, parameter) {
  const norm = (s) => String(s ?? '').replace(/(?<=\d),(?=\d)/g, '.').replace(/\s+/g, ' ').trim().toLowerCase();
  return norm(jenisRM) + '|' + norm(jenisAnalisa) + '|' + norm(parameter);
}

/** Seluruh master standar (untuk dropdown + autofill + penilaian). */
function apiGetStandar() {
  return rows_(TABS.standar).map((r) => ({
    key: r.KeyBase || keyBase_(r['Jenis RM'], r['Jenis Analisa'], r.Parameter),
    jenisRM: r['Jenis RM'] || '', jenisAnalisa: r['Jenis Analisa'] || '', parameter: r.Parameter || '',
    stdMentah: r.Std_mentah_2026 || '', kriteria: r.Kriteria || '', nilai: r.Nilai_std == null ? '' : String(r.Nilai_std),
    satuan: r.Satuan || '', tipe: r.Std_tipe || '',
    smin: r.Std_min === '' || r.Std_min == null ? '' : Number(r.Std_min),
    smax: r.Std_max === '' || r.Std_max == null ? '' : Number(r.Std_max),
    mnum: r.m_num === '' || r.m_num == null ? '' : Number(r.m_num),
    Mnum: r.M_num === '' || r.M_num == null ? '' : Number(r.M_num),
  }));
}

function apiGetJenisRM() {
  const seen = [];
  rows_(TABS.standar).forEach((r) => {
    const v = (r['Jenis RM'] || '').toString().trim();
    if (v && seen.indexOf(v) === -1) seen.push(v);
  });
  return seen.sort();
}

function apiGetParams(jenisRM) {
  return apiGetStandar().filter((s) => s.jenisRM === jenisRM);
}

function nextId_() {
  const c = sheet_(TABS.counter);
  const vals = c.getDataRange().getValues();
  for (let i = 0; i < vals.length; i++) {
    if (vals[i][0] === 'LHA') {
      const n = Number(vals[i][1] || 0) + 1;
      c.getRange(i + 1, 2).setValue(n);
      return 'LHA-' + String(n).padStart(4, '0');
    }
  }
  c.appendRow(['LHA', 1]);
  return 'LHA-0001';
}

/** Simpan 1 LHA. payload = {header:{...}, details:[{no,jenisAnalisa,parameter,standard,hasil,status}]} */
function apiSaveLHA(payload) {
  if (!payload || !payload.header) throw new Error('Payload kosong.');
  const h = payload.header;
  const details = payload.details || [];
  if (!details.length) throw new Error('Minimal 1 parameter.');
  const id = nextId_();
  sheet_(TABS.lha).appendRow([id, h.noAnalisa || '', h.tanggal || '', h.namaBahan || '', h.flavour || '',
    h.jumlah || '', h.supplier || '', h.kodeLot || '', h.umur || '', h.kesimpulan || '',
    h.diperiksaOleh || '', h.mengetahui || '', h.jenisRM || '', new Date()]);
  const sh = sheet_(TABS.detail);
  details.forEach((d) => sh.appendRow([id, d.no || '', d.jenisAnalisa || '', d.parameter || '', d.standard || '', d.hasil || '', d.status || '']));
  return { ok: true, id: id };
}

function apiListLHA() {
  const rows = rows_(TABS.lha);
  return rows.map((r) => ({
    id: r.ID, noAnalisa: r.NoAnalisa, tanggal: r.Tanggal, namaBahan: r.NamaBahan,
    flavour: r.Flavour, supplier: r.Supplier, kodeLot: r.KodeLot, kesimpulan: r.Kesimpulan,
  })).reverse();
}

function apiGetLHA(id) {
  const h = rows_(TABS.lha).filter((r) => String(r.ID) === String(id))[0];
  if (!h) return { header: null, details: [] };
  const details = rows_(TABS.detail).filter((r) => String(r.LHA_ID) === String(id)).map((r) => ({
    no: r.No, jenisAnalisa: r.JenisAnalisa, parameter: r.Parameter, standard: r.Standard, hasil: r.Hasil, status: r.Status,
  }));
  return {
    header: { id: h.ID, noAnalisa: h.NoAnalisa, tanggal: h.Tanggal, namaBahan: h.NamaBahan, flavour: h.Flavour,
      jumlah: h.Jumlah, supplier: h.Supplier, kodeLot: h.KodeLot, umur: h.Umur, kesimpulan: h.Kesimpulan,
      diperiksaOleh: h.DiperiksaOleh, mengetahui: h.Mengetahui, jenisRM: h.JenisRM },
    details: details,
  };
}
