<script lang="ts">
  import type { IWorkflowCardEntry } from '@cadence/shared/types'
  import { formatAmount } from '$lib/utils/format'
  import { Card, Badge, P, Heading } from 'flowbite-svelte'
  import { ClockOutline } from 'flowbite-svelte-icons'

  interface Props {
    card: IWorkflowCardEntry
    isDragged?: boolean
    onCardClick: (card: IWorkflowCardEntry) => void
    onDragStart: (event: DragEvent, card: IWorkflowCardEntry) => void
    onDragEnd: () => void
  }

  let { card, isDragged = false, onCardClick, onDragStart, onDragEnd }: Props = $props()

  // Helper function to format relative time
  function formatRelativeTime(timestamp: any): string {
    if (!timestamp) return ''

    let date: Date
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      // Firestore Timestamp
      date = timestamp.toDate()
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp)
    } else {
      return ''
    }

    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    if (diffDays > 7) {
      return date.toLocaleDateString()
    } else if (diffDays > 0) {
      return `${diffDays}d`
    } else if (diffHours > 0) {
      return `${diffHours}h`
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m`
    }
    return ''
  }
</script>

<div
  draggable="true"
  ondragstart={(e) => onDragStart(e, card)}
  ondragend={onDragEnd}
  class="mb-5 cursor-grab transition-all duration-200 hover:-translate-y-1"
  class:opacity-50={isDragged}
  class:cursor-grabbing={isDragged}
  onclick={() => onCardClick(card)}
  role="button"
  tabindex="0"
  aria-label="Edit card: {card.title}"
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onCardClick(card)
    }
  }}
>
  <Card class="hover:border-blue-300 hover:shadow-lg dark:hover:border-blue-600">
    <div
      class="rounded-t-lg border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700"
    >
      <!-- Card Header with Title and Status Time -->
      <div class="flex items-start justify-between">
        <Heading tag="h5" class="text-lg font-medium tracking-tight text-gray-900 dark:text-white">
          {card.title}
        </Heading>

        <!-- Status Since Info -->
        {#if card.statusSince > 5000}
          <div
            class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400"
            title="In this status for {formatRelativeTime(card.statusSince)}"
          >
            <ClockOutline class="h-3 w-3" />
            <span>{formatRelativeTime(card.statusSince)}</span>
          </div>
        {/if}
      </div>
    </div>
    <div class="p-3">
      <!-- Card Description -->
      {#if card.description}
        <P class="mb-4 font-normal text-gray-700 dark:text-gray-400" size="sm">
          {card.description}
        </P>
      {/if}

      <!-- Card Metadata -->
      <div class="space-y-3">
        <!-- Owner and Value Row -->
        <div class="flex items-center justify-between text-sm">
          <div class="flex items-center gap-2">
            <Badge color={(!card.owner && 'gray') || 'blue'} rounded>
              {(card.owner && `@${card.owner.split('@')[0]}`) || 'unassigned'}
            </Badge>
          </div>

          {#if card.value > 0}
            <div class="flex items-center gap-2">
              <Badge color="orange" rounded>
                {formatAmount(card.value)}
              </Badge>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </Card>
</div>
