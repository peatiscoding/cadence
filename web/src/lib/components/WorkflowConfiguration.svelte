<script lang="ts">
  import type { Configuration } from '$lib/schema'

  interface Props {
    workflow: Configuration
    editable?: boolean
  }

  let { workflow = $bindable(), editable = false }: Props = $props()
</script>

<div class="space-y-8">
  {#if editable}
    <!-- Workflow Metadata (Editable) -->
    <div class="space-y-4">
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Workflow Details</h3>

      <div>
        <label
          for="workflowName"
          class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Workflow Name
        </label>
        <input
          id="workflowName"
          type="text"
          bind:value={workflow.name}
          class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          placeholder="Enter workflow name"
        />
      </div>

      <div>
        <label
          for="workflowDescription"
          class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Description
        </label>
        <textarea
          id="workflowDescription"
          bind:value={workflow.description}
          rows="3"
          class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          placeholder="Enter workflow description"
        ></textarea>
      </div>
    </div>
  {/if}

  <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
    <!-- Status Flow -->
    <div>
      <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Status Flow</h3>
      <div class="space-y-3">
        {#each workflow.statuses as status}
          <div
            class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700"
          >
            <div class="mb-2 flex items-center gap-3">
              <div class="h-4 w-4 rounded-full" style="background-color: {status.ui.color}"></div>
              <span class="font-medium text-gray-900 dark:text-gray-100">
                {status.title}
              </span>
              {#if status.terminal}
                <span
                  class="rounded bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900 dark:text-green-200"
                >
                  Terminal
                </span>
              {/if}
            </div>
            <p class="mb-2 text-xs text-gray-500 dark:text-gray-500">
              Slug: {status.slug}
            </p>
            {#if status.precondition.required.length > 0}
              <div class="text-xs text-gray-600 dark:text-gray-400">
                <span class="font-medium">Required fields:</span>
                {status.precondition.required.join(', ')}
              </div>
            {/if}
            {#if status.precondition.from.length > 0}
              <div class="mt-1 text-xs text-gray-600 dark:text-gray-400">
                <span class="font-medium">From statuses:</span>
                {status.precondition.from.join(', ')}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
    <!-- Fields -->
    <div>
      <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Fields</h3>
      <div class="space-y-3">
        {#each workflow.fields as field}
          <div
            class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700"
          >
            <div class="mb-2 flex items-center justify-between">
              <span class="font-medium text-gray-900 dark:text-gray-100">
                {field.title}
              </span>
              <span
                class="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {field.schema.kind}
              </span>
            </div>
            <p class="mb-2 text-sm text-gray-600 dark:text-gray-400">
              {field.description}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              Slug: {field.slug}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
