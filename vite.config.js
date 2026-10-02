import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pages are prerendered after the client build by scripts/prerender.mjs (see package.json "build").
export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022' }, // top-level await in entry-client.jsx
})
