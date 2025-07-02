<script lang="ts">
  import type { IWorkflowCardEngine } from '$lib/workflow/interface'
  import type {
    WorkflowConfiguration,
    WorkflowField,
    WorkflowType,
    WorkflowStatus
  } from '@cadence/shared/validation'
  import { draftStatus, unknownStatus, STATUS_DRAFT } from '@cadence/shared/models/status'
  import { z } from 'zod'
  import { onMount } from 'svelte'
  import { Button, Badge, Indicator, Modal, Dropdown, DropdownItem } from 'flowbite-svelte'
  import { ArrowRightOutline, DotsHorizontalOutline } from 'flowbite-svelte-icons'

  interface Props {
    open: boolean
    workflowEngine: IWorkflowCardEngine
    config: WorkflowConfiguration
    status?: string
    targetStatus?: string // The status we're transitioning to (if different from current)
    initialData?: Record<string, any>
    onSubmit: (data: any) => Promise<void>
    onCancel: () => void
    isSubmitting?: boolean
  }

  let {
    open = $bindable(),
    workflowEngine,
    config,
    status = STATUS_DRAFT,
    targetStatus,
    initialData = {},
    onSubmit,
    onCancel,
    isSubmitting = false
  }: Props = $props()

  let formData = $state({
    title: initialData.title || '',
    description: initialData.description || '',
    value: initialData.value || 0,
    type: initialData.type || '',
    owner: initialData.owner || '',
    fieldData: initialData.fieldData || {},
    ...initialData
  })

  let errors = $state<Record<string, string>>({})
  let schema: z.ZodObject<any> | null = null
  let nextStatuses = $state<WorkflowStatus[]>([])
  let selectedTransitionStatus = $state<string | null>(null)
  let isTypeDropdownOpen = $state(false)

  // Determine form mode and effective status for schema
  const isEditing = $derived(!!initialData.workflowCardId)
  const isTransition = $derived(!!targetStatus && targetStatus !== status)
  const isDropdownTransition = $derived(isEditing && !!selectedTransitionStatus)
  const effectiveStatus = $derived(selectedTransitionStatus || targetStatus || status)
  const formMode = $derived(() => {
    if (!isEditing) return 'create'
    if (isTransition || isDropdownTransition) return 'transition'
    return 'edit'
  })

  // Get status configuration for display (always shows original status)
  const statusConfig = $derived((): WorkflowStatus => {
    if (status === STATUS_DRAFT) return draftStatus

    return config.statuses.find((s) => s.slug === status) || unknownStatus(status)
  })

  // Get target status configuration for transition display
  const targetStatusConfig = $derived((): WorkflowStatus => {
    const targetSlug = selectedTransitionStatus || targetStatus
    if (!targetSlug || targetSlug === 'draft') return draftStatus
    return config.statuses.find((s) => s.slug === targetSlug) || unknownStatus(targetSlug)
  })

  // Get required fields for current status
  const requiredFields = $derived(() => {
    if (!config || !config.statuses || effectiveStatus === 'draft') return []
    const statusConfig = config.statuses.find((s) => s.slug === effectiveStatus)
    const required = statusConfig?.precondition?.required
    // Ensure we always return an array
    return Array.isArray(required) ? required : []
  })

  let mounted = $state(false)

  // Load schema when effective status changes
  $effect(() => {
    if (mounted) {
      setSchemaByStatus(effectiveStatus)
    }
  })

  // Load next statuses when editing an existing card
  $effect(() => {
    if (mounted && isEditing && !isTransition) {
      loadNextStatuses()
    }
  })

  async function setSchemaByStatus(currentStatus: string) {
    try {
      if (workflowEngine && workflowEngine.getCardSchema) {
        schema = await workflowEngine.getCardSchema(currentStatus)
      } else {
        console.warn('WorkflowEngine or getCardSchema method not available')
        schema = null
      }
    } catch (error) {
      console.error('Failed to load schema:', error)
      schema = null
    }
  }

  async function loadNextStatuses() {
    try {
      if (workflowEngine && workflowEngine.getNextStatuses) {
        nextStatuses = await workflowEngine.getNextStatuses(status)
      } else {
        console.warn('WorkflowEngine or getNextStatuses method not available')
        nextStatuses = []
      }
    } catch (error) {
      console.error('Failed to load next statuses:', error)
      nextStatuses = []
    }
  }

  function validateField(fieldName: string, value: any) {
    if (!schema) return

    try {
      const fieldSchema = schema.shape[fieldName]
      if (fieldSchema) {
        fieldSchema.parse(value)
        delete errors[fieldName]
        errors = { ...errors }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors[fieldName] = error.errors[0]?.message || 'Invalid value'
        errors = { ...errors }
      }
    }
  }

  function validateFieldData(fieldSlug: string, value: any) {
    if (!schema) return

    try {
      const fieldDataSchema = schema.shape.fieldData
      if (fieldDataSchema && fieldDataSchema.shape && fieldDataSchema.shape[fieldSlug]) {
        fieldDataSchema.shape[fieldSlug].parse(value)
        delete errors[`fieldData.${fieldSlug}`]
        errors = { ...errors }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors[`fieldData.${fieldSlug}`] = error.errors[0]?.message || 'Invalid value'
        errors = { ...errors }
      }
    }
  }

  async function handleSubmit(event: Event) {
    event.preventDefault()
    if (!schema) {
      console.error('No schema available for validation')
      return
    }

    try {
      const validatedData = schema.parse(formData)

      // Determine the submit data based on form mode
      let submitData = { ...validatedData }

      // If transitioning via dropdown selection, include the target status
      if (isEditing && selectedTransitionStatus) {
        submitData = {
          ...submitData,
          status: selectedTransitionStatus
        }
      } else if (isTransition) {
        // Direct transition mode (status passed as prop)
        submitData = {
          ...submitData,
          status: effectiveStatus
        }
      }

      await onSubmit(submitData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', error.errors)
        errors = {}
        error.errors.forEach((err) => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        errors = { ...errors }

        // Don't call onSubmit if validation fails - show validation errors in form
        return
      } else {
        console.error('Submission error:', error)
        // Re-throw the error so parent can handle it
        throw error
      }
    }
  }

  function renderField(field: WorkflowField) {
    switch (field.schema.kind) {
      case 'number':
        return { type: 'number', min: field.schema.min, max: field.schema.max }
      case 'text':
        return { type: 'text', minlength: field.schema.min, maxlength: field.schema.max }
      case 'url':
        return { type: 'url' }
      case 'bool':
        return { type: 'checkbox' }
      case 'choice':
        return { type: 'select', choices: field.schema.choices || [] }
      case 'multi-choice':
        return { type: 'multi-select', choices: field.schema.choices || [] }
      default:
        return { type: 'text' }
    }
  }

  function getSelectedType(): WorkflowType | null {
    if (!formData.type || !config.types) return null
    return config.types.find((type) => type.slug === formData.type) || null
  }

  function handleTypeSelect(typeSlug: string) {
    validateField('type', formData.type)
    formData.type = typeSlug
    isTypeDropdownOpen = false
  }

  function handleTransitionSelect(targetStatusSlug: string) {
    selectedTransitionStatus = targetStatusSlug
    // Reload schema for the target status to validate required fields
    setSchemaByStatus(targetStatusSlug)
  }

  onMount(() => {
    mounted = true

    // Focus on title input when component mounts
    const titleInput = document.getElementById('title') as HTMLInputElement
    if (titleInput) {
      titleInput.focus()
    }

    return () => {}
  })
</script>

<Modal bind:open>
  <!-- Modal Header -->
  {#snippet header()}
    <div>
      <div class="flex items-center gap-3">
        <h2 id="modal-title" class="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {#if formMode() === 'create'}
            Create New Card
          {:else if formMode() === 'transition'}
            Transition Card
          {:else}
            Edit Card
          {/if}
        </h2>

        <!-- Status Badge and Transition -->
        <div class="flex items-center gap-3">
          <!-- Current Status Badge -->
          <Badge border color="gray" class="px-2.5 py-0.5">
            <Indicator
              style="background-color: {statusConfig().ui.color}"
              class="me-1"
            />{statusConfig().title}
          </Badge>

          <!-- Transition UI (show when editing and either in transition mode or dropdown available) -->
          {#if isEditing && (isTransition || nextStatuses.length > 0)}
            <ArrowRightOutline class="h-4 w-4 text-gray-400" />

            {#if isTransition}
              <!-- Target Status Badge (when in transition mode from drag-and-drop) -->
              <div
                class="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800"
              >
                <div
                  class="h-2 w-2 rounded-full"
                  style="background-color: {targetStatusConfig().ui.color}"
                ></div>
                <span class="text-sm font-medium text-blue-700 dark:text-blue-300">
                  {targetStatusConfig().title}
                </span>
              </div>
            {:else if selectedTransitionStatus}
              <!-- Target Status Badge (when transition is selected) -->
              <Badge
                border
                color="blue"
                class="px-2.5 py-0.5"
                onclick={() => {
                  selectedTransitionStatus = null
                  setSchemaByStatus(status) // Reset to original status schema
                }}
              >
                <Indicator
                  style="background-color: {targetStatusConfig().ui.color}"
                  class="me-1"
                />{targetStatusConfig().title}
              </Badge>
            {:else}
              <!-- Transition Dropdown -->
              <DotsHorizontalOutline class="select-status" />
              <Dropdown simple triggeredBy=".select-status">
                {#each nextStatuses as nextStatus}
                  <DropdownItem
                    class="w-full text-start"
                    onclick={() => handleTransitionSelect(nextStatus.slug)}
                  >
                    <Indicator
                      style="background-color: {nextStatus.ui.color}"
                      class="me-1 inline-block"
                    />
                    {nextStatus.title}
                  </DropdownItem>
                {/each}
              </Dropdown>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  {/snippet}

  <!-- Modal Content -->
  <p class="my-0 text-sm text-gray-500 dark:text-gray-400">
    {#if formMode() === 'create'}
      Create a new workflow item. Fields marked with <span class="text-red-500">*</span> are required.
    {:else if formMode() === 'transition'}
      Update card to transition to "{targetStatusConfig().title}" status.
    {:else}
      Edit the workflow item. Fields marked with <span class="text-red-500">*</span> are required.
    {/if}
  </p>
  <form id="card-form" onsubmit={handleSubmit} method="dialog" action="#" class="mt-2">
    <div class="space-y-6">
      <!-- Core Fields -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-12">
        <!-- Type -->
        <div class="md:col-span-4">
          <label for="type" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Type <span class="text-red-500">*</span>
          </label>
          {#if config.types && config.types.length > 0}
            {@const selectedType = getSelectedType()}
            <Button outline color="gray" class="w-full justify-start text-start">
              {#if selectedType}
                <Indicator
                  style="background-color: {selectedType.ui.color}"
                  class="me-1 inline-block"
                />
                <span class="text-gray-900 dark:text-gray-100">{selectedType.title}</span>
              {:else}
                Select a type...
              {/if}
            </Button>
            <Dropdown simple bind:isOpen={isTypeDropdownOpen}>
              {#each config.types as type}
                <DropdownItem class="w-full text-start" onclick={() => handleTypeSelect(type.slug)}>
                  <Indicator class="me-1 inline-block" style="background-color: {type.ui.color}" />
                  <span class="text-gray-900 dark:text-gray-100">{type.title}</span>
                </DropdownItem>
              {/each}
            </Dropdown>
          {:else}
            <input
              id="type"
              type="text"
              bind:value={formData.type}
              onblur={() => validateField('type', formData.type)}
              placeholder="Enter type"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              class:border-red-500={errors.type}
            />
          {/if}
          {#if errors.type}
            <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.type}</p>
          {/if}
        </div>

        <!-- Title -->
        <div class="md:col-span-8">
          <label
            for="title"
            class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Title <span class="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            bind:value={formData.title}
            placeholder="Name of this card"
            onblur={() => validateField('title', formData.title)}
            class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            class:border-red-500={errors.title}
            required
          />
          {#if errors.title}
            <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
          {/if}
        </div>

        <!-- Description -->
        <div class="md:col-span-12">
          <label
            for="description"
            class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description
          </label>
          <textarea
            id="description"
            placeholder="Details of this Card information"
            bind:value={formData.description}
            onblur={() => validateField('description', formData.description)}
            rows="3"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            class:border-red-500={errors.description}
          ></textarea>
          {#if errors.description}
            <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
          {/if}
        </div>

        <!-- Value -->
        <div class="md:col-span-6">
          <label
            for="value"
            class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Value
          </label>
          <input
            id="value"
            type="number"
            bind:value={formData.value}
            onblur={() => validateField('value', formData.value)}
            class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            class:border-red-500={errors.value}
          />
          {#if errors.value}
            <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.value}</p>
          {/if}
        </div>

        <!-- Owner -->
        <div class="md:col-span-6">
          <label
            for="owner"
            class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Owner
          </label>
          <input
            id="owner"
            type="text"
            bind:value={formData.owner}
            onblur={() => validateField('owner', formData.owner)}
            class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            class:border-red-500={errors.owner}
          />
          {#if errors.owner}
            <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.owner}</p>
          {/if}
        </div>

        <!-- Dynamic Fields -->
        {#if config.fields.length > 0}
          <div class="border-t border-gray-200 pt-6 md:col-span-12 dark:border-gray-700">
            <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Custom Fields</h3>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-12">
              {#each config.fields as field}
                {@const fieldProps = renderField(field)}
                {@const fieldError = errors[`fieldData.${field.slug}`]}
                <div
                  class={fieldProps.type === 'multi-select' ? 'md:col-span-12' : 'md:col-span-6'}
                >
                  <label
                    for={field.slug}
                    class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {field.title}
                    {#if requiredFields().includes(field.slug)}
                      <span class="text-red-500">*</span>
                    {/if}
                    {#if field.description}
                      <span class="block text-xs text-gray-500 dark:text-gray-400"
                        >{field.description}</span
                      >
                    {/if}
                  </label>

                  {#if fieldProps.type === 'checkbox'}
                    <label class="flex items-center space-x-2">
                      <input
                        id={field.slug}
                        type="checkbox"
                        bind:checked={formData.fieldData[field.slug]}
                        onchange={() =>
                          validateFieldData(field.slug, formData.fieldData[field.slug])}
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span class="text-sm text-gray-700 dark:text-gray-300">{field.title}</span>
                    </label>
                  {:else if fieldProps.type === 'select'}
                    <select
                      id={field.slug}
                      bind:value={formData.fieldData[field.slug]}
                      onchange={() => validateFieldData(field.slug, formData.fieldData[field.slug])}
                      class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      class:border-red-500={fieldError}
                    >
                      <option value="">Select {field.title}</option>
                      {#each fieldProps.choices || [] as choice}
                        <option value={choice}>{choice}</option>
                      {/each}
                    </select>
                  {:else if fieldProps.type === 'multi-select'}
                    <div class="space-y-2">
                      {#each fieldProps.choices || [] as choice}
                        <label class="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            value={choice}
                            checked={formData.fieldData[field.slug]?.includes(choice)}
                            onchange={(e: Event) => {
                              const target = e.target as HTMLInputElement
                              if (!formData.fieldData[field.slug]) {
                                formData.fieldData[field.slug] = []
                              }
                              if (target.checked) {
                                formData.fieldData[field.slug] = [
                                  ...formData.fieldData[field.slug],
                                  choice
                                ]
                              } else {
                                formData.fieldData[field.slug] = formData.fieldData[
                                  field.slug
                                ].filter((v: any) => v !== choice)
                              }
                              validateFieldData(field.slug, formData.fieldData[field.slug])
                            }}
                            class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                          />
                          <span class="text-sm text-gray-700 dark:text-gray-300">{choice}</span>
                        </label>
                      {/each}
                    </div>
                  {:else}
                    <input
                      id={field.slug}
                      type={fieldProps.type}
                      min={fieldProps.min}
                      max={fieldProps.max}
                      minlength={fieldProps.minlength}
                      maxlength={fieldProps.maxlength}
                      bind:value={formData.fieldData[field.slug]}
                      onblur={() => validateFieldData(field.slug, formData.fieldData[field.slug])}
                      class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      class:border-red-500={fieldError}
                    />
                  {/if}

                  {#if fieldError}
                    <p class="mt-1 text-sm text-red-600 dark:text-red-400">{fieldError}</p>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </form>
  {#snippet footer()}
    <Button color="alternative" onclick={onCancel}>Cancel</Button>
    <Button type="submit" disabled={isSubmitting} color="blue" form="card-form">
      {#if isSubmitting}
        Saving...
      {:else if formMode() === 'create'}
        Create Card
      {:else if formMode() === 'transition'}
        Transition to&nbsp;<b>{targetStatusConfig().title}</b>
      {:else}
        Save Changes
      {/if}
    </Button>
  {/snippet}
</Modal>
