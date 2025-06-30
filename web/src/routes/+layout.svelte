<script lang="ts">
  import '../app.css'
  import Header from '$lib/components/Header.svelte'

  let { children } = $props()
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <Header />
  <main>
    {@render children()}
  </main>
</div>
