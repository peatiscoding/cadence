<script lang="ts">
  import type { ActivityLog } from '@cadence/shared/types'
  import {
    PlusOutline,
    EditOutline,
    ArrowRightOutline,
    TrashBinOutline,
    QuestionCircleOutline,
    ClipboardListOutline
  } from 'flowbite-svelte-icons'

  interface Props {
    recentActivities: ActivityLog[]
    loading?: boolean
  }

  let { recentActivities, loading = false }: Props = $props()

  function getActionConfig(action: string) {
    switch (action) {
      case 'create':
        return {
          bgColor: 'bg-blue-100 dark:bg-blue-900',
          textColor: 'text-blue-600 dark:text-blue-300',
          IconComponent: PlusOutline
        }
      case 'update':
        return {
          bgColor: 'bg-yellow-100 dark:bg-yellow-900',
          textColor: 'text-yellow-600 dark:text-yellow-300',
          IconComponent: EditOutline
        }
      case 'transit':
        return {
          bgColor: 'bg-green-100 dark:bg-green-900',
          textColor: 'text-green-600 dark:text-green-300',
          IconComponent: ArrowRightOutline
        }
      case 'delete':
        return {
          bgColor: 'bg-red-100 dark:bg-red-900',
          textColor: 'text-red-600 dark:text-red-300',
          IconComponent: TrashBinOutline
        }
      default:
        return {
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          textColor: 'text-gray-600 dark:text-gray-400',
          IconComponent: QuestionCircleOutline
        }
    }
  }

  function getActionText(activity: ActivityLog): string {
    const { action, changes, cardTitle } = activity

    // Find the status change for transit actions
    const statusChange = changes.find((c) => c.key === 'status')

    switch (action) {
      case 'create':
        return `Created card "${cardTitle}"`
      case 'update':
        return `Updated card "${cardTitle}"`
      case 'transit':
        if (statusChange) {
          return `Moved card "${cardTitle}" from "${statusChange.from}" to "${statusChange.to}"`
        }
        return `Changed status of card "${cardTitle}"`
      case 'delete':
        return `Deleted card "${cardTitle}"`
      default:
        return `Modified card "${cardTitle}"`
    }
  }

  function formatTimeAgo(timestamp: any): string {
    // Handle both Firestore Timestamp and JavaScript Date
    let date: Date
    if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate()
    } else if (timestamp && typeof timestamp.toMillis === 'function') {
      date = new Date(timestamp.toMillis())
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else {
      return 'Unknown time'
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) {
      return 'Just now'
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    } else {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    }
  }
</script>

<div class="rounded-lg bg-white shadow dark:bg-gray-800">
  <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
    <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Activity</h2>
  </div>
  <div class="p-6">
    {#if loading}
      <div class="space-y-4">
        {#each Array(3) as _}
          <div class="flex animate-pulse items-start space-x-3">
            <div class="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div class="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else if recentActivities.length === 0}
      <div class="py-8 text-center">
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
        >
          <ClipboardListOutline class="h-6 w-6 text-gray-400" />
        </div>
        <h3 class="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
          No recent activity
        </h3>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Activity will appear here when you start working with cards.
        </p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each recentActivities as activity (activity.workflowCardId + activity.timestamp)}
          {@const actionConfig = getActionConfig(activity.action)}
          {@const IconComponent = actionConfig.IconComponent}
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0">
              <div
                class="flex h-8 w-8 items-center justify-center rounded-full {actionConfig.bgColor}"
              >
                <IconComponent class="h-4 w-4 {actionConfig.textColor}" />
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-gray-900 dark:text-gray-100">
                {getActionText(activity)}
                {#if activity.workflowId}
                  <span class="text-gray-500 dark:text-gray-400">in {activity.workflowId}</span>
                {/if}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {formatTimeAgo(activity.timestamp)}
              </p>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

