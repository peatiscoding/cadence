<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { FirebaseAuthenticationProvider } from '$lib/authentication/firebase/firebase-authen'
  import type { ICurrentSession } from '$lib/authentication/interface'
  import ThemeSwitcher from './ThemeSwitcher.svelte'
  import SpinnerIcon from '$lib/assets/spinner.svg?raw'
  import UserAvatarIcon from '$lib/assets/user-avatar.svg?raw'
  import GoogleLogoIcon from '$lib/assets/google-logo.svg?raw'

  let isLoggedIn = $state(false)
  let currentSession = $state<ICurrentSession | null>(null)
  let isLoading = $state(false)
  let error = $state('')
  let isInitializing = $state(true)
  let showUserMenu = $state(false)

  const authProvider = FirebaseAuthenticationProvider.shared()
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

    // Close user menu when clicking outside
    const handleClickOutside = () => {
      showUserMenu = false
    }
    document.addEventListener('click', handleClickOutside)

    return () => {
      document.removeEventListener('click', handleClickOutside)
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
      showUserMenu = false
    } catch (err) {
      error = err instanceof Error ? err.message : 'Logout failed'
    } finally {
      isLoading = false
    }
  }

  function toggleUserMenu(event: Event) {
    event.stopPropagation()
    showUserMenu = !showUserMenu
  }
</script>

<header class="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex h-16 items-center justify-between">
      <!-- Logo and Navigation -->
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">
            <span class="font-mono text-blue-600 dark:text-blue-400">Cadence</span>
          </h1>
        </div>
        <nav class="hidden md:ml-8 md:flex md:space-x-8">
          <a
            href="/"
            class="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          >
            Dashboard
          </a>
          <a
            href="/workflows"
            class="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          >
            Workflows
          </a>
          <a
            href="/projects"
            class="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
          >
            Projects
          </a>
        </nav>
      </div>

      <!-- Authentication Section -->
      <div class="flex items-center space-x-2">
        <!-- Theme Switcher -->
        <ThemeSwitcher />

        {#if error}
          <div
            class="rounded border border-red-400 bg-red-100 px-3 py-1 text-xs text-red-700 dark:border-red-600 dark:bg-red-900 dark:text-red-300"
          >
            {error}
          </div>
        {/if}

        {#if isInitializing}
          <div class="flex items-center">
            <div class="h-4 w-4 animate-spin text-gray-400 dark:text-gray-500">
              {@html SpinnerIcon}
            </div>
          </div>
        {:else if isLoggedIn}
          <!-- User Menu -->
          <div class="relative">
            <button
              onclick={toggleUserMenu}
              class="flex items-center rounded-full bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-gray-800 dark:focus:ring-offset-gray-800"
              disabled={isLoading}
            >
              <span class="sr-only">Open user menu</span>
              {#if currentSession?.avatarUrl}
                <img
                  class="h-8 w-8 rounded-full object-cover"
                  src={currentSession.avatarUrl}
                  alt={currentSession.displayName}
                />
              {:else}
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white"
                >
                  <div class="h-4 w-4">
                    {@html UserAvatarIcon}
                  </div>
                </div>
              {/if}
            </button>

            {#if showUserMenu}
              <div
                class="ring-opacity-5 absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black focus:outline-none dark:bg-gray-700 dark:ring-gray-600"
              >
                <div class="border-b border-gray-100 px-4 py-2 dark:border-gray-600">
                  <p class="text-sm text-gray-500 dark:text-gray-400">Signed in as</p>
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {currentSession?.displayName || 'Unknown User'}
                  </p>
                  <p class="truncate text-xs text-gray-400 dark:text-gray-500">
                    {currentSession?.email}
                  </p>
                </div>
                <button
                  onclick={handleLogout}
                  disabled={isLoading}
                  class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {isLoading ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            {/if}
          </div>
        {:else}
          <!-- Login Button -->
          <button
            onclick={handleLogin}
            disabled={isLoading}
            class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800"
          >
            {#if isLoading}
              <div class="h-4 w-4 animate-spin">
                {@html SpinnerIcon}
              </div>
              Signing in...
            {:else}
              <div class="h-4 w-4">
                {@html GoogleLogoIcon}
              </div>
              Sign in
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
</header>
