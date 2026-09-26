import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/raid-calculator/',

  server: {
    watch: {
      usePolling: true,
    },
  },
})