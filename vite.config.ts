import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'

const enableCloudflare = process.env.CLOUDFLARE === 'true'

export default defineConfig({
  // Use a relative base so the app works when served from a subpath (e.g., GitHub Pages)
  base: './',
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    ...(enableCloudflare
      ? [cloudflare({ viteEnvironment: { name: 'ssr' } })]
      : []),
    tanstackStart(),
    viteReact(),
  ],
})
