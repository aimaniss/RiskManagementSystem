import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      // semua request /api/... akan dipass ke backend Express
      '/api': {
        target: 'http://localhost:5000', // ganti ikut port backend awak
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
