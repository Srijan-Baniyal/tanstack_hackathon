import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

export default defineConfig({
  plugins: [
    react(),
    tanstackStart(),
    netlify(),
  ],
  ssr: {
    noExternal: ['streamdown', 'katex'],
  },
  build: {
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
})