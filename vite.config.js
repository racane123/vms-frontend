import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Performance-relevant choices in this config:
//
// 1. Dev proxy: the browser only ever talks to one origin (this dev server),
//    which avoids CORS preflight round-trips during development.
//
// 2. manualChunks: recharts (~90KB gzipped) is split into its own chunk and
//    only loaded when a route that actually renders a chart is visited
//    (combined with React.lazy on the admin dashboard route in App.jsx).
//    Students voting never download it at all.
//
// 3. React and React DOM are split into a stable "vendor" chunk so browsers
//    cache them across deploys instead of re-downloading on every app update.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Only recharts (and its d3 internals) gets its own chunk — this is
          // the dependency worth isolating, since the student voting flow
          // never touches it. Everything else is left to Rollup's default
          // chunking, which avoids circular-import chunk warnings that come
          // from hand-splitting React/react-dom away from packages that
          // reference them at module-eval time.
          if (id.includes('node_modules') && (id.includes('recharts') || id.includes('d3-'))) {
            return 'charts';
          }
        },
      },
    },
  },
});
