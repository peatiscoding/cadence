<script lang="ts">
  import type { WorkflowConfiguration as WorkflowConfiguration } from '@cadence/shared/types'
  import WorkflowIcon from '$lib/assets/workflow.svg?raw'
  import { ChevronRightOutline } from 'flowbite-svelte-icons'

  interface Props {
    workflow: WorkflowConfiguration & { workflowId: string }
    onNavigate: (workflowId: string) => void
  }

  let { workflow, onNavigate }: Props = $props()

  function getStatusCount(workflow: WorkflowConfiguration & { workflowId: string }) {
    return workflow.statuses.length
  }

  function getFieldCount(workflow: WorkflowConfiguration & { workflowId: string }) {
    return workflow.fields.length
  }

  function getTerminalStatusCount(workflow: WorkflowConfiguration & { workflowId: string }) {
    return workflow.statuses.filter((status) => status.terminal).length
  }

  function handleClick() {
    onNavigate(workflow.workflowId)
  }
</script>

<div
  class="relative cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white shadow transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
  onclick={handleClick}
  role="button"
  tabindex="0"
  aria-label="Open workflow: {workflow.name}"
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }}
>
  <div class="p-6 pb-14">
    <div class="flex items-center">
      <div class="flex-shrink-0">
        <div
          class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900"
        >
          <div class="h-5 w-5 text-blue-600 dark:text-blue-400">
            {@html WorkflowIcon}
          </div>
        </div>
      </div>
      <div class="ml-5 w-0 flex-1">
        <dl>
          <dt class="truncate text-sm font-medium text-gray-500 dark:text-gray-400">Workflow</dt>
          <dd class="text-lg font-medium text-gray-900 dark:text-gray-100">
            {workflow.name}
          </dd>
        </dl>
      </div>
    </div>

    {#if workflow.description}
      <p class="mt-4 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
        {workflow.description}
      </p>
    {/if}

    <div class="mt-4 grid grid-cols-3 gap-4">
      <div class="text-center">
        <div class="text-lg font-medium text-gray-900 dark:text-gray-100">
          {getStatusCount(workflow)}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Statuses</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-medium text-gray-900 dark:text-gray-100">
          {getFieldCount(workflow)}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Fields</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-medium text-gray-900 dark:text-gray-100">
          {getTerminalStatusCount(workflow)}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Terminal</div>
      </div>
    </div>

    {#if workflow.statuses.length > 0}
      <div class="mt-4">
        <div class="mb-2 text-xs text-gray-500 dark:text-gray-400">Status Flow</div>
        <div class="flex items-center gap-1 overflow-x-auto">
          {#each workflow.statuses.slice(0, 4) as status, i}
            <div class="flex flex-shrink-0 items-center gap-1">
              <div
                class="h-2 w-2 rounded-full"
                style="background-color: {status.ui.color}"
                title={status.title}
              ></div>
              {#if i < Math.min(workflow.statuses.length, 4) - 1}
                <div class="h-px w-2 bg-gray-300 dark:bg-gray-600"></div>
              {/if}
            </div>
          {/each}
          {#if workflow.statuses.length > 4}
            <span class="ml-1 text-xs text-gray-400 dark:text-gray-500">
              +{workflow.statuses.length - 4}
            </span>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <div class="absolute right-0 bottom-0 left-0 rounded-b-lg bg-gray-50 px-6 py-3 dark:bg-gray-700">
    <div class="flex items-center justify-between">
      <span class="text-xs text-gray-500 dark:text-gray-400">
        ID: {workflow.workflowId}
      </span>
      <div class="h-4 w-4 text-gray-400 dark:text-gray-500">
        <ChevronRightOutline />
      </div>
    </div>
  </div>
</div>
