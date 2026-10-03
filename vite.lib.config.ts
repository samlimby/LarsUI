import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    copyPublicDir: false,
    lib: {
      cssFileName: 'style',
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      output: { banner: '"use client";' },
      external: (id) => /^(react|react-dom|@base-ui\/react|lucide-react|framer-motion|loading-dev)(\/|$)/.test(id),
    },
  },
})
