import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

export default defineConfig({
  plugins: [
    tanstackStart(),
    netlify(),
  ],
  ssr: {
    noExternal: ['streamdown', 'katex'],
  },
  build: {
    rollupOptions: {
      output: {
        // Ensure CSS is handled during build
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
})