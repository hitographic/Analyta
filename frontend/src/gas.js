// Wrapper google.script.run -> Promise.
// Di dalam Apps Script WebApp: pakai google.script.run (ada global `google`).
// Di `npm run dev` lokal (tanpa Apps Script): pakai MOCK agar form tetap bisa dicoba.
// Aktifkan mock dengan ?mock=1 atau otomatis saat `google` tidak ada.

const qs = new URLSearchParams(window.location.search);
export const isMock = qs.get('mock') === '1' || typeof window.google?.script?.run === 'undefined';

const MOCK_DELAY = 150;
const mockStandar = [
  { key: 'm 308602|kimia|kadar air (karl fisher)', jenisRM: 'M 308602', jenisAnalisa: 'Kimia', parameter: 'Kadar air (Karl Fisher)', stdMentah: 'Maks. 0,5%', kriteria: 'Maks.', nilai: '0.5', satuan: '%', tipe: 'Maks', smin: '', smax: 0.5, mnum: '', Mnum: '' },
  { key: 'm 308602|kimia|kemurnian', jenisRM: 'M 308602', jenisAnalisa: 'Kimia', parameter: 'Kemurnian', kriteria: 'Min.', nilai: '99', satuan: '% (db)', tipe: 'Min', smin: 99, smax: '', mnum: '', Mnum: '' },
  { key: 'm 308602|cemaran logam|pb', jenisRM: 'M 308602', jenisAnalisa: 'Cemaran Logam', parameter: 'Pb', kriteria: 'Maks.', nilai: '2', satuan: 'ppm', tipe: 'Maks', smin: '', smax: 2, mnum: '', Mnum: '' },
];

const mockDB = { lha: [], detail: [] };

function mockCall(fn, ...args) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (fn === 'apiGetStandar') resolve(mockStandar);
      else if (fn === 'apiGetJenisRM') resolve([...new Set(mockStandar.map((s) => s.jenisRM))]);
      else if (fn === 'apiGetParams') {
        const [jenisRM] = args;
        resolve(mockStandar.filter((s) => s.jenisRM === jenisRM));
      } else if (fn === 'apiSaveLHA') {
        const [payload] = args;
        const id = 'LHA-' + String(mockDB.lha.length + 1).padStart(4, '0');
        mockDB.lha.unshift({ id, ...payload.header, nParam: payload.details.length });
        payload.details.forEach((d) => mockDB.detail.push({ lhaId: id, ...d }));
        resolve({ ok: true, id });
      } else if (fn === 'apiListLHA') resolve(mockDB.lha);
      else if (fn === 'apiGetLHA') {
        const [id] = args;
        resolve({ header: mockDB.lha.find((h) => h.id === id) || null, details: mockDB.detail.filter((d) => d.lhaId === id) });
      } else resolve(null);
    }, MOCK_DELAY);
  });
}

export function callGas(fn, ...args) {
  if (isMock) return mockCall(fn, ...args);
  return new Promise((resolve, reject) => {
    try {
      window.google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((err) => reject(err instanceof Error ? err : new Error(String(err?.message || err))))[fn](...args);
    } catch (e) {
      reject(e);
    }
  });
}
