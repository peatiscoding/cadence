Cadence
==

**Cadence** is a project management tool that backed with Firebase's Firestore Database with Configuration File.

# Technologies

Feature|Backed Resources
--|--
Configurable Workflow|File based configuration
Login|Any OAuth2.0 Provider
Persistent Storage|Firestore Database

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
                "type": "number",
                "default": number?,
                "max": number,
                "min": number
            } | {
                "type": "text",
                "default": string?,
                "max": number?,
                "min": number?,
                "regex": "regex-string" // to validate
            } | {
                "type": "bool",
                "default": bool?
            } | {
                "type": "url"
            }
        },
        ...
    ],
    "statuses": [
        {
            "slug": "status-slug",  // status-slug (key)
            "default": true,        // define if this status is a default one! default may only set to 'true' only one item in "statuses" array.
            "precondition": {       // condition
                "from": ["status-slug-1", "status-slug-2", "status-slug-N"], // required statuses
                "required": ["field-key-1", "field-key-2", "field-key-N"],
                "users": ["user-sso-that-can-move-card-to-this-status", "*"], // '*' to allow every one , 'owner' to allow only owner to update this status.
            },
            "transition": [         // action to perform once setting this status has been set.
                {
                    "type": "set-owner",
                    "to": {
                        "type": "fixed",
                        "value": "value"
                    } | {
                        "type": "field",
                        "field": "field-slug", // if this field is not set, it will action will be rejected.
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
}
```
