import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { qrcode } from 'vite-plugin-qrcode';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), qrcode()],
  server: {
    port: 3000,
    // Only use proxy in development mode
    ...(mode === 'development' && {
      proxy: {
        '/api': 'http://localhost:3001',
      },
    }),
  },
}))
