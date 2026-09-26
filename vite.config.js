import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/storage-tools/',

  server: {
    watch: {
      usePolling: true,
    },
  },
})
