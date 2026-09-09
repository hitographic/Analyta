// ID database — dari link yang diberikan.
// Sheet: https://docs.google.com/spreadsheets/d/1DhvAd6qLGVKAI9f6NEa59HbM8yn3PiC-nNxh0aTIAfA/edit
// Folder: https://drive.google.com/drive/folders/1i2W5pdHQ0SMpkwQKP2LhcaKXOhsg2HJT
export const SHEET_ID = '1DhvAd6qLGVKAI9f6NEa59HbM8yn3PiC-nNxh0aTIAfA';
export const FOLDER_ID = '1i2W5pdHQ0SMpkwQKP2LhcaKXOhsg2HJT';

// Koneksi bawaan github.io -> Sheet (otomatis, tanpa isi Pengaturan).
// Disengaja public atas permintaan owner. Risiko: siapa pun yang paham devtools
// browser bisa ikut menulis ke Sheet. Bila disalahgunakan: jalankan setupToken()
// di Apps Script + New version, lalu update API_KEY di bawah + push ulang.
export const EXEC_URL = 'https://script.google.com/macros/s/AKfycbz1MbSaSTo44aQMxnS-MlHoium3NiZKPceeW76DHDSCHO8UN5Pugb1JHI87qbKAUxU/exec';
export const API_KEY = '23794e41590541c3';

// Nama tab di Google Sheet database (dibuat otomatis oleh setupSheets() di code.gs)
export const TABS = {
  standar: 'Standar',
  lha: 'LHA',
  detail: 'LHA_Detail',
  counter: 'Counter',
};
