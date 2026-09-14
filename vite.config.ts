import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    // Same shape as production, where Caddy proxies /parties to the game
    // server: the client always talks to the host it was served from.
    proxy: {
      '/parties': {
        target: 'http://localhost:3000',
        ws: true,
      },
    },
  },
})
