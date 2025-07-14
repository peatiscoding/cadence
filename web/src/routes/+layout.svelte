<script lang="ts">
  import '../app.css'
  import Sidebar from '$lib/components/Sidebar.svelte'

  let { children } = $props()
  let sidebarOpen = $state(false)

  function closeSidebar() {
    sidebarOpen = false
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <Sidebar bind:sidebarOpen {closeSidebar} />
  <main class="lg:ml-64">
    {@render children()}
  </main>
</div>
