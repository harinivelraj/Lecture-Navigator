import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/search_timestamps': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/ingest_video': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/dashboard_metrics': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/evaluate_mrr': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      }
    }
  }
});
