import React, { useMemo, useState } from 'react';
import { callGas } from '../gas.js';
import { evalStatus, stdText, kesimpulanOf } from '../lib/lha.js';

const emptyHeader = {
  noAnalisa: '', namaBahan: '', flavour: '', jumlah: '',
  supplier: '', kodeLot: '', umur: '', kesimpulan: '',
  tanggal: '', diperiksaOleh: '', mengetahui: '',
};
const emptyRow = () => ({ jenisAnalisa: 'Kimia', parameter: '', standard: '', hasil: '' });
const JENIS = ['Kimia', 'Cemaran Logam', 'Mikrobiologi', 'Fisik'];

// Samakan dengan kunci BASE di master: lowercase, spasi tunggal, trim.
// Membuat pencocokan toleran terhadap beda ketik/kapital di Sheet.
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

// Opsi parameter+standar diambil dari master Standar (Sheet tab Standar,
// fallback 691 baris lokal bila Sheet kosong). Dipilih per Jenis RM ->
// dropdown parameter, standard terisi otomatis (tetap bisa diedit).
export default function LhaForm({ standar, jenisList, onSaved, onExportExcel }) {
  const [header, setHeader] = useState(emptyHeader);
  const [jenisRM, setJenisRM] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const rmNorm = norm(jenisRM);
  const paramsForRM = useMemo(() => {
    if (!rmNorm) return [];
    const seen = new Map();
    for (const s of standar) {
      if (norm(s.jenisRM) !== rmNorm) continue;
      const key = `${norm(s.jenisAnalisa)}||${norm(s.parameter)}`;
      if (!seen.has(key)) seen.set(key, s);
    }
    return [...seen.values()];
  }, [standar, rmNorm]);

  const paramOptions = (jenisAnalisa) => {
    const jn = norm(jenisAnalisa);
    return paramsForRM.filter((p) => norm(p.jenisAnalisa) === jn).map((p) => p.parameter);
  };

  const findStd = (jenisAnalisa, parameter) => {
    const jn = norm(jenisAnalisa), pn = norm(parameter);
    return standar.find((s) => norm(s.jenisRM) === rmNorm && norm(s.jenisAnalisa) === jn && norm(s.parameter) === pn);
  };

  const set = (k) => (e) => setHeader({ ...header, [k]: e.target.value });

  const setRow = (i, patch) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    if (patch.parameter !== undefined) {
      const found = findStd(next[i].jenisAnalisa, patch.parameter);
      next[i].standard = found ? stdText(found) : next[i].standard;
      if (found) next[i].standard = stdText(found);
      else if (patch.parameter === '') next[i].standard = '';
    }
    if (patch.jenisAnalisa !== undefined) {
      next[i].parameter = '';
      next[i].standard = '';
    }
    setRows(next);
  };

  const fillAll = () => {
    if (!paramsForRM.length) return;
    setRows(paramsForRM.map((p) => ({
      jenisAnalisa: p.jenisAnalisa,
      parameter: p.parameter,
      standard: stdText(p),
      hasil: '',
    })));
  };

  const evaluated = rows.map((r) => {
    const std = r.parameter ? findStd(r.jenisAnalisa, r.parameter) : null;
    return { ...r, status: r.parameter ? evalStatus({ jenisAnalisa: r.jenisAnalisa, std: std || { missing: true }, hasilMentah: r.hasil }) : '' };
  });
  const filledCount = evaluated.filter((r) => r.parameter && r.hasil).length;
  const kesimpulanAuto = kesimpulanOf(evaluated.filter((r) => r.parameter && r.hasil));

  const save = async (thenPrint) => {
    setSaving(true);
    setMsg('');
    try {
      const details = evaluated
        .filter((r) => r.parameter)
        .map((r, i) => ({ no: i + 1, jenisAnalisa: r.jenisAnalisa, parameter: r.parameter, standard: r.standard, hasil: r.hasil, status: r.status }));
      if (!jenisRM) throw new Error('Pilih Jenis RM dulu.');
      if (!details.length) throw new Error('Tambah minimal 1 parameter.');
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
        <div className="cardhead">
          <span className="step">1</span>
          <div>
            <h2>Data Sampel</h2>
            <p className="sub">LHA PDQC-018 · pilih Jenis RM agar parameter + standar terisi otomatis</p>
          </div>
        </div>
        <div className="rmrow">
          <label className="fld grow">Jenis RM / No. Bahan *
            <select value={jenisRM} onChange={(e) => setJenisRM(e.target.value)}>
              <option value="">— Pilih bahan ({jenisList.length} tersedia) —</option>
              {jenisList.map((j) => <option key={j} value={j}>{j} ({standar.filter((s) => norm(s.jenisRM) === norm(j)).length} param)</option>)}
            </select>
          </label>
          <div className="rmmeta">
            {jenisRM ? (
              <span className="pill ok">{paramsForRM.length} parameter tersedia</span>
            ) : (
              <span className="pill">{standar.length} standar dimuat</span>
            )}
          </div>
        </div>
        {!jenisRM && <p className="hint">Pilih <b>Jenis RM</b> dulu — dropdown parameter + standar otomatis dari master Standar 2026 (tidak perlu ketik kode).</p>}
        {jenisRM && !paramsForRM.length && (
          <p className="warnbox">Jenis RM ini tidak punya standar di master. Cek ejaan/kapital, atau isi parameter + standar manual. Param tanpa master → status <b>Cek Standar</b>.</p>
        )}
        <div className="grid2">
          <label className="fld">No. Analisa<input value={header.noAnalisa} onChange={set('noAnalisa')} placeholder="001/IX/M/25" /></label>
          <label className="fld">Nama Bahan Baku / FG<input value={header.namaBahan} onChange={set('namaBahan')} placeholder="cth: Terigu Cakra Kembar" /></label>
          <label className="fld">Flavour / Merk<input value={header.flavour} onChange={set('flavour')} /></label>
          <label className="fld">Jumlah<input value={header.jumlah} onChange={set('jumlah')} placeholder="cth: 25 kg" /></label>
          <label className="fld">Supplier<input value={header.supplier} onChange={set('supplier')} /></label>
          <label className="fld">Kode Produksi / Lot<input value={header.kodeLot} onChange={set('kodeLot')} /></label>
          <label className="fld">Umur<input value={header.umur} onChange={set('umur')} placeholder="cth: 3 minggu" /></label>
          <label className="fld">Tanggal (Cibitung)<input value={header.tanggal} onChange={set('tanggal')} placeholder="12 September 2026" /></label>
          <label className="fld">Diperiksa Oleh<input value={header.diperiksaOleh} onChange={set('diperiksaOleh')} placeholder="Nama analis" /></label>
          <label className="fld">Mengetahui (QC Spv)<input value={header.mengetahui} onChange={set('mengetahui')} placeholder="Nama spv" /></label>
        </div>
      </section>

      <section className="card">
        <div className="cardhead">
          <span className="step">2</span>
          <div>
            <h2>Hasil Pemeriksaan <span className="count">{filledCount}/{evaluated.filter((r) => r.parameter).length} terisi</span></h2>
            <p className="sub">Status dinilai otomatis tiap hasil diketik · Kesimpulan: <b className={/Ditolak/.test(kesimpulanAuto) ? 'neg' : 'pos'}>{kesimpulanAuto || '-'}</b></p>
          </div>
        </div>
        <div className="toolbar">
          <button className="btn secondary" disabled={!paramsForRM.length} onClick={fillAll}>Muat {paramsForRM.length} parameter RM ini</button>
          <button className="btn ghost" onClick={() => setRows([...rows, emptyRow()])}>+ Baris kosong</button>
          <label className="fld inline">Kesimpulan (otomatis bila kosong)<input value={header.kesimpulan} onChange={set('kesimpulan')} placeholder={kesimpulanAuto || 'Diterima / Ditolak'} /></label>
        </div>
        <div className="tablewrap">
        <table className="edittable">
          <thead><tr><th className="cno">No</th><th>Jenis Analisa</th><th>Parameter</th><th>Standard (otomatis)</th><th>Hasil Analisa</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const ev = evaluated[i];
              const opts = paramOptions(r.jenisAnalisa);
              return (
                <tr key={i} className={/Tidak memenuhi|Ditolak/.test(ev.status) ? 'rowbad' : ''}>
                  <td className="cno">{i + 1}</td>
                  <td>
                    <select value={r.jenisAnalisa} onChange={(e) => setRow(i, { jenisAnalisa: e.target.value })}>
                      {JENIS.map((j) => <option key={j}>{j}</option>)}
                    </select>
                  </td>
                  <td>
                    {r.parameter !== '__custom' ? (
                      <select value={opts.includes(r.parameter) ? r.parameter : ''} onChange={(e) => setRow(i, { parameter: e.target.value })}>
                        <option value="">— Pilih ({opts.length}) —</option>
                        {opts.map((p) => <option key={p} value={p}>{p}</option>)}
                        <option value="__custom">— Ketik manual… —</option>
                      </select>
                    ) : (
                      <span className="customwrap">
                        <input value={r.customText || ''} onChange={(e) => {
                          const next = rows.slice();
                          next[i] = { ...next[i], customText: e.target.value, parameter: e.target.value };
                          setRows(next);
                        }} placeholder="nama parameter" autoFocus />
                        <button className="linkbtn" onClick={() => setRow(i, { parameter: '' })}>pilih dari daftar</button>
                      </span>
                    )}
                  </td>
                  <td><input value={r.standard} onChange={(e) => setRow(i, { standard: e.target.value })} placeholder="otomatis" /></td>
                  <td><input className="hasil" value={r.hasil} onChange={(e) => setRow(i, { hasil: e.target.value })} placeholder="0.007 · TTD · Negatif · <1.0 x 10^1" /></td>
                  <td><span className={`badge ${/Tidak memenuhi|Ditolak/.test(ev.status) ? 'bad' : /Cek|Belum|Tanpa|Marginal/.test(ev.status) ? 'warn' : 'ok'}`}>{ev.status || '-'}</span></td>
                  <td><button className="iconbtn" title="Hapus baris" onClick={() => setRows(rows.filter((_, j) => j !== i))}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <p className="hint">Tips: pilih Jenis RM → klik <b>Muat parameter</b> → tinggal isi kolom Hasil. Koma desimal otomatis jadi titik. “Negatif” dianggap kualitatif.</p>
      </section>

      <div className="actions">
        <button className="btn primary" disabled={saving} onClick={() => save('print')}>Simpan & Cetak PDF</button>
        <button className="btn secondary" disabled={saving} onClick={() => save('excel')}>Simpan & Export Excel</button>
        <button className="btn ghost" disabled={saving} onClick={() => save('only')}>Simpan saja</button>
      </div>
      {msg && <p className="msg">{msg}</p>}
    </div>
  );
}
