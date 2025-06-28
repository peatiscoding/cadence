<script lang="ts">
  import type { WorkflowCardEngine } from '$lib/workflow/workflow-card-engine'
  import type { Configuration, Field } from '$lib/schema'
  import { z } from 'zod'
  
  export let workflowEngine: WorkflowCardEngine
  export let config: Configuration
  export let status: string = 'draft'
  export let initialData: Record<string, any> = {}
  export let onSubmit: (data: any) => Promise<void>
  export let onCancel: () => void
  export let isSubmitting: boolean = false

  let formData: Record<string, any> = {
    title: '',
    description: '',
    value: 0,
    type: '',
    owner: '',
    fieldData: {},
    hidden: false,
    ...initialData
  }
  
  let errors: Record<string, string> = {}
  let schema: z.ZodObject<any> | null = null

  // Load schema when component mounts or status changes
  $: loadSchema(status)

  async function loadSchema(currentStatus: string) {
    try {
      schema = await workflowEngine.getCardSchema(currentStatus)
    } catch (error) {
      console.error('Failed to load schema:', error)
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
    if (!schema) return

    try {
      const validatedData = schema.parse(formData)
      await onSubmit(validatedData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors = {}
        error.errors.forEach((err) => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        errors = { ...errors }
      } else {
        console.error('Submission error:', error)
      }
    }
  }

  function renderField(field: Field) {
    const fieldValue = formData.fieldData[field.slug]
    const fieldError = errors[`fieldData.${field.slug}`]

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
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onclick={onCancel}>
  <div class="mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800" onclick={(e) => e.stopPropagation()}>
    <!-- Modal Header -->
    <div class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {initialData.workflowCardId ? 'Edit Card' : 'Create New Card'}
      </h2>
      <button 
        onclick={onCancel}
        class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Modal Content -->
    <form onsubmit={handleSubmit}>
      <div class="p-6 space-y-6">
        <!-- Core Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Title -->
          <div class="md:col-span-2">
            <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              bind:value={formData.title}
              onblur={() => validateField('title', formData.title)}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              class:border-red-500={errors.title}
              required
            />
            {#if errors.title}
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
            {/if}
          </div>

          <!-- Description -->
          <div class="md:col-span-2">
            <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              bind:value={formData.description}
              onblur={() => validateField('description', formData.description)}
              rows="3"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              class:border-red-500={errors.description}
            ></textarea>
            {#if errors.description}
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
            {/if}
          </div>

          <!-- Value -->
          <div>
            <label for="value" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Value
            </label>
            <input
              id="value"
              type="number"
              bind:value={formData.value}
              onblur={() => validateField('value', formData.value)}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              class:border-red-500={errors.value}
            />
            {#if errors.value}
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.value}</p>
            {/if}
          </div>

          <!-- Type -->
          <div>
            <label for="type" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type
            </label>
            <input
              id="type"
              type="text"
              bind:value={formData.type}
              onblur={() => validateField('type', formData.type)}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              class:border-red-500={errors.type}
            />
            {#if errors.type}
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.type}</p>
            {/if}
          </div>

          <!-- Owner -->
          <div>
            <label for="owner" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Owner
            </label>
            <input
              id="owner"
              type="text"
              bind:value={formData.owner}
              onblur={() => validateField('owner', formData.owner)}
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              class:border-red-500={errors.owner}
            />
            {#if errors.owner}
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.owner}</p>
            {/if}
          </div>

          <!-- Hidden -->
          <div>
            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                bind:checked={formData.hidden}
                onchange={() => validateField('hidden', formData.hidden)}
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Hidden</span>
            </label>
            {#if errors.hidden}
              <p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hidden}</p>
            {/if}
          </div>
        </div>

        <!-- Dynamic Fields -->
        {#if config.fields.length > 0}
          <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Custom Fields</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {#each config.fields as field}
                {@const fieldProps = renderField(field)}
                {@const fieldError = errors[`fieldData.${field.slug}`]}
                <div class={fieldProps.type === 'multi-select' ? 'md:col-span-2' : ''}>
                  <label for={field.slug} class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {field.title}
                    {#if field.description}
                      <span class="text-xs text-gray-500 dark:text-gray-400 block">{field.description}</span>
                    {/if}
                  </label>

                  {#if fieldProps.type === 'checkbox'}
                    <label class="flex items-center space-x-2">
                      <input
                        id={field.slug}
                        type="checkbox"
                        bind:checked={formData.fieldData[field.slug]}
                        onchange={() => validateFieldData(field.slug, formData.fieldData[field.slug])}
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span class="text-sm text-gray-700 dark:text-gray-300">{field.title}</span>
                    </label>
                  {:else if fieldProps.type === 'select'}
                    <select
                      id={field.slug}
                      bind:value={formData.fieldData[field.slug]}
                      onchange={() => validateFieldData(field.slug, formData.fieldData[field.slug])}
                      class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
                                formData.fieldData[field.slug] = [...formData.fieldData[field.slug], choice]
                              } else {
                                formData.fieldData[field.slug] = formData.fieldData[field.slug].filter((v: any) => v !== choice)
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
                      on:blur={() => validateFieldData(field.slug, formData.fieldData[field.slug])}
                      class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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

      <!-- Modal Footer -->
      <div class="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700">
        <button
          type="button"
          onclick={onCancel}
          class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : (initialData.workflowCardId ? 'Save Changes' : 'Create Card')}
        </button>
      </div>
    </form>
  </div>
</div>