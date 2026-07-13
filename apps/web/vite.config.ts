import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Túnel rápido do Cloudflare (docker-compose.yml, profile "tunnel") gera um
    // subdomínio aleatório *.trycloudflare.com a cada execução.
    allowedHosts: ['.trycloudflare.com'],
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
