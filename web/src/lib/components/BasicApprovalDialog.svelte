<script lang="ts">
  import { Button, Textarea, Label, Radio, Modal } from 'flowbite-svelte'

  interface Props {
    open: boolean
    approvalKey: string
    approvalTitle?: string
    onSubmit: (data: { note: string; isNegative: boolean }) => Promise<void>
    isSubmitting?: boolean
  }

  let {
    open = $bindable(),
    approvalKey,
    approvalTitle,
    onSubmit,
    isSubmitting = false
  }: Props = $props()

  let note = $state('')
  let approvalType = $state<'approve' | 'decline'>('approve')
  let errors = $state<Record<string, string>>({})

  function validateForm() {
    errors = {}
    if (!note.trim()) {
      errors.note = 'Note is required'
      return false
    }
    return true
  }

  async function handleSubmit() {
    if (!validateForm()) return

    try {
      await onSubmit({
        note: note.trim(),
        isNegative: approvalType === 'decline'
      })

      // Reset form
      note = ''
      approvalType = 'approve'
      errors = {}
      open = false
    } catch (error) {
      console.error('Failed to submit approval:', error)
      // Error handling will be done by parent component
    }
  }

  function handleClose() {
    // Reset form when closing
    note = ''
    approvalType = 'approve'
    errors = {}
    open = false
  }

  // Focus on note input when dialog opens
  $effect(() => {
    if (open) {
      setTimeout(() => {
        const noteInput = document.getElementById('approval-note') as HTMLTextAreaElement
        if (noteInput) {
          noteInput.focus()
        }
      }, 100)
    }
  })
</script>

<Modal bind:open title="Add Basic Approval: {approvalTitle || approvalKey}" autoclose={false}>
  <div class="space-y-6">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      Provide your approval decision and a note explaining the reasoning behind your decision.
    </p>

    <!-- Approval Type Selection -->
    <div class="space-y-2">
      <Label class="text-base font-medium text-gray-900 dark:text-gray-100">Decision</Label>
      <div class="flex gap-6">
        <Radio
          name="approval-type"
          value="approve"
          bind:group={approvalType}
          class="text-green-600 focus:ring-green-500"
        >
          Approve
        </Radio>
        <Radio
          name="approval-type"
          value="decline"
          bind:group={approvalType}
          class="text-red-600 focus:ring-red-500"
        >
          Decline
        </Radio>
      </div>
    </div>

    <!-- Note Input -->
    <div class="space-y-2">
      <Label for="approval-note" class="text-base font-medium text-gray-900 dark:text-gray-100">
        Note <span class="text-red-500">*</span>
      </Label>
      <Textarea
        id="approval-note"
        bind:value={note}
        placeholder="Enter your approval note here (e.g., 'Approved via email confirmation from client on 2024-01-15', 'Budget approved by finance team', etc.)"
        rows={4}
        class="w-full {errors.note ? 'border-red-500' : ''}"
      />
      {#if errors.note}
        <p class="text-sm text-red-600 dark:text-red-400">{errors.note}</p>
      {/if}
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Provide detailed information about how this approval was obtained or the reason for decline.
      </p>
    </div>
  </div>

  {#snippet footer()}
    <Button color="alternative" onclick={handleClose}>Cancel</Button>
    <Button
      color={approvalType === 'approve' ? 'green' : 'red'}
      onclick={handleSubmit}
      disabled={isSubmitting}
    >
      {#if isSubmitting}
        Submitting...
      {:else if approvalType === 'approve'}
        Add Approval
      {:else}
        Add Decline
      {/if}
    </Button>
  {/snippet}
</Modal>
