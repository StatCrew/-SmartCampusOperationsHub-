import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  envDir: resolve(repoRoot),
  envPrefix: ['VITE_', 'BACKEND_'],
  plugins: [react(), tailwindcss()],
})
