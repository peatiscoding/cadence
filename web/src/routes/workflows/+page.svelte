<script lang="ts">
  import type { Configuration } from '$lib/schema'
  import { FirestoreWorkflowCardStorage } from '$lib/persistent/firebase/firestore'
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import WorkflowIcon from '$lib/assets/workflow.svg?raw'
  import ErrorIcon from '$lib/assets/error.svg?raw'
  import EmptyStateIcon from '$lib/assets/empty-state.svg?raw'
  import ChevronRightIcon from '$lib/assets/chevron-right.svg?raw'
  import PlusIcon from '$lib/assets/plus.svg?raw'

  let workflows = $state<Array<Configuration & { workflowId: string }>>([])
  let loading = $state(true)
  let error = $state('')

  const storage = FirestoreWorkflowCardStorage.shared()

  onMount(async () => {
    try {
      loading = true
      const result = await storage.listWorkflows()
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

  function getStatusCount(workflow: Configuration & { workflowId: string }) {
    return workflow.statuses.length
  }

  function getFieldCount(workflow: Configuration & { workflowId: string }) {
    return workflow.fields.length
  }

  function getTerminalStatusCount(workflow: Configuration & { workflowId: string }) {
    return workflow.statuses.filter(status => status.terminal).length
  }
</script>

<div class="p-6">
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
      Workflows
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Manage and organize your workflow configurations
    </p>
  </div>

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="flex items-center gap-3">
        <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-gray-600 dark:text-gray-400">Loading workflows...</span>
      </div>
    </div>
  {:else if error}
    <div class="rounded-lg bg-red-100 border border-red-400 p-4 dark:bg-red-900 dark:border-red-600">
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
    <div class="text-center py-12">
      <div class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500">
        {@html EmptyStateIcon}
      </div>
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No workflows found</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Get started by creating your first workflow configuration.
      </p>
      <div class="mt-6">
        <button
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Create workflow
        </button>
      </div>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <!-- Create New Workflow Card -->
      <div 
        class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group"
        onclick={createNewWorkflow}
      >
        <div class="p-6">
          <div class="flex flex-col items-center justify-center h-full min-h-[200px]">
            <div class="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
              <div class="w-6 h-6 text-blue-600 dark:text-blue-400">
                {@html PlusIcon}
              </div>
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Create New Workflow
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
              Set up a new workflow configuration to manage your projects
            </p>
          </div>
        </div>
      </div>

      {#each workflows as workflow}
        <div 
          class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer relative"
          onclick={() => navigateToWorkflow(workflow.workflowId)}
        >
          <div class="p-6 pb-14">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <div class="w-5 h-5 text-blue-600 dark:text-blue-400">
                    {@html WorkflowIcon}
                  </div>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Workflow
                  </dt>
                  <dd class="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {workflow.name}
                  </dd>
                </dl>
              </div>
            </div>
            
            {#if workflow.description}
              <p class="mt-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {workflow.description}
              </p>
            {/if}

            <div class="mt-4 grid grid-cols-3 gap-4">
              <div class="text-center">
                <div class="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {getStatusCount(workflow)}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  Statuses
                </div>
              </div>
              <div class="text-center">
                <div class="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {getFieldCount(workflow)}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  Fields
                </div>
              </div>
              <div class="text-center">
                <div class="text-lg font-medium text-gray-900 dark:text-gray-100">
                  {getTerminalStatusCount(workflow)}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  Terminal
                </div>
              </div>
            </div>

            {#if workflow.statuses.length > 0}
              <div class="mt-4">
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">Status Flow</div>
                <div class="flex items-center gap-1 overflow-x-auto">
                  {#each workflow.statuses.slice(0, 4) as status, i}
                    <div class="flex items-center gap-1 flex-shrink-0">
                      <div 
                        class="w-2 h-2 rounded-full"
                        style="background-color: {status.ui.color}"
                        title={status.title}
                      ></div>
                      {#if i < Math.min(workflow.statuses.length, 4) - 1}
                        <div class="w-2 h-px bg-gray-300 dark:bg-gray-600"></div>
                      {/if}
                    </div>
                  {/each}
                  {#if workflow.statuses.length > 4}
                    <span class="text-xs text-gray-400 dark:text-gray-500 ml-1">
                      +{workflow.statuses.length - 4}
                    </span>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
          
          <div class="absolute bottom-0 left-0 right-0 bg-gray-50 dark:bg-gray-700 px-6 py-3 rounded-b-lg">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 dark:text-gray-400">
                ID: {workflow.workflowId}
              </span>
              <div class="w-4 h-4 text-gray-400 dark:text-gray-500">
                {@html ChevronRightIcon}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>