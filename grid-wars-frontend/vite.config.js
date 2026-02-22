import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Uncomment below for local dev to proxy API calls
      // '/tiles': 'http://localhost:8080',
      // '/capture': 'http://localhost:8080',
      // '/register': 'http://localhost:8080',
      // '/leaderboard': 'http://localhost:8080',
      // '/ws': { target: 'ws://localhost:8080', ws: true },
    }
  }
})
