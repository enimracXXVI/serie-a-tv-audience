import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// API routes (/api/*) are Cloudflare Pages Functions (see ./functions).
// For local dev with the API, run `npm run dev` via wrangler (see package.json),
// which proxies static/HMR requests to this Vite server.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
