import React, { useEffect, useState } from 'react';
import { callGas } from '../gas.js';

export default function ResultsList({ onOpen, onExportExcel }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setList((await callGas('apiListLHA')) || []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const open = async (id, mode) => {
    const data = await callGas('apiGetLHA', id);
    if (!data?.header) return;
    const lha = { id, ...data.header, details: data.details };
    if (mode === 'excel') onExportExcel(lha);
    else onOpen(lha);
  };

  if (loading) return <p>Memuat daftar…</p>;
  if (err) return <p className="error">{err}</p>;
  if (!list.length) return <p>Belum ada LHA tersimpan.</p>;
  return (
    <table className="edittable">
      <thead><tr><th>ID</th><th>No. Analisa</th><th>Bahan</th><th>Supplier</th><th>Kode Lot</th><th>Kesimpulan</th><th></th></tr></thead>
      <tbody>
        {list.map((h) => (
          <tr key={h.id}>
            <td>{h.id}</td><td>{h.noAnalisa}</td><td>{h.namaBahan}</td>
            <td>{h.supplier}</td><td>{h.kodeLot}</td><td>{h.kesimpulan}</td>
            <td>
              <button onClick={() => open(h.id, 'print')}>PDF</button>{' '}
              <button onClick={() => open(h.id, 'excel')}>Excel</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
