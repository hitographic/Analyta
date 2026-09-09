// Wrapper google.script.run -> Promise.
// Di dalam Apps Script WebApp: pakai google.script.run (ada global `google`).
// Di `npm run dev` lokal / GitHub Pages (tanpa Apps Script): pakai SEED lokal
// agar form tetap bisa dicoba dengan 691 master Standar 2026.
// Aktifkan mock dengan ?mock=1 atau otomatis saat `google` tidak ada.
import { STANDAR_SEED } from './data/standarSeed.js';

const qs = new URLSearchParams(window.location.search);
export const isMock = qs.get('mock') === '1' || typeof window.google?.script?.run === 'undefined';

const MOCK_DELAY = 150;
// Master lokal untuk demo (auto-generated dari tools/seed/standar.csv).
const mockStandar = STANDAR_SEED;

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
