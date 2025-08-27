<script lang="ts">
  import type { WorkflowField } from '@cadence/shared/types'
  import { Button, Dropdown, DropdownItem, Spinner } from 'flowbite-svelte'
  import { ChevronDownOutline } from 'flowbite-svelte-icons'
  import { onMount, onDestroy } from 'svelte'
  import { lovService, type LovEntry } from '$lib/services/lov-service'

  interface Props {
    field: WorkflowField
    workflowId: string
    value: string | undefined
    onchange: (value: string) => void
    onblur?: () => void
    error?: string
    readonly?: boolean
    required?: boolean
  }

  let {
    field,
    workflowId,
    value,
    onchange,
    onblur,
    error,
    readonly = false,
    required = false
  }: Props = $props()

  let lovOptions = $state<LovEntry[]>([])
  let isLoading = $state(false)
  let isDropdownOpen = $state(false)
  let mounted = $state(false)
  let searchText = $state('')

  // Derived values
  const textSchema = $derived(() => {
    if (field.schema.kind !== 'text') return null
    return field.schema as Extract<typeof field.schema, { kind: 'text' }>
  })

  const lovDef = $derived(() => textSchema()?.lov)

  const filteredOptions = $derived(() => {
    if (!searchText.trim()) return lovOptions
    const search = searchText.toLowerCase()
    return lovOptions.filter(
      (option) =>
        option.key.toLowerCase().includes(search) ||
        option.label.toLowerCase().includes(search)
    )
  })

  const selectedOption = $derived(() => {
    if (!value) return null
    return lovOptions.find((option) => option.key === value || option.label === value)
  })

  const displayValue = $derived(() => {
    if (selectedOption()) {
      return selectedOption()!.label
    }
    return value || ''
  })

  async function fetchLovOptions() {
    if (!lovDef() || !mounted || !workflowId) return

    isLoading = true

    try {
      // Fetch all LOV data for the workflow
      const workflowLovData = await lovService.getWorkflowLovData(workflowId)
      
      // Get LOV options for this specific field
      lovOptions = workflowLovData[field.slug] || []
    } catch (error) {
      console.error('Failed to fetch LOV options:', error)
      lovOptions = []
    } finally {
      isLoading = false
    }
  }

  function handleSelect(option: LovEntry) {
    onchange(option.key)
    isDropdownOpen = false
    searchText = ''
  }

  function handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement
    searchText = target.value
    
    // If user types something that matches an existing option key/label exactly, select it
    const exactMatch = lovOptions.find(
      (option) => option.key === searchText || option.label === searchText
    )
    if (exactMatch) {
      onchange(exactMatch.key)
    } else {
      onchange(searchText)
    }
  }

  function handleClear() {
    onchange('')
    searchText = ''
    isDropdownOpen = false
  }

  onMount(() => {
    mounted = true
    if (lovDef()) {
      fetchLovOptions()
    }
  })

  onDestroy(() => {
    // Cleanup if needed
  })

  // Watch for LOV definition changes and refetch options
  $effect(() => {
    if (mounted && lovDef()) {
      fetchLovOptions()
    }
  })
</script>

<div class="relative">
  {#if readonly}
    <!-- Readonly mode - just show the display value -->
    <input
      type="text"
      value={displayValue()}
      readonly
      class="w-full rounded-lg border border-gray-300 px-3 py-2 bg-gray-100 cursor-not-allowed dark:border-gray-600 dark:bg-gray-600 dark:text-gray-100"
      class:border-red-500={error}
    />
  {:else}
    <!-- Interactive LOV field -->
    <div class="relative">
      <input
        type="text"
        value={searchText || displayValue()}
        oninput={handleInputChange}
        onblur={onblur}
        onfocus={() => {
          isDropdownOpen = true
          searchText = value || ''
        }}
        placeholder="Start typing to search..."
        class="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        class:border-red-500={error}
        {required}
      />
      
      <!-- Loading indicator or dropdown arrow -->
      <div class="absolute inset-y-0 right-0 flex items-center pr-3">
        {#if isLoading}
          <Spinner size="4" />
        {:else}
          <Button
            color="alternative"
            size="xs"
            class="p-0 focus:ring-0 bg-transparent border-0 hover:bg-transparent"
            onclick={() => {
              isDropdownOpen = !isDropdownOpen
              if (isDropdownOpen) {
                searchText = value || ''
              }
            }}
          >
            <ChevronDownOutline class="h-4 w-4 text-gray-400" />
          </Button>
        {/if}
      </div>

      <!-- Dropdown with options -->
      {#if isDropdownOpen && !readonly}
        <div class="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          <div class="max-h-60 overflow-y-auto py-1">
            {#if filteredOptions().length === 0}
              <div class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                {#if isLoading}
                  Loading options...
                {:else if lovOptions.length === 0}
                  No options available
                {:else}
                  No matching options
                {/if}
              </div>
            {:else}
              <!-- Clear option (if there's a current value) -->
              {#if value}
                <button
                  type="button"
                  onclick={handleClear}
                  class="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Clear selection
                </button>
                <hr class="border-gray-200 dark:border-gray-600" />
              {/if}

              <!-- LOV options -->
              {#each filteredOptions() as option}
                <button
                  type="button"
                  onclick={() => handleSelect(option)}
                  class="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 {selectedOption()?.key === option.key ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
                >
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-medium text-gray-900 dark:text-gray-100">
                        {option.label}
                      </div>
                      {#if option.key !== option.label}
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          Key: {option.key}
                        </div>
                      {/if}
                    </div>
                    {#if selectedOption()?.key === option.key}
                      <div class="h-2 w-2 rounded-full bg-blue-500"></div>
                    {/if}
                  </div>
                </button>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Click outside to close dropdown -->
  {#if isDropdownOpen}
    <div
      class="fixed inset-0 z-40"
      role="button"
      tabindex="-1"
      onclick={() => {
        isDropdownOpen = false
        searchText = ''
      }}
      onkeydown={(e) => {
        if (e.key === 'Escape') {
          isDropdownOpen = false
          searchText = ''
        }
      }}
    ></div>
  {/if}
</div>

{#if error}
  <p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
{/if}