import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build menghasilkan SATU file dist/index.html (inline JS+CSS) agar bisa
// ditempel langsung sebagai file Html di Apps Script (HtmlService).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100 * 1024 * 1024,
    chunkSizeWarningLimit: 5000,
  },
});
