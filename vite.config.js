import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Ensures all routes return index.html (SPA fallback)
    // Prevents 404 when refreshing on /dashboard, /doctor/dashboard, etc.
    historyApiFallback: true,
    port: 5173
  },
  preview: {
    // Same fallback for production preview
    port: 4173
  }
})
