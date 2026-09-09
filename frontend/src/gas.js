// Klien backend 3 mode:
// 1. 'gas'  — di dalam WebApp Apps Script (ada google.script.run): simpan asli ke Sheet.
// 2. 'http' — di GitHub Pages + URL /exec & kunci diisi di Pengaturan (localStorage,
//             TIDAK ikut ke repo): simpan asli ke Sheet via JSONP ke doGet(?action=...).
//             JSONP = menggambarkan <script>, jadi bebas masalah CORS.
// 3. 'mock' — tanpa keduanya: master lokal 691 baris + DB ingatan browser
//             (hilang saat refresh, cocok untuk latihan).
import { STANDAR_SEED } from './data/standarSeed.js';
import { EXEC_URL, API_KEY } from './config.js';

const LS_URL = 'analyta_exec_url';
const LS_KEY = 'analyta_api_key';

// Isi Pengaturan (browser) menang atas bawaan; bila kosong dipakai bawaan config.js
// agar github.io langsung terhubung tanpa設定 apa pun.
export function getHttpConfig() {
  try {
    const u = (localStorage.getItem(LS_URL) || '').trim() || EXEC_URL;
    const k = (localStorage.getItem(LS_KEY) || '').trim() || API_KEY;
    return { url: u, key: k };
  } catch (e) {
    return { url: EXEC_URL, key: API_KEY };
  }
}

export function setHttpConfig(url, key) {
  try {
    localStorage.setItem(LS_URL, (url || '').trim());
    localStorage.setItem(LS_KEY, (key || '').trim());
  } catch (e) { /* abaikan */ }
}

function inGasFrame() {
  try {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('mock') === '1') return false;
    return typeof window.google?.script?.run !== 'undefined';
  } catch (e) {
    return false;
  }
}

// Dipakai badge awal; App memakai getMode() live agar berubah setelah Pengaturan disimpan.
export const isMock = !inGasFrame() && !getHttpConfig().url;

export function getMode() {
  try {
    if (new URLSearchParams(window.location.search).get('mock') === '1') return 'mock';
  } catch (e) { /* abaikan */ }
  if (inGasFrame()) return 'gas';
  if (getHttpConfig().url) return 'http';
  return 'mock';
}

const MOCK_DELAY = 150;
// Master lokal untuk demo/latihan (auto-generated dari tools/seed/standar.csv).
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

let __seq = 0;
function jsonp(baseUrl, params, timeoutMs) {
  return new Promise((resolve, reject) => {
    const cb = '__analyta_cb_' + Date.now() + '_' + (__seq++);
    const q = new URLSearchParams({ ...params, callback: cb }).toString();
    const sep = baseUrl.includes('?') ? '&' : '?';
    const el = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout — cek URL /exec & koneksi internet.'));
    }, timeoutMs || 25000);
    function cleanup() {
      clearTimeout(timer);
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      el.remove();
    }
    window[cb] = (res) => { cleanup(); resolve(res); };
    el.onerror = () => { cleanup(); reject(new Error('Gagal hubungi /exec — cek URL & status deployment (harus versi terbaru).')); };
    el.src = baseUrl + sep + q;
    document.head.appendChild(el);
  });
}

const FN_TO_ACTION = {
  apiGetStandar: () => ({ action: 'getStandar' }),
  apiGetJenisRM: () => ({ action: 'getJenisRM' }),
  apiGetParams: (jenisRM) => ({ action: 'getParams', jenisRM: jenisRM || '' }),
  apiSaveLHA: (payload) => ({ action: 'saveLHA', payload: JSON.stringify(payload || {}) }),
  apiListLHA: () => ({ action: 'listLHA' }),
  apiGetLHA: (id) => ({ action: 'getLHA', id: id || '' }),
};

async function httpCall(fn, ...args) {
  const { url, key } = getHttpConfig();
  if (!url) throw new Error('URL /exec belum diisi (buka Pengaturan).');
  const map = FN_TO_ACTION[fn];
  if (!map) throw new Error('Fungsi tak dikenal: ' + fn);
  const res = await jsonp(url, { key: key || '', ...map(...args) });
  if (!res || res.ok !== true) throw new Error((res && res.error) || 'Respons backend tidak valid.');
  return res.data;
}

/** Tes koneksi ke /exec (dipakai tombol Tes di Pengaturan). */
export async function testHttp(url, key) {
  const res = await jsonp(url, { key: key || '', action: 'ping' }, 15000);
  if (!res || res.ok !== true) throw new Error((res && res.error) || 'Respons backend tidak valid.');
  return res.data;
}

function gasCall(fn, ...args) {
  return new Promise((resolve, reject) => {
    try {
      window.google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((err) => reject(err instanceof Error ? err : new Error(String((err && err.message) || err))))[fn](...args);
    } catch (e) {
      reject(e);
    }
  });
}

export function callGas(fn, ...args) {
  if (inGasFrame()) return gasCall(fn, ...args);
  if (getHttpConfig().url) return httpCall(fn, ...args);
  return mockCall(fn, ...args);
}
