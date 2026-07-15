import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
// Data (fixtures/results/audience) lives in Google Sheets and is read/written
// directly from the browser (see src/lib/sheets.js, src/lib/googleAuth.js).
// This is a plain static site - no server, no functions/ directory.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), cloudflare()],
  // GitHub Pages serves this as a project site at /serie-a-tv-audience/,
  // so the build needs to know its own base path. Local dev stays at "/".
  base: mode === 'production' ? '/serie-a-tv-audience/' : '/',
}))