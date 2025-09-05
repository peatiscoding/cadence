<script lang="ts">
  import type { WorkflowConfiguration as PConf, IWorkflowCardEntry } from '@cadence/shared/types'
  import type { PageData } from './$types'
  import { onMount } from 'svelte'
  import { Button, Kbd, Alert, Spinner, Modal } from 'flowbite-svelte'
  import { BanOutline } from 'flowbite-svelte-icons'

  import WorkflowCardForm from '$lib/components/WorkflowCardForm.svelte'
  import WorkflowCard from '$lib/components/WorkflowCard.svelte'

  import { impls } from '$lib/impls'

  let { data }: { data: PageData } = $props()

  let showCardFormModal = $state(false)
  let showErrorModal = $state(false)
  let workflow = $state<PConf | null>(null)
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

  const authProvider = impls.authProvider
  const factory = impls.workflowEngineFactory

  // Create workflow engine for card operations
  const workflowEngine = factory.getWorkflowEngine(data.workflowId)

  // Derived noun values for cleaner usage
  const nouns = $derived(workflow?.nouns || { singular: 'Item', plural: 'Items' })

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

  const readonlyApprovalData = $derived(
    cards.find((c) => editingCard?.workflowCardId === c.workflowCardId)?.approvalTokens || {}
  )

  onMount(() => {
    let isDestroyed = false
    let cardsUnsubscribe: (() => void) | null = null

    // Global keyboard event handler
    const handleGlobalKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showErrorModal) {
          showErrorModal = false
        } else if (showCardFormModal) {
          closeCardFormModal()
        }
        return
      }

      // Only handle global shortcuts when no modal is open and no input is focused
      if (showCardFormModal || showErrorModal) return
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        return

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        openCardFormModal()
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

          workflow = { ...configuration }

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

  async function handleCardSubmit(cardData: any) {
    if (!workflow) return

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
        console.log('Card is being updated with payload', updatePayload)
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
      const errorTitle = editingCard
        ? `Failed to Update ${nouns.singular}`
        : `Failed to Create ${nouns.singular}`
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
        error instanceof Error ? error.message : `Failed to process ${nouns.singular} drop`
      )
    }
  }
</script>

<div class="flex h-screen flex-col pt-4">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="flex items-center gap-3">
        <Spinner size="5" color="blue" />
        <span class="text-gray-600 dark:text-gray-400">Loading workflow...</span>
      </div>
    </div>
  {:else if error}
    <Alert color="orange" class="mx-3 items-start!">
      {#snippet icon()}
        <BanOutline />
      {/snippet}
      <p class="font-medium">Error loading workflow:</p>
      <ul class="ms-4 mt-1.5 list-inside list-disc">
        <li>{error}</li>
      </ul>
    </Alert>
  {:else if workflow}
    <div class="mb-4 px-6">
      <div class="flex items-center gap-3">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {workflow.name}
        </h1>
      </div>
      <p class="mt-2 text-gray-600 dark:text-gray-400">
        {workflow.description || `Track and manage your ${nouns.plural} through different stages`}
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
          aria-label="Draft {nouns.plural} drop zone"
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
            <p class="mt-6 mb-4 text-center text-gray-400">
              No draft {nouns.plural}
            </p>
          {/if}
          <!-- Add Card Button at bottom -->
          <Button
            color="sky"
            outline
            size="lg"
            class="border-2 border-dashed"
            onclick={openCardFormModal}
            >+ Add new {nouns.singular}
            <Kbd class="ml-2 px-2 py-1">N</Kbd></Button
          >
        </div>
      </div>

      {#each workflow.statuses as status}
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
            aria-label="{status.title} {nouns.plural} drop zone"
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
                <p>No {nouns.plural} in this status</p>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Card Creation/Edit Modal -->
{#if showCardFormModal && workflow}
  <WorkflowCardForm
    {workflowEngine}
    {readonlyApprovalData}
    bind:open={showCardFormModal}
    config={workflow}
    status={editingCard?.status}
    targetStatus={cardFormTargetStatus}
    initialData={editingCard || {}}
    onSubmit={handleCardSubmit}
    onCancel={closeCardFormModal}
    isSubmitting={cardFormSubmitting}
  />
{/if}

<!-- Error Modal -->
<Modal bind:open={showErrorModal} title={errorModalTitle}>
  <p>{errorModalMessage}</p>
  {#snippet footer()}
    <Button type="submit" value="ok" color="alternative">OK</Button>
  {/snippet}
</Modal>
