<script lang="ts">
  import type { Configuration } from '$lib/schema'
  import type { IWorkflowCardEntry } from '$lib/models/interface'
  import type { PageData } from './$types'
  import { onMount } from 'svelte'
  import { FirestoreWorkflowCardStorage } from '$lib/persistent/firebase/firestore'
  import { FirebaseAuthenticationProvider } from '$lib/authentication/firebase/firebase-authen'
  import SettingsIcon from '$lib/assets/settings.svg?raw'
  import WorkflowConfiguration from '$lib/components/WorkflowConfiguration.svelte'
  import WorkflowCardForm from '$lib/components/WorkflowCardForm.svelte'
  import { WorkflowFactory } from '$lib/workflow/factory'

  type PConf = Configuration

  let { data }: { data: PageData } = $props()

  let showConfigModal = $state(false)
  let showCardFormModal = $state(false)
  let showErrorModal = $state(false)
  let editableWorkflow = $state<PConf | null>(null)
  let configSnapshot = $state<PConf>({} as any)
  let cards = $state<IWorkflowCardEntry[]>([])
  let loading = $state(true)
  let error = $state('')
  let errorModalTitle = $state('')
  let errorModalMessage = $state('')
  let cardFormSubmitting = $state(false)
  let editingCard = $state<IWorkflowCardEntry | null>(null)
  let cardFormTargetStatus = $state<string | undefined>(undefined)

  const storage = FirestoreWorkflowCardStorage.shared()
  const authProvider = FirebaseAuthenticationProvider.shared()

  // Create workflow engine for card operations
  const workflowFactory = WorkflowFactory.use(storage, storage, authProvider)
  const workflowEngine = workflowFactory.getWorkflowEngine(data.workflowId)

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
    let cardsUnsubscribe: (() => void) | null = null

    // Global keyboard event handler
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showErrorModal) {
          closeErrorModal()
        } else if (showConfigModal) {
          handleCancel()
        } else if (showCardFormModal) {
          closeCardFormModal()
        }
        return
      }

      // Only handle global shortcuts when no modal is open and no input is focused
      if (showConfigModal || showCardFormModal || showErrorModal) return
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        openCardFormModal()
      } else if (event.key === 'c' || event.key === 'C') {
        event.preventDefault()
        openConfigModal()
      }
    }

    // Add global keyboard listener
    window.addEventListener('keydown', handleGlobalKeydown)

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

          // Set up live listening for cards
          cardsUnsubscribe = storage
            .listenForCards(data.workflowId)
            .onDataChanges((changes) => {
              if (isDestroyed) return

              // Process the changes to update our cards array
              changes.forEach((change) => {
                const cardData = change.data

                switch (change.type) {
                  case 'added':
                    // Add new card if it doesn't already exist
                    if (!cards.find((card) => card.workflowCardId === cardData.workflowCardId)) {
                      cards = [...cards, cardData]
                    }
                    break

                  case 'modified':
                    // Update existing card
                    cards = cards.map((card) =>
                      card.workflowCardId === cardData.workflowCardId ? cardData : card
                    )
                    break

                  case 'removed':
                    // Remove deleted card
                    cards = cards.filter((card) => card.workflowCardId !== cardData.workflowCardId)
                    break
                }
              })
            })
            .listen()
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
      cardsUnsubscribe?.()
      window.removeEventListener('keydown', handleGlobalKeydown)
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

      // Show user-friendly error message
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while saving the workflow configuration'
      showError('Failed to Save Workflow', errorMessage)
    }
  }

  function handleCancel() {
    if (!editableWorkflow) return
    // Restore to the state before modal was opened
    editableWorkflow = { ...configSnapshot }
    showConfigModal = false
  }

  // Card creation and editing handlers
  function openCardFormModal() {
    editingCard = null
    cardFormTargetStatus = undefined
    showCardFormModal = true
  }

  function openCardEditModal(card: IWorkflowCardEntry, targetStatus?: string) {
    editingCard = card
    cardFormTargetStatus = targetStatus
    showCardFormModal = true
  }

  function closeCardFormModal() {
    showCardFormModal = false
    cardFormSubmitting = false
    editingCard = null
    cardFormTargetStatus = undefined
  }

  // Error modal functions
  function showError(title: string, message: string) {
    errorModalTitle = title
    errorModalMessage = message
    showErrorModal = true
  }

  function closeErrorModal() {
    showErrorModal = false
    errorModalTitle = ''
    errorModalMessage = ''
  }

  async function handleCardSubmit(cardData: any) {
    if (!editableWorkflow) return

    try {
      cardFormSubmitting = true

      if (editingCard) {
        // Update existing card
        const updatePayload: any = { ...cardData }

        // Remove fields that shouldn't be updated
        delete updatePayload.workflowCardId
        delete updatePayload.workflowId
        delete updatePayload.createdAt
        delete updatePayload.createdBy

        // Get current user for updatedBy
        const currentUser = authProvider.getCurrentUser()
        const author = currentUser?.email || 'unknown'

        await storage.updateCard(data.workflowId, editingCard.workflowCardId, author, updatePayload)

        console.log('Card updated successfully:', editingCard.workflowCardId)
      } else {
        // Create new card using the workflow engine
        const cardId = await workflowEngine.makeNewCard(cardData)
        console.log('Card created successfully with ID:', cardId)
      }

      // Card changes will be automatically reflected in the UI via live listener
      closeCardFormModal()
    } catch (err) {
      console.error('Error saving card:', err)

      // Show user-friendly error message
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred while saving the card'
      const errorTitle = editingCard ? 'Failed to Update Card' : 'Failed to Create Card'
      showError(errorTitle, errorMessage)
    } finally {
      cardFormSubmitting = false
    }
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
            <span class="text-sm text-gray-500 dark:text-gray-400">
              ({cardsByStatus['draft']?.length || 0})
            </span>
          </div>
        </div>

        <!-- Draft Column Content -->
        <div
          class="min-h-96 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 shadow-sm dark:border-gray-600 dark:bg-gray-800"
        >
          {#if cardsByStatus['draft'] && cardsByStatus['draft'].length > 0}
            {#each cardsByStatus['draft'] as card}
              <div
                class="mb-3 cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:hover:border-blue-600"
                onclick={() => openCardEditModal(card)}
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

            <!-- Add Card Button at bottom -->
            <button
              onclick={openCardFormModal}
              class="w-full rounded-lg border-2 border-dashed border-blue-300 px-4 py-3 text-blue-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-blue-600 dark:text-blue-400 dark:hover:border-blue-500 dark:hover:text-blue-300"
            >
              + Add new item <kbd
                class="ml-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                >N</kbd
              >
            </button>
          {:else}
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">
              <p class="mb-4">No draft items</p>
              <!-- Add Card Button -->
              <button
                onclick={openCardFormModal}
                class="w-full rounded-lg border-2 border-dashed border-blue-300 px-4 py-3 text-blue-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-blue-600 dark:text-blue-400 dark:hover:border-blue-500 dark:hover:text-blue-300"
              >
                + Add new item <kbd
                  class="ml-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  >N</kbd
                >
              </button>
            </div>
          {/if}
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
                  onclick={() => openCardEditModal(card)}
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
    class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
    onclick={closeModal}
    aria-roledescription="modal"
    tabindex="-1"
  >
    <div
      class="mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800"
      onclick={(e) => e.stopPropagation()}
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

<!-- Card Creation/Edit Modal -->
{#if showCardFormModal && editableWorkflow}
  <WorkflowCardForm
    {workflowEngine}
    config={editableWorkflow}
    status={editingCard?.status || 'draft'}
    targetStatus={cardFormTargetStatus}
    initialData={editingCard || {}}
    onSubmit={handleCardSubmit}
    onCancel={closeCardFormModal}
    isSubmitting={cardFormSubmitting}
  />
{/if}

<!-- Error Modal -->
{#if showErrorModal}
  <div
    class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
    onclick={closeErrorModal}
    onkeydown={(e) => e.key === 'Escape' && closeErrorModal()}
    tabindex="-1"
  >
    <div
      class="mx-4 max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Error Modal Header -->
      <div
        class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700"
      >
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0">
            <svg
              class="h-6 w-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              ></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {errorModalTitle}
          </h3>
        </div>
        <button
          onclick={closeErrorModal}
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

      <!-- Error Modal Content -->
      <div class="p-6">
        <p class="text-gray-700 dark:text-gray-300">
          {errorModalMessage}
        </p>
      </div>

      <!-- Error Modal Footer -->
      <div class="flex justify-end border-t border-gray-200 p-6 dark:border-gray-700">
        <button
          onclick={closeErrorModal}
          class="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
