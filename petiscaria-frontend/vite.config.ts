import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Define a variável global que o SockJS/StompJS esperam encontrar
    global: 'window',
  },
})