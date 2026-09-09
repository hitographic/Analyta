import React, { useEffect, useState } from 'react';
import { callGas, isMock } from './gas.js';
import LhaForm from './components/LhaForm.jsx';
import ResultsList from './components/ResultsList.jsx';
import LhaPrint from './components/LhaPrint.jsx';
import { downloadLhaExcel } from './lib/exportExcel.js';

export default function App() {
  const [view, setView] = useState('form'); // form | list | print
  const [standar, setStandar] = useState([]);
  const [jenisList, setJenisList] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [s, j] = await Promise.all([callGas('apiGetStandar'), callGas('apiGetJenisRM')]);
        setStandar(s || []);
        setJenisList(j || []);
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
        <div>
          <h1>Analyta</h1>
          <p>Input Hasil Analisa QC — RM / FG (PDQC-018){isMock ? ' · MODE MOCK (tambah ?mock=0 di Apps Script)' : ''}</p>
        </div>
        <nav>
          <button className={view === 'form' ? 'active' : ''} onClick={() => setView('form')}>Input Baru</button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>Daftar LHA</button>
          {view === 'print' && <button onClick={() => window.print()}>Cetak PDF</button>}
        </nav>
      </header>
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
