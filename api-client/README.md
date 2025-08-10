# @cadence/api-client

HTTP API client for Cadence Firebase Functions. Provides a clean, type-safe interface to interact with Cadence's backend API.

## Features

- 🔒 **Automatic Authentication** - Handles Firebase Auth tokens automatically
- 🚀 **TypeScript First** - Full type safety with IntelliSense support
- 🌐 **CORS Ready** - Built for web applications with proper CORS handling
- ⚡ **Modern Async/Await** - Promise-based API with async/await support
- 🛡️ **Error Handling** - Comprehensive error handling with custom error types
- ⏱️ **Configurable Timeouts** - Per-endpoint timeout configuration
- 🔧 **Flexible Configuration** - Support for different environments and projects

## Installation

```bash
npm install @cadence/api-client
```

## Quick Start

```typescript
import { CadenceAPIClient } from '@cadence/api-client'
import { getAuth } from 'firebase/auth'

// Initialize the client
const client = new CadenceAPIClient({
  projectId: 'your-firebase-project',
  region: 'asia-southeast2' // optional, defaults to shared config
})

// Or with Firebase Auth instance
const auth = getAuth()
const client = new CadenceAPIClient({ projectId: 'your-project' }, auth)

// Create a card
const newCard = await client.createCard({
  workflowId: 'lead-to-proposal',
  payload: {
    title: 'New Lead',
    status: 'new',
    description: 'Potential client from website'
  }
})

// Transit workflow item
await client.transitWorkflowItem({
  destinationContext: {
    workflowId: 'lead-to-proposal',
    workflowCardId: newCard.cardId,
    status: 'qualified'
  }
})

// Provision user
await client.provisionUser({})
```

## API Methods

### `createCard(request: CreateCardRequest)`

Creates a new card in a workflow.

```typescript
const card = await client.createCard({
  workflowId: 'my-workflow',
  cardId: 'optional-custom-id', // Optional - auto-generated if not provided
  payload: {
    title: 'My Card',
    status: 'new',
    // ... other card fields
  }
})
```

### `transitWorkflowItem(request: ITransitWorkflowItemRequest)`

Moves a card to a different status in the workflow.

```typescript
await client.transitWorkflowItem({
  destinationContext: {
    workflowId: 'my-workflow',
    workflowCardId: 'card-id',
    status: 'in-progress'
  }
})
```

### `provisionUser(request: ProvisionUserRequest)`

Ensures a user document exists in Firestore for the authenticated user.

```typescript
const userInfo = await client.provisionUser({})
```

## Configuration

```typescript
const client = new CadenceAPIClient({
  projectId: 'your-firebase-project',    // Required
  region: 'asia-southeast2',             // Optional, defaults to shared config
  baseUrl: 'https://custom-domain.com',  // Optional, override function URLs
  timeout: 30000                         // Optional, request timeout in ms
})
```

## Error Handling

The client throws `APIError` instances for all API-related errors:

```typescript
import { APIError } from '@cadence/api-client'

try {
  await client.createCard({ /* ... */ })
} catch (error) {
  if (error instanceof APIError) {
    console.log('API Error:', error.message)
    console.log('Error Code:', error.code)
    console.log('Details:', error.details)
  }
}
```

## Authentication

The client automatically handles Firebase Authentication:

- Requires user to be signed in for all API calls
- Automatically includes Bearer token in requests
- Throws error if user is not authenticated

```typescript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

// Sign in first
const auth = getAuth()
await signInWithEmailAndPassword(auth, email, password)

// Client will automatically use the authenticated user
const client = new CadenceAPIClient({ projectId: 'my-project' }, auth)
```

## Development

```bash
# Build the package
npm run build

# Watch for changes
npm run build:watch

# Run tests
npm run test

# Type checking
npm run type-check
```