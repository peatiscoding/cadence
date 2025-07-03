<script lang="ts">
  import type { WorkflowConfiguration as PConf } from '@cadence/shared/validation'
  import type { IWorkflowConfigurationDynamicStorage } from '$lib/persistent/interface'
  import type { IWorkflowCardEntry } from '$lib/models/interface'
  import type { PageData } from './$types'
  import { onMount } from 'svelte'
  import { Button, Kbd } from 'flowbite-svelte'
  import { CogOutline } from 'flowbite-svelte-icons'

  import WorkflowConfiguration from '$lib/components/WorkflowConfiguration.svelte'
  import WorkflowCardForm from '$lib/components/WorkflowCardForm.svelte'
  import WorkflowCard from '$lib/components/WorkflowCard.svelte'
  import { impls } from '$lib/impls'

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
  let isSupportDynamicWorkflows = $state(false)

  // Drag and drop state
  let draggedCard = $state<IWorkflowCardEntry | null>(null)
  let draggedOverStatus = $state<string | null>(null)
  let validDropZones = $state<Set<string>>(new Set())

  const storage = impls.configurationStore
  const authProvider = impls.authProvider
  const factory = impls.workflowEngineFactory

  // Create workflow engine for card operations
  const workflowEngine = factory.getWorkflowEngine(data.workflowId)

  function getDynamicStorage(): IWorkflowConfigurationDynamicStorage | undefined {
    if (storage.isSupportDynamicWorkflows()) {
      return storage as IWorkflowConfigurationDynamicStorage
    }
    return undefined
  }

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

      isSupportDynamicWorkflows = impls.configurationStore.isSupportDynamicWorkflows()

      if (user) {
        try {
          loading = true
          error = ''
          const configuration = await workflowEngine.configuration

          if (!configuration) {
            error = 'Workflow not found'
            return
          }

          editableWorkflow = { ...configuration }

          // Set up live listening for cards
          cardsUnsubscribe = workflowEngine
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

  async function handleUpdateWorkflowConfiguration() {
    if (!editableWorkflow) return
    const dynamicStorage = getDynamicStorage()
    if (!dynamicStorage) {
      console.warn('DynamicStorage is required to update the configurations')
      return
    }
    try {
      // Create a plain object copy to avoid Svelte proxy issues with Firestore
      const plainWorkflow = JSON.parse(JSON.stringify(editableWorkflow))
      await dynamicStorage.setConfig(data.workflowId, plainWorkflow)
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

        // If we have a target status, this is a transition
        if (cardFormTargetStatus) {
          await workflowEngine.attemptToTransitCard(
            editingCard.workflowCardId,
            cardFormTargetStatus,
            updatePayload
          )
        } else {
          // Otherwise it's a regular update
          await workflowEngine.updateCardDetail(editingCard.workflowCardId, updatePayload)
        }

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

  // Drag and drop handlers
  async function handleDragStart(event: DragEvent, card: IWorkflowCardEntry) {
    if (!event.dataTransfer) return

    draggedCard = card
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', card.workflowCardId)

    // Calculate valid drop zones for this card
    try {
      const nextStatuses = await workflowEngine.getNextStatuses(card.status)
      validDropZones = new Set(nextStatuses.map((status) => status.slug))
    } catch (error) {
      console.error('Failed to get next statuses for drag:', error)
      validDropZones = new Set()
    }
  }

  function handleDragEnd() {
    draggedCard = null
    draggedOverStatus = null
    validDropZones = new Set()
  }

  function handleDragOver(event: DragEvent, statusSlug: string) {
    if (!draggedCard || !validDropZones.has(statusSlug)) return

    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
    draggedOverStatus = statusSlug
  }

  function handleDragLeave(event: DragEvent, statusSlug: string) {
    // Only clear if we're actually leaving this drop zone
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const x = event.clientX
    const y = event.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (draggedOverStatus === statusSlug) {
        draggedOverStatus = null
      }
    }
  }

  async function handleDrop(event: DragEvent, targetStatusSlug: string) {
    event.preventDefault()

    if (!draggedCard || !validDropZones.has(targetStatusSlug)) return

    const droppedCard = draggedCard
    const targetStatus = targetStatusSlug

    // Reset drag state
    handleDragEnd()

    // Always open the transition modal for user confirmation
    try {
      openCardEditModal(droppedCard, targetStatus)
    } catch (error) {
      console.error('Failed to process drop:', error)
      showError(
        'Drop Failed',
        error instanceof Error ? error.message : 'Failed to process card drop'
      )
    }
  }
</script>

<div class="flex h-screen flex-col pt-4">
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
    <div class="mb-4 px-6">
      <div class="flex items-center gap-3">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {editableWorkflow.name}
        </h1>
        {#if isSupportDynamicWorkflows}
          <button
            onclick={openConfigModal}
            class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            title="Workflow Settings"
          >
            <CogOutline class="h-5 w-5" />
          </button>
        {/if}
      </div>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        {editableWorkflow.description ||
          'Track and manage your workflow items through different stages'}
      </p>
    </div>

    <!-- Workflow Board -->
    <div class="flex flex-1 gap-6 overflow-x-auto px-6 pb-4">
      <!-- Draft Column (Reserved) -->
      <div
        class="flex w-90 flex-shrink-0 flex-col"
        class:opacity-50={draggedCard && !validDropZones.has('draft')}
      >
        <!-- Draft Column Header -->
        <div class="mb-2">
          <div class="mb-2 flex items-center gap-2">
            <div class="h-3 w-3 rounded-full bg-gray-400"></div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Draft</h2>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              ({cardsByStatus['draft']?.length || 0})
            </span>
            {#if draggedCard && validDropZones.has('draft')}
              <div class="ml-2 flex items-center gap-1">
                <div class="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
                <span class="text-xs text-green-600 dark:text-green-400">Drop here</span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Draft Column Content -->
        <div
          class={[
            'flex flex-1 flex-col overflow-y-auto rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 shadow-sm transition-all duration-200 dark:border-gray-600 dark:bg-gray-800',
            validDropZones.has('draft') &&
              draggedOverStatus === 'draft' &&
              '-translate-y-1 border-4 border-solid border-blue-500 bg-blue-50 shadow-lg dark:border-blue-400 dark:bg-blue-900'
          ]}
          ondragover={(e) => handleDragOver(e, 'draft')}
          ondragleave={(e) => handleDragLeave(e, 'draft')}
          ondrop={(e) => handleDrop(e, 'draft')}
          role="region"
          aria-label="Draft cards drop zone"
        >
          {#if cardsByStatus['draft'] && cardsByStatus['draft'].length > 0}
            {#each cardsByStatus['draft'] as card}
              <WorkflowCard
                {card}
                isDragged={draggedCard?.workflowCardId === card.workflowCardId}
                onCardClick={openCardEditModal}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              />
            {/each}
          {:else}
            <p class="mt-6 mb-4 text-center text-gray-400">No draft items</p>
          {/if}
          <!-- Add Card Button at bottom -->
          <Button
            color="sky"
            outline
            size="lg"
            class="border-2 border-dashed"
            onclick={openCardFormModal}>+ Add new item <Kbd class="ml-2 px-2 py-1">N</Kbd></Button
          >
        </div>
      </div>

      {#each editableWorkflow.statuses as status}
        <div
          class="flex w-90 flex-shrink-0 flex-col"
          class:opacity-50={draggedCard && !validDropZones.has(status.slug)}
        >
          <!-- Status Column Header -->
          <div class="mb-2">
            <div class="mb-2 flex items-center gap-2">
              <div class="h-3 w-3 rounded-full" style="background-color: {status.ui.color}"></div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {status.title}
              </h2>
              <span class="text-sm text-gray-500 dark:text-gray-400">
                ({cardsByStatus[status.slug]?.length || 0})
              </span>
              {#if draggedCard && validDropZones.has(status.slug)}
                <div class="ml-2 flex items-center gap-1">
                  <div class="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
                  <span class="text-xs text-green-600 dark:text-green-400">Drop here</span>
                </div>
              {/if}
            </div>
          </div>

          <!-- Status Column Content -->
          <div
            class={[
              'flex flex-1 flex-col overflow-y-auto rounded-lg bg-gray-50 p-4 shadow-sm transition-all duration-200 dark:bg-gray-800',
              status.terminal ? 'border-2' : 'border border-gray-200 dark:border-gray-700',
              draggedOverStatus === status.slug &&
                validDropZones.has(status.slug) &&
                '-translate-y-1 border-4 border-solid border-blue-500 bg-blue-50 shadow-lg dark:border-blue-400 dark:bg-blue-900'
            ]}
            style={status.terminal ? `border-color: ${status.ui.color}` : ''}
            ondragover={(e) => handleDragOver(e, status.slug)}
            ondragleave={(e) => handleDragLeave(e, status.slug)}
            ondrop={(e) => handleDrop(e, status.slug)}
            role="region"
            aria-label="{status.title} cards drop zone"
          >
            {#if cardsByStatus[status.slug]}
              {#each cardsByStatus[status.slug] as card}
                <WorkflowCard
                  {card}
                  isDragged={draggedCard?.workflowCardId === card.workflowCardId}
                  onCardClick={openCardEditModal}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
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
    onkeydown={(e) => {
      if (e.key === 'Escape') {
        closeModal(e)
      }
    }}
    role="dialog"
    aria-modal="true"
    aria-labelledby="config-modal-title"
    tabindex="-1"
  >
    <div
      class="mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => {
        if (e.key !== 'Escape') {
          e.stopPropagation()
        }
      }}
      role="none"
    >
      <!-- Modal Header -->
      <div
        class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700"
      >
        <h2 id="config-modal-title" class="text-xl font-semibold text-gray-900 dark:text-gray-100">
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
          onclick={handleUpdateWorkflowConfiguration}
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
    bind:open={showCardFormModal}
    config={editableWorkflow}
    status={editingCard?.status}
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
    role="dialog"
    aria-modal="true"
    aria-labelledby="error-modal-title"
    tabindex="-1"
  >
    <div
      class="mx-4 max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => {
        if (e.key !== 'Escape') {
          e.stopPropagation()
        }
      }}
      role="none"
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
          <h3 id="error-modal-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {errorModalTitle}
          </h3>
        </div>
        <button
          onclick={closeErrorModal}
          aria-label="Close error modal"
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
