import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

const config = {
  preprocess: vitePreprocess(),
  kit: {
    alias: {
      '@cadence/shared/*': '../shared/src/*'
    },
    adapter: adapter({
      fallback: 'index.html'
    })
  }
}

export default config
