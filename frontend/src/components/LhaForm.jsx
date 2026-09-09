import React, { useMemo, useState } from 'react';
import { callGas } from '../gas.js';
import { evalStatus, stdText, kesimpulanOf } from '../lib/lha.js';

const emptyHeader = {
  noAnalisa: '', namaBahan: '', flavour: '', jumlah: '',
  supplier: '', kodeLot: '', umur: '', kesimpulan: '',
  tanggal: '', diperiksaOleh: '', mengetahui: '',
};
const emptyRow = () => ({ jenisAnalisa: 'Kimia', parameter: '', standard: '', hasil: '' });

// Opsi parameter+standar diambil dari master Standar (tab Standar di Sheet).
// Dipilih per Jenis RM/No Bahan -> dropdown parameter, standard terisi otomatis (bisa diedit).
export default function LhaForm({ standar, jenisList, onSaved, onExportExcel }) {
  const [header, setHeader] = useState(emptyHeader);
  const [jenisRM, setJenisRM] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const paramsForRM = useMemo(() => {
    if (!jenisRM) return [];
    const seen = new Map();
    for (const s of standar) {
      if (s.jenisRM !== jenisRM) continue;
      const key = `${s.jenisAnalisa}||${s.parameter}`;
      if (!seen.has(key)) seen.set(key, s);
    }
    return [...seen.values()];
  }, [standar, jenisRM]);

  const set = (k) => (e) => setHeader({ ...header, [k]: e.target.value });

  const setRow = (i, patch) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    // Auto-isi standard saat parameter dipilih
    if (patch.parameter !== undefined) {
      const found = paramsForRM.find((p) => p.jenisAnalisa === next[i].jenisAnalisa && p.parameter === patch.parameter);
      if (found) next[i].standard = stdText(found);
    }
    if (patch.jenisAnalisa !== undefined) {
      next[i].parameter = '';
      next[i].standard = '';
    }
    setRows(next);
  };

  const evaluated = rows.map((r) => {
    const std = standar.find((s) => s.jenisRM === jenisRM && s.jenisAnalisa === r.jenisAnalisa && s.parameter === r.parameter);
    return { ...r, status: evalStatus({ jenisAnalisa: r.jenisAnalisa, std, hasilMentah: r.hasil }) };
  });
  const kesimpulanAuto = kesimpulanOf(evaluated.filter((r) => r.parameter && r.hasil));

  const save = async (thenPrint) => {
    setSaving(true);
    setMsg('');
    try {
      const details = evaluated
        .filter((r) => r.parameter)
        .map((r, i) => ({ no: i + 1, jenisAnalisa: r.jenisAnalisa, parameter: r.parameter, standard: r.standard, hasil: r.hasil, status: r.status }));
      const payload = { header: { ...header, jenisRM, kesimpulan: header.kesimpulan || kesimpulanAuto }, details };
      const res = await callGas('apiSaveLHA', payload);
      const lha = { id: res.id, ...payload.header, details: payload.details };
      setMsg(`Tersimpan (${res.id}). Database: Google Sheet.`);
      if (thenPrint === 'print') onSaved(lha);
      else if (thenPrint === 'excel') onExportExcel(lha);
    } catch (e) {
      setMsg('Gagal menyimpan: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="no-print">
      <section className="card">
        <h2>Data Sampel (LHA PDQC-018)</h2>
        <div className="grid2">
          <label>No. Analisa<input value={header.noAnalisa} onChange={set('noAnalisa')} placeholder="001/IX/M/25" /></label>
          <label>Jenis RM / Bahan (No. Bahan)<input list="jenisRM" value={jenisRM} onChange={(e) => setJenisRM(e.target.value)} placeholder="cth: M 308602" />
            <datalist id="jenisRM">{jenisList.map((j) => <option key={j} value={j} />)}</datalist></label>
          <label>Nama Bahan Baku / FG<input value={header.namaBahan} onChange={set('namaBahan')} /></label>
          <label>Flavour / Merk<input value={header.flavour} onChange={set('flavour')} /></label>
          <label>Jumlah<input value={header.jumlah} onChange={set('jumlah')} /></label>
          <label>Supplier<input value={header.supplier} onChange={set('supplier')} /></label>
          <label>Kode Produksi / Lot<input value={header.kodeLot} onChange={set('kodeLot')} /></label>
          <label>Umur<input value={header.umur} onChange={set('umur')} placeholder="cth: 3 minggu" /></label>
          <label>Tanggal (Cibitung)<input value={header.tanggal} onChange={set('tanggal')} placeholder="12 September 2026" /></label>
          <label>Kesimpulan (otomatis bila kosong)<input value={header.kesimpulan} onChange={set('kesimpulan')} placeholder={kesimpulanAuto || 'Diterima / Ditolak'} /></label>
          <label>Diperiksa Oleh<input value={header.diperiksaOleh} onChange={set('diperiksaOleh')} /></label>
          <label>Mengetahui (QC Spv)<input value={header.mengetahui} onChange={set('mengetahui')} /></label>
        </div>
        {!jenisRM && <p className="hint">Isi <b>Jenis RM</b> dulu agar dropdown parameter + standar otomatis dari master Standar 2026.</p>}
      </section>

      <section className="card">
        <h2>Parameter Pemeriksaan ({evaluated.filter((r) => r.parameter).length})</h2>
        <table className="edittable">
          <thead><tr><th>No</th><th>Jenis Analisa</th><th>Parameter</th><th>Standard (otomatis)</th><th>Hasil Analisa</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const ev = evaluated[i];
              return (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>
                    <select value={r.jenisAnalisa} onChange={(e) => setRow(i, { jenisAnalisa: e.target.value })}>
                      {['Kimia', 'Cemaran Logam', 'Mikrobiologi', 'Fisik'].map((j) => <option key={j}>{j}</option>)}
                    </select>
                  </td>
                  <td>
                    <input list={`p-${i}`} value={r.parameter} onChange={(e) => setRow(i, { parameter: e.target.value })} placeholder="ketik / pilih" />
                    <datalist id={`p-${i}`}>
                      {paramsForRM.filter((p) => p.jenisAnalisa === r.jenisAnalisa).map((p) => <option key={p.parameter} value={p.parameter} />)}
                    </datalist>
                  </td>
                  <td><input value={r.standard} onChange={(e) => setRow(i, { standard: e.target.value })} placeholder="otomatis dari Standar" /></td>
                  <td><input value={r.hasil} onChange={(e) => setRow(i, { hasil: e.target.value })} placeholder="cth: 0.007 mg/kg, TTD, <1.0 x 10^1" /></td>
                  <td><span className={`badge ${/Tidak memenuhi|Ditolak/.test(ev.status) ? 'bad' : /Cek|Belum|Tanpa/.test(ev.status) ? 'warn' : 'ok'}`}>{ev.status || '-'}</span></td>
                  <td><button onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button onClick={() => setRows([...rows, emptyRow()])}>+ Tambah parameter</button>
        <p className="hint">Kesimpulan otomatis: <b>{kesimpulanAuto || '-'}</b> (Ditolak jika ada Tidak memenuhi — sesuai Work Instruction poin 12).</p>
      </section>

      <div className="actions">
        <button disabled={saving} onClick={() => save('print')}>Simpan & Cetak PDF</button>
        <button disabled={saving} onClick={() => save('excel')}>Simpan & Export Excel</button>
        <button disabled={saving} onClick={() => save('only')}>Simpan saja</button>
      </div>
      {msg && <p className="msg">{msg}</p>}
    </div>
  );
}
