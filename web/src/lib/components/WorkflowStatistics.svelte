<script lang="ts">
  import type { IWorkflowCardEntry } from '@cadence/shared/types'
  import type { ILiveUpdateChange } from '$lib/models/live-update'
  import { onMount, onDestroy } from 'svelte'
  import { Card, Indicator, Listgroup, Spinner } from 'flowbite-svelte'
  import { impls } from '$lib/impls'
  import { supportedWorkflows } from '@cadence/shared/defined'
  import {
    computeAllWorkflowStatistics,
    formatElapsedTime,
    type WorkflowStatistics,
    type StatusStatistics
  } from '@cadence/shared/statistics'
  import { formatAmount } from '$lib/utils/format'

  let workflowStats = $state<WorkflowStatistics[]>([])
  let isLoading = $state(true)
  let error = $state<string | null>(null)

  const configurationStore = impls.configurationStore
  const storage = impls.storage

  let unsubscribers: (() => void)[] = []

  onMount(async () => {
    try {
      await loadWorkflowStatistics()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load workflow statistics'
      isLoading = false
    }
  })

  onDestroy(() => {
    unsubscribers.forEach((unsub) => unsub())
  })

  async function loadWorkflowStatistics() {
    try {
      isLoading = true
      error = null

      // Get all workflow configurations
      const { workflows } = await configurationStore.listWorkflows()

      // Load all cards from all workflows
      const allWorkflowPromises = workflows.map(async (workflow) => {
        return new Promise<IWorkflowCardEntry[]>((resolve) => {
          const cards: IWorkflowCardEntry[] = []
          let isInitialLoad = true

          const listener = storage
            .listenForCards(workflow.workflowId)
            .onDataChanges((changes: ILiveUpdateChange<IWorkflowCardEntry>[]) => {
              if (isInitialLoad) {
                // Initial load - collect all cards
                changes
                  .filter((change) => change.type === 'added')
                  .forEach((change) => cards.push(change.data))
                isInitialLoad = false
                resolve(cards)
              } else {
                // Real-time updates - update statistics
                let needsUpdate = false

                changes.forEach((change) => {
                  if (change.type === 'added') {
                    cards.push(change.data)
                    needsUpdate = true
                  } else if (change.type === 'modified') {
                    const index = cards.findIndex(
                      (c) => c.workflowCardId === change.data.workflowCardId
                    )
                    if (index !== -1) {
                      cards[index] = change.data
                      needsUpdate = true
                    }
                  } else if (change.type === 'removed') {
                    const index = cards.findIndex(
                      (c) => c.workflowCardId === change.data.workflowCardId
                    )
                    if (index !== -1) {
                      cards.splice(index, 1)
                      needsUpdate = true
                    }
                  }
                })

                if (needsUpdate) {
                  // Recompute statistics when cards change
                  updateStatistics()
                }
              }
            })

          const unsubscribe = listener.listen()
          unsubscribers.push(unsubscribe)
        })
      })

      // Wait for all workflows to load their cards
      const allWorkflowCards = await Promise.all(allWorkflowPromises)
      const allCards = allWorkflowCards.flat()

      // Compute initial statistics
      workflowStats = computeAllWorkflowStatistics(workflows, allCards)
      isLoading = false
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load workflow statistics'
      isLoading = false
    }
  }

  async function updateStatistics() {
    try {
      // Get fresh workflow configurations
      const { workflows } = await configurationStore.listWorkflows()

      // Since we're using live listeners, we need to collect current cards
      // from each workflow's live data - this is a simplified approach
      // In a real implementation, you might want to maintain the card collections
      // more efficiently

      const allCardsPromises = workflows.map(async (workflow) => {
        return new Promise<IWorkflowCardEntry[]>((resolve) => {
          const cards: IWorkflowCardEntry[] = []

          const listener = storage
            .listenForCards(workflow.workflowId)
            .onDataChanges((changes: ILiveUpdateChange<IWorkflowCardEntry>[]) => {
              changes
                .filter((change) => change.type === 'added')
                .forEach((change) => cards.push(change.data))
              resolve(cards)
            })

          const unsubscribe = listener.listen()
          // Immediately unsubscribe after getting the data
          setTimeout(() => unsubscribe(), 100)
        })
      })

      const allWorkflowCards = await Promise.all(allCardsPromises)
      const allCards = allWorkflowCards.flat()

      // Recompute statistics
      workflowStats = computeAllWorkflowStatistics(workflows, allCards)
    } catch (err) {
      console.error('Failed to update statistics:', err)
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

  function formatCardCount(count: number, nouns: { singular: string; plural: string }): string {
    const noun = count === 1 ? nouns.singular : nouns.plural
    return `${count} ${noun.toLowerCase()}`
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
                Active Value: {formatAmount(workflow.values.currentValue)}
              </div>
            </div>
            <div class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatCardCount(workflow.totalCardCount - 0, workflow.nouns)}
            </div>
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
                    {#if !isTerminalStatus(status.statusId, workflow.workflowId)}
                      Avg: {formatElapsedTime(status.currentAverageElapsedTime)}
                    {:else}
                      Terminal status
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
