import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    // Add this for better asset handling
    assetsDir: 'assets',
  },
  base: '/', // Change this from './' to '/'
})