<script lang="ts">
  import type { IWorkflowCard, ApprovalToken } from '@cadence/shared/types'
  import { Badge, Button, Modal } from 'flowbite-svelte'
  import { CheckOutline, CloseOutline } from 'flowbite-svelte-icons'

  interface Props {
    approvalKey: string
    approvalTokens: Record<string, ApprovalToken[]>
    onClose: () => void
    approvalTitle?: string
  }

  let { approvalKey = $bindable(), approvalTokens, onClose, approvalTitle }: Props = $props()

  const isOpen = $derived(() => approvalKey !== '')

  const tokens = $derived((): ApprovalToken[] => {
    if (!approvalTokens || !approvalTokens[approvalKey]) {
      return []
    }
    // Sort by date descending (newest first)
    return [...approvalTokens[approvalKey]].sort((a, b) => b.date - a.date)
  })

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
  }

  function getTokenBadgeProps(token: ApprovalToken) {
    if (token.voided) {
      return { color: 'gray' as const, icon: null, text: 'Voided' }
    }
    if (token.isNegative) {
      return { color: 'red' as const, icon: CloseOutline, text: 'Rejected' }
    }
    return { color: 'green' as const, icon: CheckOutline, text: 'Approved' }
  }
</script>

<Modal open={isOpen()} title="Approval History: {approvalTitle || approvalKey}" size="xl">
  <div class="space-y-4">
    {#if tokens().length === 0}
      <div class="py-8 text-center">
        <p class="text-gray-500 dark:text-gray-400">
          No approval history found for this approval key.
        </p>
      </div>
    {:else}
      {#each tokens() as token (token.date)}
        {@const badgeProps = getTokenBadgeProps(token)}
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="mb-2 flex items-center gap-2">
                <Badge color={badgeProps.color} class="px-2 py-0.5 text-xs">
                  {#if badgeProps.icon}
                    {@const IconComponent = badgeProps.icon}
                    <IconComponent class="mr-1 h-3 w-3" />
                  {/if}
                  {badgeProps.text}
                </Badge>
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(token.date)}
                </span>
              </div>

              <div class="mb-2">
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  <span class="font-medium">Author:</span>
                  {token.author}
                </p>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  <span class="font-medium">Type:</span>
                  {token.kind}
                </p>
              </div>

              {#if token.note}
                <div class="mb-2">
                  <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Note:</p>
                  <p
                    class="mt-1 rounded bg-gray-50 p-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  >
                    "{token.note}"
                  </p>
                </div>
              {/if}

              {#if token.voided}
                <div class="mt-2 rounded bg-red-50 p-2 dark:bg-red-900/20">
                  <p class="text-sm text-red-700 dark:text-red-300">
                    <span class="font-medium">Voided on:</span>
                    {formatDate(token.voided[0])}
                  </p>
                  <p class="text-sm text-red-700 dark:text-red-300">
                    <span class="font-medium">Voided by:</span>
                    {token.voided[1]}
                  </p>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  {#snippet footer()}
    <Button color="alternative" onclick={() => (approvalKey = '')}>Close</Button>
  {/snippet}
</Modal>
