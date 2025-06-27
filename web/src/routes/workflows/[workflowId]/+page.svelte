<script lang="ts">
  // TODO: Sample workflow configuration based on the schema, replace me
  import { sampleWorkflow, sampleCards } from '$lib/sample'
  import SettingsIcon from '$lib/assets/settings.svg?raw'
  import WorkflowConfiguration from '$lib/components/WorkflowConfiguration.svelte'

  let showConfigModal = $state(false)

  function toggleConfigModal() {
    showConfigModal = !showConfigModal
  }

  function closeModal(event: Event) {
    if (event.target === event.currentTarget) {
      showConfigModal = false
    }
  }
</script>

<div class="p-6">
  <div class="mb-6">
    <div class="flex items-center gap-3">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {sampleWorkflow.name}
      </h1>
      <button
        onclick={toggleConfigModal}
        class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        title="Workflow Settings"
      >
        <div class="h-5 w-5">
          {@html SettingsIcon}
        </div>
      </button>
    </div>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Track and manage your workflow items through different stages
    </p>
  </div>

  <!-- Workflow Board -->
  <div class="flex gap-6 overflow-x-auto pb-4">
    <!-- Draft Column (Reserved) -->
    <div class="w-80 flex-shrink-0">
      <!-- Draft Column Header -->
      <div class="mb-4">
        <div class="mb-2 flex items-center gap-2">
          <div class="h-3 w-3 rounded-full bg-gray-400"></div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Draft</h2>
          <span class="text-sm text-gray-500 dark:text-gray-400"> (0) </span>
        </div>
      </div>

      <!-- Draft Column Content -->
      <div
        class="min-h-96 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800"
      >
        <div class="py-8 text-center text-gray-500 dark:text-gray-400">
          <p class="mb-4">No draft items</p>
          <!-- Add Card Button -->
          <button
            class="w-full rounded-lg border-2 border-dashed border-blue-300 px-4 py-3 text-blue-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-blue-600 dark:text-blue-400 dark:hover:border-blue-500 dark:hover:text-blue-300"
          >
            + Add new item
          </button>
        </div>
      </div>
    </div>

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
        </div>

        <!-- Status Column Content -->
        <div
          class="min-h-96 rounded-lg bg-gray-50 p-4 dark:bg-gray-800 {status.terminal
            ? 'border-2'
            : ''}"
          style={status.terminal ? `border-color: ${status.ui.color}` : ''}
        >
          {#if sampleCards[status.slug]}
            {#each sampleCards[status.slug] as card}
              <div
                class="mb-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-gray-700"
              >
                <h3 class="mb-2 font-medium text-gray-900 dark:text-gray-100">
                  {card.title}
                </h3>
                <p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  {card.description}
                </p>
                <div class="flex flex-wrap gap-2 text-sm">
                  {#if card.fieldData.priority}
                    <span
                      class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    >
                      {card.fieldData.priority}
                    </span>
                  {/if}
                  {#if card.owner}
                    <span
                      class="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                    >
                      {card.owner.split('@')[0]}
                    </span>
                  {/if}
                  {#if card.fieldData.estimated_hours}
                    <span
                      class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
                    >
                      {card.fieldData.estimated_hours}h
                    </span>
                  {/if}
                  <span
                    class="inline-flex items-center rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                  >
                    {card.type}
                  </span>
                </div>
              </div>
            {/each}
          {:else}
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">
              <p>No items in this status</p>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<!-- Configuration Modal -->
{#if showConfigModal}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    onclick={closeModal}
  >
    <div
      class="mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800"
    >
      <!-- Modal Header -->
      <div
        class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700"
      >
        <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Workflow Configuration
        </h2>
        <button
          onclick={() => (showConfigModal = false)}
          class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-6">
        <WorkflowConfiguration workflow={sampleWorkflow} />
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-end border-t border-gray-200 p-6 dark:border-gray-700">
        <button
          onclick={() => (showConfigModal = false)}
          class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
