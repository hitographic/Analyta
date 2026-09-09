import React from 'react';

// Replika HTML 1:1 dari sheet "Layout" PDQC-018 untuk Export PDF (via dialog Print browser).
// Struktur: kop (PT INDOFOOD..., Kode Form), judul, No, info 6 baris, tabel
// NO | PARAMETER PEMERIKSAAN | STANDARD | HASIL ANALISA, Kesimpulan, tanda tangan.
export default function LhaPrint({ lha, onBack }) {
  const details = lha.details || [];
  const pad = [];
  for (let i = details.length; i < 18; i++) pad.push(i);
  const info = [
    ['Nama  Bahan  Baku / FG', lha.namaBahan],
    ['Flavour / Merk', lha.flavour],
    ['Jumlah', lha.jumlah],
    ['Supplier', lha.supplier],
    ['Kode  Produksi / Kode  Lot', lha.kodeLot],
    ['Umur', lha.umur],
  ];
  return (
    <div>
      <div className="no-print printbar">
        <button onClick={onBack}>← Kembali</button>
        <button onClick={() => window.print()}>Cetak / Simpan PDF</button>
        <span>Ukuran kertas: A4 Portrait (sama dengan template Excel).</span>
      </div>
      <div className="lha-sheet">
        <div className="lha-head">
          <div className="lha-corp">PT&nbsp;&nbsp;INDOFOOD&nbsp;&nbsp;CBP&nbsp;&nbsp;SUKSES&nbsp;&nbsp;MAKMUR&nbsp;&nbsp;Tbk</div>
          <div className="lha-formcode">Kode&nbsp;&nbsp;Form<br />No. Terbitan<br />Tgl. Efektif</div>
          <div className="lha-formval">:&nbsp;&nbsp;&nbsp;&nbsp;PDQC - 018<br />:&nbsp;&nbsp;&nbsp;&nbsp;1.3<br />:&nbsp;&nbsp;&nbsp;&nbsp;28&nbsp;&nbsp;Februari&nbsp;&nbsp;2011</div>
        </div>
        <div className="lha-div">DIVISI&nbsp;&nbsp;NOODLE&nbsp;&nbsp;-&nbsp;&nbsp;PABRIK&nbsp;&nbsp;CIBITUNG</div>
        <div className="lha-title">LAPORAN&nbsp;&nbsp;HASIL&nbsp;&nbsp;ANALISA / MONITORING&nbsp;&nbsp;RM / FG</div>
        <div className="lha-no">No.&nbsp;&nbsp;:&nbsp;&nbsp;{lha.noAnalisa || '/ M /'}</div>
        <table className="lha-info">
          <tbody>
            {info.map(([k, v], i) => (
              <tr key={i}><td className="k">{k}</td><td className="c">:</td><td className="v">{v || ''}</td></tr>
            ))}
          </tbody>
        </table>
        <table className="lha-table">
          <thead>
            <tr><th className="no">NO.</th><th>PARAMETER&nbsp;&nbsp;PEMERIKSAAN</th><th>STANDARD</th><th>HASIL&nbsp;&nbsp;ANALISA</th></tr>
          </thead>
          <tbody>
            {details.map((d, i) => (
              <tr key={i}><td className="no">{d.no ?? i + 1}</td><td>{d.parameter}</td><td>{d.standard}</td><td>{d.hasil}</td></tr>
            ))}
            {pad.map((i) => (
              <tr key={'p' + i}><td className="no">{details.length + (i - details.length) + 1}</td><td></td><td></td><td></td></tr>
            ))}
          </tbody>
        </table>
        <div className="lha-foot">Kesimpulan&nbsp;&nbsp;:&nbsp;&nbsp;{lha.kesimpulan || ''}</div>
        <div className="lha-date">Cibitung,&nbsp;&nbsp;{lha.tanggal || '…………………………'}</div>
        <div className="lha-sign">
          <div>Diperiksa&nbsp;&nbsp;Oleh,<br /><br /><br /><br />{lha.diperiksaOleh || 'QC  RM/FG  Analis / QC  RM/FG  Field'}</div>
          <div>Mengetahui,<br /><br /><br /><br />{lha.mengetahui || 'QC RM/FG Spv / QC RM/FG Sect. Spv'}</div>
        </div>
      </div>
    </div>
  );
}
