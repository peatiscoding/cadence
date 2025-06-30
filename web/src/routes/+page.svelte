<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { impls } from '$lib/impls'

  let isLoggedIn = $state(false)
  let userUid = $state('')
  let isInitializing = $state(true)

  const authProvider = impls.authProvider
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
  })

  onDestroy(() => {
    if (unsubscribeAuth) {
      unsubscribeAuth()
    }
  })
</script>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  {#if isInitializing}
    <div class="flex items-center justify-center py-16">
      <svg class="h-8 w-8 animate-spin text-blue-500 dark:text-blue-400" viewBox="0 0 24 24">
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
      <span class="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
    </div>
  {:else if isLoggedIn}
    <!-- Dashboard Content -->
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p class="mt-2 text-gray-600 dark:text-gray-400">
          Welcome back! Here's what's happening with your projects.
        </p>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500 text-white"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Projects</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">12</p>
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-md bg-green-500 text-white"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Tasks</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">84</p>
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500 text-white"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">In Progress</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">23</p>
            </div>
          </div>
        </div>

        <div class="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-md bg-red-500 text-white"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue</p>
              <p class="text-2xl font-semibold text-gray-900 dark:text-gray-100">5</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="rounded-lg bg-white shadow dark:bg-gray-800">
        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Activity</h2>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <svg class="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-gray-900 dark:text-gray-100">
                  <span class="font-medium">You</span> created a new task in
                  <span class="font-medium">Website Redesign</span>
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">2 hours ago</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <svg class="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-gray-900 dark:text-gray-100">
                  Task <span class="font-medium">"Update user interface"</span> was completed
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">4 hours ago</p>
              </div>
            </div>
            <div class="flex items-start space-x-3">
              <div class="flex-shrink-0">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                  <svg class="h-4 w-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-gray-900 dark:text-gray-100">
                  Task <span class="font-medium">"Database migration"</span> is overdue
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Welcome Screen for Non-authenticated Users -->
    <div class="text-center">
      <div class="mx-auto max-w-md">
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900"
        >
          <svg
            class="h-6 w-6 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h2 class="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">Welcome to Cadence</h2>
        <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">
          A configurable project management tool designed to adapt to your workflow.
        </p>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Please sign in to access your dashboard and start managing your projects.
        </p>
      </div>

      <div class="mt-12">
        <div class="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div class="pt-6">
            <div class="flow-root rounded-lg bg-white px-6 pb-8 shadow dark:bg-gray-800">
              <div class="-mt-6">
                <div>
                  <span
                    class="inline-flex items-center justify-center rounded-md bg-blue-500 p-3 shadow-lg"
                  >
                    <svg
                      class="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </span>
                </div>
                <h3
                  class="mt-8 text-lg font-medium tracking-tight text-gray-900 dark:text-gray-100"
                >
                  Fast Setup
                </h3>
                <p class="mt-5 text-base text-gray-500 dark:text-gray-400">
                  Get started quickly with pre-configured workflows that adapt to your team's needs.
                </p>
              </div>
            </div>
          </div>

          <div class="pt-6">
            <div class="flow-root rounded-lg bg-white px-6 pb-8 shadow dark:bg-gray-800">
              <div class="-mt-6">
                <div>
                  <span
                    class="inline-flex items-center justify-center rounded-md bg-green-500 p-3 shadow-lg"
                  >
                    <svg
                      class="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                      />
                    </svg>
                  </span>
                </div>
                <h3
                  class="mt-8 text-lg font-medium tracking-tight text-gray-900 dark:text-gray-100"
                >
                  Configurable
                </h3>
                <p class="mt-5 text-base text-gray-500 dark:text-gray-400">
                  Customize workflows, fields, and transitions to match your unique processes.
                </p>
              </div>
            </div>
          </div>

          <div class="pt-6">
            <div class="flow-root rounded-lg bg-white px-6 pb-8 shadow dark:bg-gray-800">
              <div class="-mt-6">
                <div>
                  <span
                    class="inline-flex items-center justify-center rounded-md bg-purple-500 p-3 shadow-lg"
                  >
                    <svg
                      class="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </span>
                </div>
                <h3
                  class="mt-8 text-lg font-medium tracking-tight text-gray-900 dark:text-gray-100"
                >
                  Analytics
                </h3>
                <p class="mt-5 text-base text-gray-500 dark:text-gray-400">
                  Track progress and gain insights with comprehensive reporting and analytics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
