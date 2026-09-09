import React, { useEffect, useState } from 'react';
import { callGas, isMock } from './gas.js';
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
  const [printData, setPrintData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
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
        }
      } catch (e) {
        setErr('Gagal memuat standar: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        {isMock && <span className="pill warn">mode demo — simpan asli via WebApp Apps Script</span>}
        {seedNote && <span className="pill warn">{seedNote}</span>}
      </div>
      {loading && <p className="no-print">Memuat standar…</p>}
      {err && <p className="error no-print">{err}</p>}
      {!loading && !err && view === 'form' && (
        <LhaForm standar={standar} jenisList={jenisList} onSaved={(lha) => openPrint(lha)} onExportExcel={downloadLhaExcel} />
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
