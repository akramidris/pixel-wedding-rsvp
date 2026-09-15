import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { getPagesBase } from './scripts/pages-base';
import { assertPublicSupabaseConfig } from './scripts/env-security';

export default defineConfig(({ command, isPreview, mode }) => {
  assertPublicSupabaseConfig({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env });
  return {
    plugins: [react()],
    base: command === 'build' || isPreview ? getPagesBase() : '/',
    build: { rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } },
  };
});
