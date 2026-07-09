import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // If building on Vercel, output to 'dist' (Vercel's required default).
    // Otherwise, output to '../public' so Express backend can serve it locally.
    outDir: process.env.VERCEL ? 'dist' : '../public',
    emptyOutDir: true,
  },
})

