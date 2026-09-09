import React, { useEffect, useState } from 'react';
import { callGas, getMode, getHttpConfig, setHttpConfig, testHttp } from './gas.js';
import { STANDAR_SEED } from './data/standarSeed.js';
import LhaForm from './components/LhaForm.jsx';
import ResultsList from './components/ResultsList.jsx';
import LhaPrint from './components/LhaPrint.jsx';
import { downloadLhaExcel } from './lib/exportExcel.js';

export default function App() {
  const [view, setView] = useState('form'); // form | list | print
  const [standar, setStandar] = useState([]);
  const [jenisList, setJenisList] = useState([]);
  const [seedNote, setSeedNote] = useState('');
  const [mode, setMode] = useState(getMode());
  const [printData, setPrintData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  // Pengaturan koneksi Sheet (disimpan di browser, tidak ikut ke repo)
  const [execUrl, setExecUrl] = useState(getHttpConfig().url);
  const [apiKey, setApiKey] = useState(getHttpConfig().key);
  const [connMsg, setConnMsg] = useState('');
  const [testing, setTesting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setErr('');
    try {
      const [s, j] = await Promise.all([callGas('apiGetStandar'), callGas('apiGetJenisRM')]);
      // Fallback: bila Sheet tab Standar masih kosong (belum import standar.csv),
      // pakai master lokal 691 baris agar autofill tetap jalan.
      if (!s || !s.length) {
        setStandar(STANDAR_SEED);
        setJenisList([...new Set(STANDAR_SEED.map((x) => x.jenisRM))].sort());
        setSeedNote('Sheet Standar kosong — memakai master lokal 691 baris. Import tools/seed/standar.csv ke tab Standar agar produksi sinkron.');
      } else {
        setStandar(s);
        setJenisList(j && j.length ? j : [...new Set(s.map((x) => x.jenisRM))].sort());
        setSeedNote('');
      }
      setMode(getMode());
    } catch (e) {
      setErr('Gagal memuat standar: ' + e.message + (getMode() === 'http' ? ' (cek URL /exec, kunci, & deployment versi terbaru)' : ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const saveSettings = async () => {
    setConnMsg('');
    if (!execUrl.trim()) {
      setHttpConfig('', '');
      setMode(getMode());
      setConnMsg('URL dikosongkan — kembali ke mode demo (latihan, tidak tersimpan ke Sheet).');
      loadData();
      return;
    }
    setTesting(true);
    try {
      await testHttp(execUrl.trim(), apiKey.trim());
      setHttpConfig(execUrl.trim(), apiKey.trim());
      setConnMsg('Tersambung ✓ — input dari link ini sekarang tersimpan ke Google Sheet.');
      await loadData();
    } catch (e) {
      setConnMsg('Gagal tersambung: ' + e.message);
    } finally {
      setTesting(false);
    }
  };

  const openPrint = (lha) => {
    setPrintData(lha);
    setView('print');
    setTimeout(() => window.print(), 300);
  };

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <span className="logo">A</span>
          <div>
            <h1>Analyta</h1>
            <p>Input Hasil Analisa QC — RM / FG · PDQC-018</p>
          </div>
        </div>
        <nav>
          <button className={view === 'form' ? 'active' : ''} onClick={() => setView('form')}>Input Baru</button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Daftar LHA</button>
          {view === 'print' && <button onClick={() => window.print()}>Cetak PDF</button>}
        </nav>
      </header>
      <div className="statusbar no-print">
        {!loading && !err && <span className="pill ok">{standar.length} standar · {jenisList.length} jenis RM</span>}
        {mode === 'gas' && <span className="pill ok">terhubung Sheet (WebApp)</span>}
        {mode === 'http' && <span className="pill ok">terhubung Sheet (github)</span>}
        {mode === 'mock' && <span className="pill warn">mode demo — isi Pengaturan agar tersimpan ke Sheet</span>}
        {seedNote && <span className="pill warn">{seedNote}</span>}
      </div>

      <details className="card settings no-print">
        <summary>⚙ Pengaturan koneksi Sheet {mode !== 'mock' ? '(terhubung ✓)' : '(belum terhubung)'}</summary>
        <p className="hint">
          Agar input dari link github tersimpan ke Google Sheet: di Apps Script jalankan <b>setupToken()</b> sekali
          (salin kunci dari log), update deployment ke versi terbaru, lalu tempel di bawah.
          URL & kunci hanya tersimpan di browser ini — tidak ikut ke repo.
        </p>
        <div className="grid2">
          <label className="fld">URL WebApp /exec<input value={execUrl} onChange={(e) => setExecUrl(e.target.value)} placeholder="https://script.google.com/macros/s/…/exec" /></label>
          <label className="fld">Kunci (dari setupToken)<input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="16 karakter" /></label>
        </div>
        <div className="toolbar" style={{ marginTop: 10 }}>
          <button className="btn secondary" disabled={testing} onClick={saveSettings}>Simpan & Tes koneksi</button>
        </div>
        {connMsg && <p className="msg">{connMsg}</p>}
      </details>

      {loading && <p className="no-print">Memuat standar…</p>}
      {err && <p className="error no-print">{err}</p>}
      {!loading && !err && view === 'form' && (
        <LhaForm key={mode + standar.length} standar={standar} jenisList={jenisList} onSaved={(lha) => openPrint(lha)} onExportExcel={downloadLhaExcel} />
      )}
      {!loading && !err && view === 'list' && (
        <ResultsList onOpen={openPrint} onExportExcel={downloadLhaExcel} />
      )}
      {view === 'print' && printData && (
        <LhaPrint lha={printData} onBack={() => setView('list')} />
      )}
    </div>
  );
}
