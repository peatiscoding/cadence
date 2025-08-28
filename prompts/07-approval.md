Approval
==

In our Workflow some task (Card) required approval. Hence we decided to make it official; Create the approval function.

To approve; during Transition Operation we can set required field which is named: `approvals`. By setting `statuses[].approvals` within `statuses` nodes - this means to be able to Transit the Context (Card) MUST have this specific field described in `statuses[].approvals` to contains a valid `ApprovalToken` (non-voided ApprovalToken).

Our Card will now contains `approvals` node which contains array of `ApprovalToken`

```ts
interface ApprovalToken {
    kind: "basic" // type
    note: string // hand written information
    author: string // uid of user
    date: number // epoch
    isNegative: boolean // is negative approval (not valid)
    voided?: [number, string] // mark as this approval token has been voided. when by who
}
```

# Features

1. The transition function will read the current snapshot of field on the Transition and examine the required approval tokens (only those voided is undefined will be considered a validate approval token). To make sure if the transit to this status is valid (e.g. approved).
2. We can also remove the approval (void) by using Transition hook as well. e.g. Leaving status A to B will void all approvals in used in specific field. However this feature is not yet designed or yet to be implemented.
3. User can approve by provide an ApprovalToken object. UI  wise this is a popup dialog that user can provide the `note` infomration about how did this approval has been approved. e.g. Email approval by subject, etc. In the future we can have other type of approval token.

## Feature: Required Approval Token

Priority: **Highest**

- `ApprovalToken` will be saved in `card.approvalTokens` node.
- UI Wise we will create a dedicate component for each kind of `ApprovalToken`. Currently we only have `basic` type which is provide a free text.
- `kind` of acceptable approval token is also set in `Configuration.approvals` to state that such `approvalKey` may only be approved with which type of `ApprovalToken`
- All `approvals` are always visible.
- UI Wise in Card dialog approval will display below `fields` section where user can see all approvals by its key. Once click on each key it will overlay another dialog to list the history of approvals (with its notes). If user is eligible to provide the approval there will be another action button below the history say: `Add <basic> Approval` button which open up another `Approval Basic Dialog` (this is to be a factory selector as `Add ** Approval` button will be based on possible approval kinds. And corresponding Dialog will be invoke down the line.
- On Basic Approval Dialog user can provide the note and set `approve` or `decline` to create an approval record.

## Feature: Multiple Approval Factor

Priority: **High**

- this already works along with the Required Approval Token feature -- The Multiple Approval Factors refers to multiple approval keys; Which is defined at status level.

## Feature: Other Approval Token Type

Priority: **Medium**

TBD
