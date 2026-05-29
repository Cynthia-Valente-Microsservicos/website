import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8080',
      '/products': 'http://localhost:8080',
      '/orders': 'http://localhost:8080',
      '/accounts': 'http://localhost:8080',
    },
  },
})
