import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  base: '/spotify/',
  plugins: [vue(), mode !== 'production' && vueDevTools(), tailwindcss()].filter(Boolean),
  resolve: {
    alias: {
      '@':    fileURLToPath(new URL('./src',          import.meta.url)),
      'core': fileURLToPath(new URL('../../core', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5176,
    proxy: {
      '/api/spotify': {
        target: process.env.API_TARGET || 'http://localhost:3002',
        changeOrigin: true,
      },
    },
    allowedHosts: ['nucleus.home', 'server.tail874d1f.ts.net'],
  },
}))
