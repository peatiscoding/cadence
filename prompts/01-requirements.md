Cadence
==

**Cadence** is a project management tool that backed with Firebase's Firestore Database with Configuration File.

# Technologies

Feature|Backed Resources
--|--
Configurable Workflow|File based configuration
Login|Any OAuth2.0 Provider
Persistent Storage|Firestore Database
Frontend|Svelte, TypeScript
Backend|TypeScript, Firebase Function for Workflow's

# Feature List

## 1. Login

User should be able to login with either:

1. Firesbase Login
1. Zoho Login

Once logged in user will be able to perform/query the cards.

## 2. Persistent Storage

- The Storage must be backed with Firestore Database to make sure we promote Real-Time experiences.
- User can create a new **CARD**.
- Each card may have their own status. Each status will be represented with each column. (Same as Trello where status is the main definition of where the card should be).

## 3. Configurable Workflow

The Configuration can be defined with File.

Cadence can run multiple workflows. Each workflow is defined with 1 single file.

The Workflow Configuration's File:

```json
{
    "name": "workflow-name",        // Workflow's name
    "fields": [                     // Field's schema
        {
            "slug": "field-key",    // required, Field's key
            "title": "Name of the field", // required
            "description": "description of the field", // optional
            "schema": {             // required
                "kind": "number",
                "default": number?,
                "max": number,
                "min": number
            } | {
                "kind": "text",
                "default": string?,
                "max": number?,
                "min": number?,
                "regex": "regex-string" // to validate
            } | {
                "kind": "bool",
                "default": bool?
            } | {
                "kind": "url"
            }
        },
        ...
    ],
    "statuses": [
        {
            "slug": "status-slug",  // status-slug (key)
            "title": "Status Name", // Status title for display
            "terminal": boolean,    // is this status terminal
            "ui": {                 // UI's configuration
                "color": "#333"     // the accent to be used
            },
            "precondition": {       // condition
                "from": ["status-slug-1", "status-slug-2", "status-slug-N"], // required statuses
                "required": ["field-key-1", "field-key-2", "field-key-N"],
                "users": ["user-sso-that-can-move-card-to-this-status", "*"], // '*' to allow every one , 'owner' to allow only owner to update this status.
            },
            "transition": [         // action to perform before setting this status has been set.
                {
                    "kind": "set-owner",
                    "to": {
                        "kind": "fixed",
                        "value": "value"
                    } | {
                        "kind": "field",
                        "field": "field-slug", // if this field is not set, it will action will be rejected.
                    }
                }
            ],
            "finally": [            // action to perform after setting this status has been set.
                {
                    "kind": "send-email",
                    "to": {
                        "kind": "fixed",
                        "value": "value"
                    } | {
                        "kind": "field",
                        "field": "field-slug", // if this field is not set, or is not email it will failed to execute (silently)
                    }
                }
            ]
        },
        ...
    ]
}
```

### Logical OOP Class

```ts
class Card {

    /**
     * Parent workflow id.
     */
    workflowId: string

    /**
     * Primary key of the CardId.
     */
    workflowCardId: string

    /**
     * Title of this card
     */
    title: string

    /**
     * Description of this card
     */
    description: string

    /**
     * Estimate Card's value for ease of viewing
     */
    value: string

    /**
     * Sub-type of Card for ease of configuration
     */
    type: string

    /**
     * Fields' data according to the Schema defined in Configuration
     */
    fieldData: Record<string, any>

    /**
     * Current Status
     */
    status: string

    /**
     * Card has been moved to this status since?
     */
    statusSince: Date

    /**
     * User that own this card. (Can be change during the status' transition)
     */
    owner: string

    /**
     * User that create this card
     */
    createdBy: string

    /**
     * When the card was created
     */
    createdAt: string

    /**
     * User that update this card
     */
    updatedBy: string

    /**
     * Last update of this card
     */
    updatedAt: string

    /**
     * The terminal status that has been resolved.
     */
    terminalStatus: string | null
}
```

### Card Psudo Logic

1. User can create the card with the required fields (Based on schema) the status will be forced to use `draft` status. `draft` status is not included in the shared view (only creator can see their own draft). This will mitigate the required field value problem.
1. Once card is created user can move it to their first status when ready. It is recommended that the "first-status" should accept "from" as `draft` with all required fields set.
1. If the destination status is configured as `terminalStatus` the card will be marked as `terminalStatus` to such status or otherwise null accordingly.
1. During each status transition (including Create, Update) logs will be generated via Firestore's document creation hooks. (Hence validation failure will not be logged). Author of changes will be updated to the `updatedBy` and `updatedAt` fields.

### Workflow Card's Logging

Logs are recorded as a Firestore's Document.

## Firestore Document Storage

```
Firestore
 |
 +- /users
 |  |
 |  +- /<user-id> = User object
 |
 +- /workflows
    |
    +- /<workflow-id>
       |
       +- /cards
       |  |
       |  +- /<card-id> = Card's Document
       |
       +- /logs
          |
          +- /<log-id> = Card's Document snapshot + log messages
```

