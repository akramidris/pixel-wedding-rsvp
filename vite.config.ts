import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { getPagesBase } from './scripts/pages-base';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  base: command === 'build' || isPreview ? getPagesBase() : '/',
  build: { rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } },
}));
