<script lang="ts">
  import '../app.css'
  import Header from '$lib/components/Header.svelte'
  import { onMount } from 'svelte'
  import { theme } from '$lib/stores/theme'

  let { children } = $props()

  // Initialize theme as early as possible
  onMount(() => {
    theme.initializeTheme()
  })
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <Header />
  <main>
    {@render children()}
  </main>
</div>
