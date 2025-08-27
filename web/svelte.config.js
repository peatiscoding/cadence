import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

const config = {
  preprocess: vitePreprocess(),
  kit: {
    alias: {
      '@cadence/shared/*': '../shared/src/*',
      '@cadence/api-client': '../api-client/src/index.ts'
    },
    adapter: adapter({
      fallback: 'index.html'
    })
  }
}

export default config
