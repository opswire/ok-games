import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  base: './',
  plugins: [
    legacy({
      targets: ['Chrome >= 51', 'Safari >= 10.3', 'iOS >= 10.3'],
      modernPolyfills: true,
    }),
  ],
  build: {
    assetsInlineLimit: 4096,
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});
