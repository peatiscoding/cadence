<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { Card, Indicator, Listgroup, Spinner } from 'flowbite-svelte'
  import { impls } from '$lib/impls'
  import { supportedWorkflows } from '@cadence/shared/defined'
  import {
    type WorkflowStatistics,
    type StatusStatistics,
    computeWorkflowStatisticsFromStats
  } from '@cadence/shared/statistics'
  import { formatAmount, formatElapsedTime, formatCardCount } from '$lib/utils/format'

  let workflowStats = $state<WorkflowStatistics[]>([])
  let isLoading = $state(true)
  let error = $state<string | null>(null)

  const configurationStore = impls.configurationStore
  const storage = impls.storage

  onMount(async () => {
    try {
      await loadWorkflowStatistics()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load workflow statistics'
      isLoading = false
    }
  })

  onDestroy(() => {
    // No subscriptions to clean up with stats-based approach
  })

  async function loadWorkflowStatistics() {
    try {
      isLoading = true
      error = null

      // Get all workflow configurations
      const { workflows } = await configurationStore.listWorkflows()

      // Load stats from Firestore stats documents (much more efficient!)
      const allStatsPerWorkflow = await storage.getAllWorkflowStats(
        workflows.map((w) => w.workflowId)
      )

      // Compute statistics from stats documents
      workflowStats = workflows.map((wf) =>
        computeWorkflowStatisticsFromStats(wf, allStatsPerWorkflow[wf.workflowId])
      )
      isLoading = false
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load workflow statistics'
      isLoading = false
    }
  }

  function getStatusColor(statusSlug: string, workflow: WorkflowStatistics): string {
    // Find the workflow configuration to get status colors
    const workflowConfig = supportedWorkflows.find((w) => w.workflowId === workflow.workflowId)
    if (!workflowConfig) return '#6B7280'

    const status = workflowConfig.statuses.find((s) => s.slug === statusSlug)
    return status?.ui?.color || '#6B7280'
  }

  function getWorkflowConfig(workflowId: string) {
    return supportedWorkflows.find((w) => w.workflowId === workflowId)
  }

  function isTerminalStatus(statusId: string, workflowId: string): boolean {
    const workflowConfig = getWorkflowConfig(workflowId)
    if (!workflowConfig) return false

    const status = workflowConfig.statuses.find((s) => s.slug === statusId)
    return status?.terminal || false
  }
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Workflow Statistics</h2>
    {#if isLoading}
      <Spinner size="4" color="blue" />
    {/if}
  </div>

  {#if error}
    <div class="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
      <div class="text-sm text-red-700 dark:text-red-400">
        Error: {error}
      </div>
    </div>
  {:else if isLoading}
    <div class="flex items-center justify-center py-16">
      <Spinner color="blue" size="6" />
      <span class="ml-3 text-gray-600 dark:text-gray-400">Loading workflow statistics...</span>
    </div>
  {:else if workflowStats.length === 0}
    <div class="py-16 text-center">
      <div class="text-gray-500 dark:text-gray-400">No workflow statistics available</div>
    </div>
  {:else}
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {#each workflowStats as workflow}
        <Card class="p-4">
          <div class="mb-3 flex items-center justify-between">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {workflow.workflowName}
              </h3>
              <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formatCardCount(workflow.active.currentCardCount - 0, workflow.nouns, 'active')} worth
                <b>{formatAmount(workflow.active.currentTotalValue)}</b>
              </div>
            </div>
            <div class="text-lg font-semibold text-gray-900 dark:text-gray-100"></div>
          </div>

          <Listgroup items={workflow.statusStats} class="border-0 dark:bg-transparent!">
            {#snippet children(item)}
              {@const status = item as StatusStatistics}
              <div class="flex items-center space-x-4 py-2 rtl:space-x-reverse">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                    <Indicator
                      class="mr-1 inline-flex"
                      style="background-color: {getStatusColor(status.statusId, workflow)}"
                    />
                    {status.statusName}
                  </p>
                  <p class="truncate text-sm text-gray-500 dark:text-gray-400">
                    {formatCardCount(status.currentCardCount, workflow.nouns)}
                  </p>
                </div>
                <div class="text-right">
                  <div
                    class="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white"
                  >
                    {(status.currentCardCount > 0 && formatAmount(status.currentTotalValue)) || '-'}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    {#if isTerminalStatus(status.statusId, workflow.workflowId)}
                      Total: {formatElapsedTime(status.currentAverageElapsedTime)}
                    {:else if status.currentCardCount > 0}
                      Avg: {formatElapsedTime(status.currentAverageElapsedTime)}
                    {/if}
                  </div>
                </div>
              </div>
            {/snippet}
          </Listgroup>
        </Card>
      {/each}
    </div>
  {/if}
</div>
