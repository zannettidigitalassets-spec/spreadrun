import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { SITE_TITLE, META_DESCRIPTION } from './src/launchConfig.js'

// Fills the %SITE_TITLE% and %META_DESCRIPTION% placeholders in index.html from src/launchConfig.js
const launchMeta = () => ({
  name: 'launch-meta',
  transformIndexHtml: (html) => html
    .replaceAll('%SITE_TITLE%', SITE_TITLE)
    .replaceAll('%META_DESCRIPTION%', META_DESCRIPTION),
})

export default defineConfig({
  plugins: [react(), launchMeta()],
})
