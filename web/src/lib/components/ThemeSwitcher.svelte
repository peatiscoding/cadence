<script lang="ts">
  import { onMount } from 'svelte'
  import { theme } from '$lib/stores/theme'

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
    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  {:else}
    <!-- Sun icon for light mode -->
    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  {/if}
</button>
