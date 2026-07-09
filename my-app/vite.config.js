import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Output directly to the root /public folder so Express can serve it
    outDir: '../public',
    emptyOutDir: true,
  },
})

