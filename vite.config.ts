import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-server-middleware',
        apply: 'serve',
        async configureServer(server) {
          const express = (await import('express')).default;
          const { db } = await import('./server/db');
          const { apiRouter } = await import('./server/api');
          try {
            console.log('[DEV_SERVER] Waiting for database hydration from Google Cloud Firestore...');
            await db.waitUntilReady(8000);
            console.log('[DEV_SERVER] Database ready.');
          } catch (e) {
            console.warn('[DEV_SERVER] Hydration timeout, proceeding:', e);
          }
          const app = express();
          app.use(express.json({ limit: '50mb' }));
          app.use(express.urlencoded({ extended: true, limit: '50mb' }));
          app.use('/api', apiRouter);

          server.middlewares.use((req, res, next) => {
            if (req.url && (req.url === '/api' || req.url.startsWith('/api/'))) {
              (app as any)(req, res, next);
            } else {
              next();
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('xlsx')) {
                return 'vendor-xlsx';
              }
              if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) {
                return 'vendor-firestore';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) {
                return 'vendor-recharts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-lucide';
              }
              if (id.includes('react') || id.includes('scheduler')) {
                return 'vendor-react';
              }
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch:
        process.env.DISABLE_HMR === 'true'
          ? null
          : {
              ignored: ['**/data/**', '**/data_safety*/**', '**/dist/**', '**/.db.tmp.*', '**/*.json.bak'],
            },
    },
  };
});
