/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// `base` only applies to the production build (the site is served from the
// `/dnt/` project-pages subpath at https://nbutko.github.io/dnt/). Dev stays at
// root so `npm run dev` keeps serving the app and /docs/... at 127.0.0.1:5173/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/dnt/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    passWithNoTests: true,
  },
}))
