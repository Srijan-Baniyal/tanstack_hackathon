import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

const isProd = process.env.CLOUDFLARE === 'true'

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    react(),
    tanstackStart(),

    // Only use Cloudflare plugin when deploying
    ...(isProd
      ? [
          cloudflare({
            // Let Vite fully bundle the worker,
            // do NOT let Cloudflare’s esbuild bundle anything
            remoteBindings: true,
            // Required for SSR correctness
            viteEnvironment: { name: 'ssr' },
          }),
        ]
      : []),
  ],

  ssr: {
    // Prevent KaTeX from getting bundled into worker (fixes fonts crash)
    external: ['katex'],
  },

  build: {
    assetsInlineLimit: 0,
    modulePreload: false, // fix for Workers streaming issues
    cssCodeSplit: true,
  },
})