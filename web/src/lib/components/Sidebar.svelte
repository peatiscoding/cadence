<script lang="ts">
  import type { ICurrentSession } from '$lib/authentication/interface'

  import { onMount, onDestroy } from 'svelte'
  import { page } from '$app/stores'
  import {
    Button,
    Sidebar,
    SidebarGroup,
    SidebarItem,
    SidebarWrapper,
    SidebarButton,
    DarkMode,
    Spinner,
    uiHelpers
  } from 'flowbite-svelte'
  import {
    ChartOutline,
    ClipboardOutline as WorkflowOutline,
    GoogleSolid
  } from 'flowbite-svelte-icons'
  import { impls } from '$lib/impls'

  const sidebarUi = uiHelpers()
  let { sidebarOpen = $bindable(), closeSidebar } = $props()
  let isOpen = $state(false)
  const closeSidebarInternal = sidebarUi.close

  $effect(() => {
    isOpen = sidebarUi.isOpen
    sidebarOpen = isOpen
  })

  let isLoggedIn = $state(false)
  let currentSession = $state<ICurrentSession | null>(null)
  let isLoading = $state(false)
  let error = $state('')
  let isInitializing = $state(true)

  const authProvider = impls.authProvider
  let unsubscribeAuth: (() => void) | null = null

  onMount(() => {
    // Listen to auth state changes for session persistence
    unsubscribeAuth = authProvider.onAuthStateChanged((user) => {
      if (user) {
        currentSession = user
        isLoggedIn = true
      } else {
        currentSession = null
        isLoggedIn = false
      }
      isInitializing = false
    })

    // Global keyboard event handler for mobile menu
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeSidebarInternal()
      }
    }

    window.addEventListener('keydown', handleGlobalKeydown)

    return () => {
      window.removeEventListener('keydown', handleGlobalKeydown)
    }
  })

  onDestroy(() => {
    if (unsubscribeAuth) {
      unsubscribeAuth()
    }
  })

  async function handleLogin() {
    try {
      isLoading = true
      error = ''
      await authProvider.login()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Login failed'
    } finally {
      isLoading = false
    }
  }

  async function handleLogout() {
    try {
      isLoading = true
      error = ''
      await authProvider.logout()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Logout failed'
    } finally {
      isLoading = false
    }
  }

  function handleSidebarItemClick() {
    closeSidebarInternal()
  }
</script>

<SidebarButton onclick={sidebarUi.toggle} class="fixed top-4 left-4 z-50 lg:hidden" />

<Sidebar
  activeUrl={$page.url.pathname}
  backdrop={false}
  {isOpen}
  closeSidebar={closeSidebarInternal}
  params={{ x: -50, duration: 50 }}
  class="z-40 h-screen w-64 lg:fixed lg:z-0 lg:translate-x-0"
>
  <SidebarWrapper>
    <!-- Logo Section -->
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
        <span class="font-mono text-blue-600 dark:text-blue-400">cadence</span>
      </h1>
      <DarkMode
        class="px-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      />
    </div>

    <!-- Navigation Items -->
    <SidebarGroup>
      <SidebarItem
        label="Dashboard"
        href="/"
        onclick={handleSidebarItemClick}
        class={$page.url.pathname === '/'
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100'}
      >
        {#snippet icon()}
          <ChartOutline
            class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
          />
        {/snippet}
        Dashboard
      </SidebarItem>
      <SidebarItem
        label="Workflows"
        href="/workflows"
        onclick={handleSidebarItemClick}
        class={$page.url.pathname.startsWith('/workflows')
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100'}
      >
        {#snippet icon()}
          <WorkflowOutline
            class="h-5 w-5 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
          />
        {/snippet}
      </SidebarItem>
    </SidebarGroup>

    <!-- Bottom Section - Authentication -->
    <div class="absolute right-0 bottom-0 left-0 border-t border-gray-200 p-4 dark:border-gray-700">
      <!-- Error Display -->
      {#if error}
        <div
          class="mb-4 rounded border border-red-400 bg-red-100 px-3 py-2 text-xs text-red-700 dark:border-red-600 dark:bg-red-900 dark:text-red-300"
        >
          {error}
        </div>
      {/if}

      <!-- Authentication Section -->
      {#if isInitializing}
        <div class="flex justify-center">
          <Spinner color="blue" size="5" /> Please wait,
        </div>
      {:else if isLoggedIn}
        <!-- User Profile Section -->
        <div class="space-y-2">
          <div class="flex items-center space-x-3">
            <img
              src={currentSession?.avatarUrl}
              alt={currentSession?.displayName || 'User avatar'}
              class="h-8 w-8 rounded-full border border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-600"
              referrerpolicy="no-referrer"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                {currentSession?.displayName || 'Unknown User'}
              </p>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                {currentSession?.email}
              </p>
            </div>
          </div>
          <Button
            outline
            color="blue"
            onclick={handleLogout}
            disabled={isLoading}
            class="mt-2 w-full"
            size="xs"
          >
            {isLoading ? 'Signing out...' : 'Sign out'}
          </Button>
        </div>
      {:else}
        <!-- Login Button -->
        <Button onclick={handleLogin} color="blue" disabled={isLoading} class="w-full" size="xs">
          {#if isLoading}
            <Spinner color="blue" size="5" />
            &nbsp;Signing in...
          {:else}
            <GoogleSolid class="h-4 w-4" />
            &nbsp;Sign in
          {/if}
        </Button>
      {/if}
    </div>
  </SidebarWrapper>
</Sidebar>
