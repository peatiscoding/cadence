<script lang="ts">
  import type { WorkflowConfiguration, IWorkflowCard, ApprovalToken } from '@cadence/shared/types'
  import {
    getLatestApprovalToken,
    getApprovalDisplayName,
    getApprovalDisplayNameByKey
  } from '@cadence/shared/utils/approval-validation'
  import { Badge, Button } from 'flowbite-svelte'
  import {
    CheckOutline,
    CloseOutline,
    ClockOutline,
    EyeOutline,
    PlusOutline
  } from 'flowbite-svelte-icons'
  import ApprovalHistoryDialog from './ApprovalHistoryDialog.svelte'

  interface Props {
    config: WorkflowConfiguration
    approvalTokens: Record<string, ApprovalToken[]>
    onApprovalClick: (approvalKey: string) => void
  }

  let { config, approvalTokens, onApprovalClick }: Props = $props()
  let showHistoryDialog = $state('')

  function openApprovalHistory(approvalKey: string) {
    console.log('Open approval history')
    showHistoryDialog = approvalKey
  }

  function closeApprovalHistory() {
    console.log('close ApprovalHistoryDialog')
    showHistoryDialog = ''
  }

  function getApprovalStatus(approvalKey: string): {
    status: 'none' | 'approved' | 'rejected'
    author: string | null
    note: string | null
  } {
    if (!approvalTokens) return { status: 'none', author: null, note: null }

    const latestToken = getLatestApprovalToken({ approvalTokens } as any, approvalKey)
    if (!latestToken) return { status: 'none', author: null, note: null }

    return {
      status: latestToken.isNegative ? 'rejected' : 'approved',
      author: latestToken.author,
      note: latestToken.note
    }
  }

  function getStatusBadgeProps(status: 'none' | 'approved' | 'rejected') {
    switch (status) {
      case 'approved':
        return { color: 'green' as const, icon: CheckOutline }
      case 'rejected':
        return { color: 'red' as const, icon: CloseOutline }
      default:
        return { color: 'yellow' as const, icon: ClockOutline }
    }
  }

  // Get approvals that are visible (have definitions in config)
  const availableApprovals = $derived(() => {
    if (!config.approvals) return []
    return config.approvals
  })
</script>

{#if availableApprovals().length > 0}
  <div class="border-t border-gray-200 pt-6 dark:border-gray-700">
    <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-gray-100">Approvals</h3>
    <div class="space-y-3">
      {#each availableApprovals() as approval}
        {@const approvalStatus = getApprovalStatus(approval.slug)}
        {@const badgeProps = getStatusBadgeProps(approvalStatus.status)}
        <div class="flex items-center justify-between rounded-lg bg-gray-50 py-2 dark:bg-gray-800">
          <div class="flex flex-1 items-center gap-3">
            <div class="flex items-center gap-2">
              <Badge color={badgeProps.color} class="px-2 py-0.5 text-xs">
                {#if badgeProps.icon}
                  {@const IconComponent = badgeProps.icon}
                  <IconComponent class="mr-1 h-3 w-3" />
                {/if}
                {approvalStatus.status === 'none'
                  ? 'Pending'
                  : approvalStatus.status === 'approved'
                    ? 'Approved'
                    : 'Rejected'}
              </Badge>
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {getApprovalDisplayName(approval)}
              </span>
            </div>

            <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              {#if approvalStatus.author}
                <span>By: {approvalStatus.author}</span>
              {/if}
              {#if approvalStatus.note}
                <span class="max-w-xs truncate">"{approvalStatus.note}"</span>
              {/if}
            </div>
          </div>

          <div class="flex items-center gap-1">
            <Button
              color="orange"
              size="sm"
              class="p-2"
              outline
              onclick={() => openApprovalHistory(approval.slug)}
              title="View approval history"
              aria-label="View approval history for {getApprovalDisplayName(approval)}"
            >
              <EyeOutline class="h-4 w-4" />
            </Button>
            <Button
              color="blue"
              size="sm"
              class="p-2"
              outline
              onclick={() => onApprovalClick(approval.slug)}
              title="Add approval"
              aria-label="Add approval for {getApprovalDisplayName(approval)}"
            >
              <PlusOutline class="h-4 w-4" />
            </Button>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <ApprovalHistoryDialog
    bind:approvalKey={showHistoryDialog}
    {approvalTokens}
    onClose={closeApprovalHistory}
    approvalTitle={getApprovalDisplayNameByKey(config, showHistoryDialog)}
  />
{/if}
