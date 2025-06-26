<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { FirebaseAuthenticationProvider } from '$lib/authentication/firebase/firebase-authen'

  let isLoggedIn = $state(false)
  let userUid = $state('')
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
        userUid = user.uid
        isLoggedIn = true
      } else {
        userUid = ''
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

<header class="border-b border-gray-200 bg-white shadow-sm">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div class="flex h-16 items-center justify-between">
      <!-- Logo and Navigation -->
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <h1 class="text-xl font-bold text-gray-900">
            <span class="font-mono text-blue-600">Cadence</span>
          </h1>
        </div>
        <nav class="hidden md:ml-8 md:flex md:space-x-8">
          <a href="/" class="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
            Dashboard
          </a>
          <a
            href="/workflows"
            class="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Workflows
          </a>
          <a
            href="/projects"
            class="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Projects
          </a>
        </nav>
      </div>

      <!-- Authentication Section -->
      <div class="flex items-center">
        {#if error}
          <div class="mr-4 rounded border border-red-400 bg-red-100 px-3 py-1 text-xs text-red-700">
            {error}
          </div>
        {/if}

        {#if isInitializing}
          <div class="flex items-center">
            <svg class="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        {:else if isLoggedIn}
          <!-- User Menu -->
          <div class="relative">
            <button
              onclick={toggleUserMenu}
              class="flex items-center rounded-full bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
              disabled={isLoading}
            >
              <span class="sr-only">Open user menu</span>
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white"
              >
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
            </button>

            {#if showUserMenu}
              <div
                class="ring-opacity-5 absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black focus:outline-none"
              >
                <div class="border-b border-gray-100 px-4 py-2">
                  <p class="text-sm text-gray-500">Signed in as</p>
                  <p class="truncate text-sm font-medium text-gray-900">
                    <code class="rounded bg-gray-100 px-1 text-xs">{userUid}</code>
                  </p>
                </div>
                <button
                  onclick={handleLogout}
                  disabled={isLoading}
                  class="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
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
            class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50"
          >
            {#if isLoading}
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                  fill="none"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Signing in...
            {:else}
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
</header>
