<script lang="ts">
  import type { Configuration } from '$lib/schema'
  import { impls } from '$lib/impls'
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import WorkflowListItem from '$lib/components/WorkflowListItem.svelte'
  import ErrorIcon from '$lib/assets/error.svg?raw'
  import EmptyStateIcon from '$lib/assets/empty-state.svg?raw'
  import PlusIcon from '$lib/assets/plus.svg?raw'

  let workflows = $state<Array<Configuration & { workflowId: string }>>([])
  let loading = $state(true)
  let error = $state('')
  let isSupportDynamicWorkflows = $state(false)

  const storage = impls.configurationStore

  onMount(async () => {
    try {
      loading = true
      const result = await storage.listWorkflows()
      isSupportDynamicWorkflows = storage.isSupportDynamicWorkflows()
      workflows = result.workflows
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load workflows'
      console.error('Error loading workflows:', err)
    } finally {
      loading = false
    }
  })

  function navigateToWorkflow(workflowId: string) {
    goto(`/workflows/${workflowId}`)
  }

  function createNewWorkflow() {
    // TODO: Navigate to workflow creation page
    console.log('Create new workflow clicked')
  }
</script>

<div class="p-6">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Workflows</h1>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="flex items-center gap-3">
        <div
          class="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
        ></div>
        <span class="text-gray-600 dark:text-gray-400">Loading workflows...</span>
      </div>
    </div>
  {:else if error}
    <div
      class="rounded-lg border border-red-400 bg-red-100 p-4 dark:border-red-600 dark:bg-red-900"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <div class="h-5 w-5 text-red-400 dark:text-red-300">
            {@html ErrorIcon}
          </div>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
            Error loading workflows
          </h3>
          <p class="mt-1 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      </div>
    </div>
  {:else if workflows.length === 0}
    <div class="py-12 text-center">
      <div class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
        {@html EmptyStateIcon}
      </div>
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
        No workflows defined
      </h3>
      {#if isSupportDynamicWorkflows}
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by creating your first workflow configuration.
        </p>
        <div class="mt-6">
          <button
            class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            Create workflow
          </button>
        </div>
      {:else}
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          No accessible workflows for you. Please check with your admin.
        </p>
      {/if}
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Create New Workflow Card -->
      {#if isSupportDynamicWorkflows}
        <div
          class="group cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white shadow transition-all hover:border-blue-400 hover:shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-500"
          onclick={createNewWorkflow}
          role="button"
          tabindex="0"
          aria-label="Create new workflow"
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              createNewWorkflow()
            }
          }}
        >
          <div class="p-6">
            <div class="flex h-full min-h-[200px] flex-col items-center justify-center">
              <div
                class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 transition-colors group-hover:bg-blue-100 dark:bg-blue-900/20 dark:group-hover:bg-blue-900/40"
              >
                <div class="h-6 w-6 text-blue-600 dark:text-blue-400">
                  {@html PlusIcon}
                </div>
              </div>
              <h3 class="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                Create New Workflow
              </h3>
              <p class="text-center text-sm text-gray-500 dark:text-gray-400">
                Set up a new workflow configuration to manage your projects
              </p>
            </div>
          </div>
        </div>
      {/if}

      {#each workflows as workflow}
        <WorkflowListItem {workflow} onNavigate={navigateToWorkflow} />
      {/each}
    </div>
  {/if}
</div>
