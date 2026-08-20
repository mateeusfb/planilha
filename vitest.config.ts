import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `server-only` é um marcador que lança ao ser importado fora do servidor.
      // Nos testes ele vira o módulo vazio, senão nada em src/lib/server/ é testável.
      'server-only': path.resolve(__dirname, './node_modules/server-only/empty.js'),
    },
  },
});
