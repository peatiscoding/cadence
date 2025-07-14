<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Spinner } from 'flowbite-svelte'
  import { impls } from '$lib/impls'
  import RecentActivities from '$lib/components/RecentActivities.svelte'
  import type { ActivityLog } from '@cadence/shared/types'
  import type { ILiveUpdateChange } from '$lib/models/live-update'

  let isLoggedIn = $state(false)
  let userUid = $state('')
  let isInitializing = $state(true)
  let recentActivities = $state<ActivityLog[]>([])
  let activitiesLoading = $state(true)

  const authProvider = impls.authProvider
  const storage = impls.storage
  let unsubscribeAuth: (() => void) | null = null
  let unsubscribeActivities: (() => void) | null = null

  onMount(() => {
    // Listen to auth state changes for session persistence
    unsubscribeAuth = authProvider.onAuthStateChanged((user) => {
      if (user) {
        userUid = user.uid
        isLoggedIn = true
        setupActivityListener()
      } else {
        userUid = ''
        isLoggedIn = false
        if (unsubscribeActivities) {
          unsubscribeActivities()
          unsubscribeActivities = null
        }
        recentActivities = []
        activitiesLoading = true
      }
      isInitializing = false
    })
  })

  onDestroy(() => {
    if (unsubscribeAuth) {
      unsubscribeAuth()
    }
    if (unsubscribeActivities) {
      unsubscribeActivities()
    }
  })

  function setupActivityListener() {
    if (unsubscribeActivities) {
      unsubscribeActivities()
    }

    let isInitialLoad = true

    const listener = storage
      .listenForRecentActivities(5)
      .onDataChanges((changes: ILiveUpdateChange<ActivityLog>[]) => {
        // Handle real-time updates to activities
        if (isInitialLoad) {
          // On initial load, collect all 'added' items and sort them properly
          const addedActivities = changes
            .filter((change) => change.type === 'added')
            .map((change) => change.data)
            .sort((a, b) => {
              // Sort by timestamp descending (newest first)
              const aTime =
                a.timestamp && typeof a.timestamp.toMillis === 'function'
                  ? a.timestamp.toMillis()
                  : new Date(a.timestamp as any).getTime()
              const bTime =
                b.timestamp && typeof b.timestamp.toMillis === 'function'
                  ? b.timestamp.toMillis()
                  : new Date(b.timestamp as any).getTime()
              return bTime - aTime
            })

          recentActivities = addedActivities.slice(0, 5)
          isInitialLoad = false
        } else {
          // For subsequent real-time updates, handle changes individually
          changes.forEach((change) => {
            if (change.type === 'added') {
              // Add new activity to the beginning of the list
              recentActivities = [change.data, ...recentActivities].slice(0, 5)
            } else if (change.type === 'modified') {
              // Update existing activity
              const index = recentActivities.findIndex(
                (a) =>
                  a.workflowCardId === change.data.workflowCardId &&
                  a.timestamp === change.data.timestamp
              )
              if (index !== -1) {
                recentActivities[index] = change.data
              }
            } else if (change.type === 'removed') {
              // Remove activity
              recentActivities = recentActivities.filter(
                (a) =>
                  !(
                    a.workflowCardId === change.data.workflowCardId &&
                    a.timestamp === change.data.timestamp
                  )
              )
            }
          })
        }
        activitiesLoading = false
      })

    unsubscribeActivities = listener.listen()
  }
</script>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  {#if isInitializing}
    <div class="flex items-center justify-center py-16">
      <Spinner color="blue" size="6" />
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
      <RecentActivities {recentActivities} loading={activitiesLoading} />
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
