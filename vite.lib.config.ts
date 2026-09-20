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
      external: [
        'react',
        'react/jsx-runtime',
        '@base-ui/react/button',
        '@base-ui/react/slider',
        'framer-motion',
      ],
    },
  },
})
