import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    host: true,   // This allows access from other devices in the network
    port: 3000,   // Default port for Vite dev server
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Example proxy, you can remove this if you don't need it
        changeOrigin: true,
      },
    },
  },
})
