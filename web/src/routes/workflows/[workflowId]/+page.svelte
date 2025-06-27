<script lang="ts">
  import type { Configuration } from '$lib/schema'
  import type { IWorkflowCardEntry } from '$lib/models/interface'
  import type { PageData } from './$types'
  import { onMount } from 'svelte'
  import { FirestoreWorkflowCardStorage } from '$lib/persistent/firebase/firestore'
  import { FirebaseAuthenticationProvider } from '$lib/authentication/firebase/firebase-authen'
  import SettingsIcon from '$lib/assets/settings.svg?raw'
  import WorkflowConfiguration from '$lib/components/WorkflowConfiguration.svelte'

  type PConf = Configuration

  let { data }: { data: PageData } = $props()

  let showConfigModal = $state(false)
  let editableWorkflow = $state<PConf | null>(null)
  let configSnapshot = $state<PConf>({} as any)
  let cards = $state<IWorkflowCardEntry[]>([])
  let loading = $state(true)
  let error = $state('')

  const storage = FirestoreWorkflowCardStorage.shared()
  const authProvider = FirebaseAuthenticationProvider.shared()

  // Group cards by status
  const cardsByStatus = $derived(
    cards.reduce(
      (acc, card) => {
        if (!acc[card.status]) {
          acc[card.status] = []
        }
        acc[card.status].push(card)
        return acc
      },
      {} as Record<string, IWorkflowCardEntry[]>
    )
  )

  onMount(() => {
    let isDestroyed = false

    // Wait for authentication to be ready, then load data
    const unsubscribe = authProvider.onAuthStateChanged(async (user) => {
      if (isDestroyed) return

      if (user) {
        try {
          loading = true
          error = ''

          const configuration = await storage.loadConfig(data.workflowId)

          if (!configuration) {
            error = 'Workflow not found'
            return
          }

          editableWorkflow = { ...configuration }

          // TODO: Load cards for this workflow when available
          // const cardsResult = await storage.listCards(data.workflowId)
          // cards = cardsResult.cards
        } catch (err) {
          console.error('Error loading workflow:', err)
          error = err instanceof Error ? err.message : 'Failed to load workflow'
        } finally {
          loading = false
        }
      } else {
        // User not authenticated, redirect or show login
        error = 'Authentication required'
        loading = false
      }
    })

    return () => {
      isDestroyed = true
      unsubscribe()
    }
  })

  function openConfigModal() {
    if (!editableWorkflow) return
    // Take snapshot of current state before opening modal
    configSnapshot = { ...editableWorkflow }
    showConfigModal = true
  }

  function closeModal(event: Event) {
    if (event.target === event.currentTarget) {
      handleCancel()
    }
  }

  async function handleSave() {
    if (!editableWorkflow) return
    try {
      // Create a plain object copy to avoid Svelte proxy issues with Firestore
      const plainWorkflow = JSON.parse(JSON.stringify(editableWorkflow))
      await storage.setConfig(data.workflowId, plainWorkflow)
      showConfigModal = false
      console.log('Workflow saved successfully')
    } catch (err) {
      console.error('Error saving workflow:', err)
      // TODO: Show error message to user
    }
  }

  function handleCancel() {
    if (!editableWorkflow) return
    // Restore to the state before modal was opened
    editableWorkflow = { ...configSnapshot }
    showConfigModal = false
  }
</script>

<div class="p-6">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="flex items-center gap-3">
        <div
          class="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
        ></div>
        <span class="text-gray-600 dark:text-gray-400">Loading workflow...</span>
      </div>
    </div>
  {:else if error}
    <div
      class="rounded-lg border border-red-400 bg-red-100 p-4 dark:border-red-600 dark:bg-red-900"
    >
      <div class="flex">
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800 dark:text-red-200">Error loading workflow</h3>
          <p class="mt-1 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        </div>
      </div>
    </div>
  {:else if editableWorkflow}
    <div class="mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {editableWorkflow.name}
        </h1>
        <button
          onclick={openConfigModal}
          class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Workflow Settings"
        >
          <div class="h-5 w-5">
            {@html SettingsIcon}
          </div>
        </button>
      </div>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        {editableWorkflow.description ||
          'Track and manage your workflow items through different stages'}
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
          class="min-h-96 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800"
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

      {#each editableWorkflow.statuses as status}
        <div class="w-80 flex-shrink-0">
          <!-- Status Column Header -->
          <div class="mb-4">
            <div class="mb-2 flex items-center gap-2">
              <div class="h-3 w-3 rounded-full" style="background-color: {status.ui.color}"></div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {status.title}
              </h2>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                ({cardsByStatus[status.slug]?.length || 0})
              </span>
            </div>
          </div>

          <!-- Status Column Content -->
          <div
            class="min-h-96 rounded-lg bg-gray-50 p-4 shadow-sm dark:bg-gray-800 {status.terminal
              ? 'border-2'
              : 'border border-gray-200 dark:border-gray-700'}"
            style={status.terminal ? `border-color: ${status.ui.color}` : ''}
          >
            {#if cardsByStatus[status.slug]}
              {#each cardsByStatus[status.slug] as card}
                <div
                  class="mb-3 cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:hover:border-blue-600"
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
  {/if}
</div>

<!-- Configuration Modal -->
{#if showConfigModal && editableWorkflow}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    onclick={closeModal}
    aria-roledescription="modal"
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
          aria-label="edit workflow's configurations"
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
        <WorkflowConfiguration bind:workflow={editableWorkflow} editable={true} />
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700">
        <button
          onclick={handleCancel}
          class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          onclick={handleSave}
          class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
{/if}
