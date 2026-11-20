import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../',
  // Don't watch the build output (dist is served/committed separately) — avoids
  // EBUSY file-lock crashes when a build runs while the dev server is up.
  server: {
    watch: { ignored: ['**/dist/**'] },
  },
})
