<script lang="ts">
  import '../app.css'
  import Sidebar from '$lib/components/Sidebar.svelte'

  let { children } = $props()
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <Sidebar />
  <main class="ml-64">
    {@render children()}
  </main>
</div>
