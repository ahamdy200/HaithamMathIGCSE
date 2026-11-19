import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: process.env.GITHUB_PAGES ? '/HaithamMathIGCSE/' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Ignore runtime state & uploaded PDF assets so background grading saves never trigger HMR reloads
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              ignored: ['**/data/**', '**/public/assets/**'],
            },
    },
  };
});
