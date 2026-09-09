// Logika penilaian hasil vs standar — dipakai form (auto status) & export.
// Aturan diselaraskan dengan file referensi Gabungan v2 (kolom Status):
// - Kimia Min/Maks/Range/pH-range, Negatif/TTD/Blm.
// - Mikro: konversi "a.b x 10^e" -> angka, "103" -> 10^3, dual m/M (3-class), M=NA, Negatif.

export function toDot(s) {
  if (s == null) return '';
  return String(s).replace(/(?<=\d),(?=\d)/g, '.');
}

// Ambil angka PERTAMA dari teks hasil (sudah titik). Kembalikan string angka
// ("1.8 x 10^2", "0.007") atau "" bila kualitatif (TTD/Negatif/Blm) —
// teks mengandung "negat" selalu dianggap kualitatif (angka 25g pada
// "Negatif / 25 g" BUKAN hasil).
export function extractNumber(hasilMentah) {
  const j = String(hasilMentah ?? '').trim();
  if (!j) return '';
  if (/negat/i.test(j)) return '';
  const m = j.match(/[0-9]/);
  if (!m) return '';
  const rest = j.slice(j.indexOf(m[0]));
  const xm = rest.match(/x/i);
  if (xm) {
    const xi = rest.search(/x/i);
    const coeff = rest.slice(0, xi).trim();
    const after = rest.slice(xi + 1);
    const cm = after.match(/\^?\s*([0-9]{1,2})/);
    const exp = cm ? cm[1] : '';
    if (!coeff || !exp) return '';
    return `${coeff} x 10^${exp}`;
  }
  const cand = rest.split(/\s/)[0].replace(/[%°]/g, '');
  return /^[0-9]*\.?[0-9]+$/.test(cand) ? cand : '';
}

export function keteranganOf(hasilMentah, nilaiHasil) {
  const j = String(hasilMentah ?? '').trim();
  if (!nilaiHasil) return j;
  return j.replace(nilaiHasil, '').replace(/\s+/g, ' ').trim();
}

// Nilai numerik untuk analisis. "1.8 x 10^2" -> 180. "" bila kualitatif.
export function hasilToNum(nilaiHasil) {
  if (!nilaiHasil) return null;
  const m = String(nilaiHasil).match(/^([0-9]+(?:\.[0-9]+)?)\s*x\s*10\^([0-9]+)$/);
  if (m) return parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10));
  const v = parseFloat(nilaiHasil);
  return Number.isFinite(v) ? v : null;
}

// Konversi angka standar mikro: "103"->1000, "1.0 x 104"->10000, "7.4"->7.4.
export function microStdToNum(nilaiStd) {
  if (nilaiStd == null || nilaiStd === '') return null;
  const s = String(nilaiStd).trim();
  if (/^10[0-9]$/.test(s)) return Math.pow(10, parseInt(s[2], 10));
  const m = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*x\s*10\^?([0-9]+)$/);
  if (m) return parseFloat(m[1]) * Math.pow(10, parseInt(m[2], 10));
  if (/^[0-9]*\.?[0-9]+$/.test(s)) return parseFloat(s);
  return null;
}

export function flagOf(hasilMentah) {
  const s = String(hasilMentah ?? '');
  if (/blm/i.test(s) || /belum/i.test(s) || /analisa koordinir/i.test(s)) return 'Blm';
  if (/tidak terdeteksi/i.test(s)) return 'TTD';
  if (/negat/i.test(s)) return 'Negatif';
  if (/ttd/i.test(s)) return 'TTD';
  if (s.trim().startsWith('<')) return '<';
  return '';
}

// std: {tipe, smin, smax, mnum, Mnum, kriteria}
// Mengembalikan: 'Memenuhi' | 'Tidak memenuhi' | 'Marginal (m<..≤M)' | 'Belum ada data' | 'Cek manual ...' | 'Tanpa batas numerik' | 'Memenuhi (...)' dst.
export function evalStatus({ jenisAnalisa, std, hasilMentah }) {
  const J = String(hasilMentah ?? '').trim();
  const flag = flagOf(J);
  const S = extractNumber(J);
  const hnum = hasilToNum(S);
  const tipe = std?.tipe || '';
  const isMicro = jenisAnalisa === 'Mikrobiologi';
  if (!std || std.missing) return 'Cek Standar (tidak ada di 2026)';
  if (flag === 'Blm') return 'Belum ada data';
  const num = (v) => (v === '' || v == null ? null : Number(v));
  const smin = num(std.smin), smax = num(std.smax);
  const mnum = num(std.mnum), Mnum = num(std.Mnum);
  if (isMicro) {
    if (flag === 'Negatif' || flag === 'TTD') {
      if (tipe === 'Kualitatif') return 'Memenuhi (Negatif)';
      if (tipe === 'm' || tipe === 'm/M') return 'Memenuhi (tak terdeteksi ≤m)';
      return 'Cek manual';
    }
    if (flag === '<') {
      if (tipe === 'm/M' && hnum != null && mnum != null && Mnum != null)
        return hnum <= mnum ? 'Memenuhi (≤m)' : 'Cek manual (tersensor)';
      if (tipe === 'm' && hnum != null && mnum != null)
        return hnum <= mnum ? 'Memenuhi (≤m)' : 'Cek manual (limit >m)';
      return 'Cek manual';
    }
    if (hnum != null) {
      if (tipe === 'm/M' && mnum != null && Mnum != null) {
        if (hnum <= mnum) return 'Memenuhi (≤m)';
        if (hnum <= Mnum) return 'Marginal (m<..≤M)';
        return 'Tidak memenuhi (>M)';
      }
      if (tipe === 'm' && mnum != null) return hnum <= mnum ? 'Memenuhi' : 'Tidak memenuhi';
      if (tipe === 'Kualitatif') return 'Cek manual (Std kualitatif)';
      if (tipe === 'Cek' || tipe === 'NA') return 'Tanpa batas numerik';
      return 'Cek manual';
    }
    return 'Cek manual';
  }
  // Kimia / Fisik
  if (flag === 'Negatif' || flag === 'TTD') {
    if (tipe === 'Kualitatif') return 'Memenuhi (Negatif)';
    if (['Min', 'Maks', 'Range'].includes(tipe)) return 'Memenuhi (tak terdeteksi) [CEK Min!]';
    return 'Cek manual';
  }
  if (hnum != null) {
    if (tipe === 'Range' && smin != null && smax != null)
      return hnum >= smin && hnum <= smax ? 'Memenuhi' : 'Tidak memenuhi';
    if (tipe === 'Min' && smin != null) return hnum >= smin ? 'Memenuhi' : 'Tidak memenuhi';
    if (tipe === 'Maks' && smax != null) return hnum <= smax ? 'Memenuhi' : 'Tidak memenuhi';
    if (tipe === 'Kualitatif') return hnum === 0 ? 'Memenuhi (nol)' : 'Cek manual (Std kualitatif, Hasil numerik)';
    if (tipe === 'Cek' || tipe === 'NA') return 'Tanpa batas numerik';
    return 'Cek manual';
  }
  return 'Cek manual';
}

export function stdText(std) {
  if (!std || std.missing) return '-';
  const parts = [];
  if (std.kriteria) parts.push(std.kriteria);
  if (std.nilai) parts.push(std.nilai);
  if (std.satuan) parts.push(std.satuan);
  return parts.join(' ').replace(/\s+/g, ' ').trim() || '-';
}

export function kesimpulanOf(details) {
  if (!details.length) return '';
  if (details.some((d) => d.status === 'Belum ada data')) return 'Belum lengkap';
  if (details.some((d) => /Tidak memenuhi/.test(d.status || ''))) return 'Ditolak';
  if (details.some((d) => /Cek|Tanpa batas/.test(d.status || ''))) return 'Cek manual';
  return 'Diterima';
}
