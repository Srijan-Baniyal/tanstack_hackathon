import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

const enableCloudflare = process.env.CLOUDFLARE === 'true'

export default defineConfig({
  base: './',
  server: {
    port: 3000,
  },

  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),

    // ⛅ Only enable Cloudflare plugin when deploying
    ...(enableCloudflare
      ? [cloudflare({ viteEnvironment: { name: 'ssr' } })]
      : []),

    tanstackStart(),
    viteReact(),
  ],

  // 🚀 The FIX: KaTeX must NOT be bundled into the worker
  ssr: {
    external: ['katex'],
  },

  // ❗ Do NOT set build.ssr = true — TanStack Start manages SSR internally
  build: {
    // Prevent bundler from choking on CSS/font assets
    assetsInlineLimit: 0,
  },
})