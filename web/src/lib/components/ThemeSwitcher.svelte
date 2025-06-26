<script lang="ts">
  import { onMount } from 'svelte'
  import { theme } from '$lib/stores/theme'
  import MoonIcon from '$lib/assets/moon.svg?raw'
  import SunIcon from '$lib/assets/sun.svg?raw'

  let currentTheme = $state('light')

  onMount(() => {
    // Subscribe to theme changes
    const unsubscribe = theme.subscribe((t) => {
      currentTheme = t
    })

    return unsubscribe
  })

  function toggleTheme() {
    theme.toggleTheme()
  }
</script>

<button
  onclick={toggleTheme}
  class="inline-flex items-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-200"
  title={currentTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
>
  <span class="sr-only">Toggle theme</span>
  {#if currentTheme === 'light'}
    <!-- Moon icon for dark mode -->
    <div class="h-5 w-5">
      {@html MoonIcon}
    </div>
  {:else}
    <!-- Sun icon for light mode -->
    <div class="h-5 w-5">
      {@html SunIcon}
    </div>
  {/if}
</button>
