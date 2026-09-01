import type { Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import packageJson from './package.json'

function isDemoBuild(mode: string): boolean {
  return mode === 'demo'
    || process.env.VITE_DEPLOYMENT_MODE === 'demo'
    || process.argv.includes('--demo')
}

/** Rewrite full-pack lore/loot/catalog imports to the demo substitutes. */
function demoCompendiumPlugin(enabled: boolean): Plugin {
  const swaps: Array<[RegExp, string]> = [
    [/world_lore_lord_of_the_mysteries\.md/, 'demo_world_lore_lord_of_the_mysteries.md'],
    [/\/loot\.json/, '/demo_loot.json'],
    [/\/item_catalog\.json/, '/demo_item_catalog.json'],
  ]
  return {
    name: 'demo-compendium',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!enabled || !importer) return null
      if (!source.includes('World_compendium/Lord of the Mysteries/')) return null
      let next = source
      for (const [pattern, replacement] of swaps) {
        if (pattern.test(next)) {
          next = next.replace(pattern, replacement)
          break
        }
      }
      if (next === source) return null
      return this.resolve(next, importer, { ...options, skipSelf: true })
    },
  }
}

export default defineConfig(({ mode }) => {
  const demo = isDemoBuild(mode)
  return {
    plugins: [react(), tailwindcss(), demoCompendiumPlugin(demo)],
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    // Use relative asset paths so index.html works when loaded via Electron's
    // loadFile() (file:// protocol). Without this, Vite emits /assets/... which
    // resolves to the filesystem root, not the dist folder.
    base: './',
    server: {
      host: process.env.HOST || '127.0.0.1',
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/assets': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
