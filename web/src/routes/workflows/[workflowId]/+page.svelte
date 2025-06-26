<script lang="ts">
  import type { Configuration, Status } from '$lib/schema'

  // Sample workflow configuration based on the schema
  import { sampleWorkflow } from './sample'

  // Sample cards for each status
  const sampleCards = {
    open: [
      { id: '1', title: 'Login form validation error', priority: 'High' },
      { id: '2', title: 'Page loading too slow', priority: 'Medium' }
    ],
    'in-progress': [
      { id: '3', title: 'Database connection timeout', priority: 'Critical', assignee: 'John Doe' }
    ],
    review: [{ id: '4', title: 'UI alignment issues', priority: 'Low', assignee: 'Jane Smith' }],
    testing: [
      { id: '5', title: 'Search functionality broken', priority: 'High', assignee: 'Bob Wilson' }
    ],
    closed: [
      { id: '6', title: 'Header responsive design', priority: 'Medium', assignee: 'Alice Johnson' }
    ]
  }
</script>

<div class="p-6">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
      {sampleWorkflow.name}
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Track and manage your workflow items through different stages
    </p>
  </div>

  <!-- Workflow Board -->
  <div class="flex gap-6 overflow-x-auto pb-4">
    {#each sampleWorkflow.statuses as status}
      <div class="w-80 flex-shrink-0">
        <!-- Status Column Header -->
        <div class="mb-4">
          <div class="mb-2 flex items-center gap-2">
            <div class="h-3 w-3 rounded-full" style="background-color: {status.ui.color}"></div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {status.title}
            </h2>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              ({sampleCards[status.slug]?.length || 0})
            </span>
          </div>
          {#if status.terminal}
            <span
              class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
            >
              Terminal
            </span>
          {/if}
        </div>

        <!-- Status Column Content -->
        <div class="min-h-96 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          {#if sampleCards[status.slug]}
            {#each sampleCards[status.slug] as card}
              <div
                class="mb-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-700"
              >
                <h3 class="mb-2 font-medium text-gray-900 dark:text-gray-100">
                  {card.title}
                </h3>
                <div class="flex flex-wrap gap-2 text-sm">
                  <span
                    class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {card.priority}
                  </span>
                  {#if card.assignee}
                    <span
                      class="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    >
                      {card.assignee}
                    </span>
                  {/if}
                </div>
              </div>
            {/each}
          {:else}
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">
              <p>No items in this status</p>
            </div>
          {/if}

          <!-- Add Card Button -->
          <button
            class="w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300"
          >
            + Add item
          </button>
        </div>
      </div>
    {/each}
  </div>

  <!-- Workflow Information -->
  <div
    class="mt-8 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
  >
    <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
      Workflow Configuration
    </h3>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
      <!-- Fields -->
      <div>
        <h4 class="mb-2 font-medium text-gray-900 dark:text-gray-100">Fields</h4>
        <div class="space-y-2">
          {#each sampleWorkflow.fields as field}
            <div class="flex items-center justify-between rounded bg-gray-50 p-2 dark:bg-gray-700">
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {field.title}
              </span>
              <span
                class="rounded bg-gray-200 px-2 py-1 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400"
              >
                {field.schema.kind}
              </span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Status Flow -->
      <div>
        <h4 class="mb-2 font-medium text-gray-900 dark:text-gray-100">Status Flow</h4>
        <div class="flex flex-wrap items-center gap-2">
          {#each sampleWorkflow.statuses as status, i}
            <div class="flex items-center gap-2">
              <span
                class="rounded-full px-3 py-1 text-xs font-medium text-white"
                style="background-color: {status.ui.color}"
              >
                {status.title}
              </span>
              {#if i < sampleWorkflow.statuses.length - 1}
                <span class="text-gray-400 dark:text-gray-500">→</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>
