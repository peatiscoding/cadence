# Background Works

Whenever document is updated, it is critical to create an Audit Log and we can use these logs to display the activities in UI later.

## Feature

1. When document changed detected. The /activities/ will then be recorded.
1. When document changed it will also update the statistic value of the Workflow so that it can be displayed in Dashboard.

## Document

### Aggregated Stats

1. **Location**: `/stats/{workflowId}/per/{status}` (single document per status)
2. **Path Variables**:
   - `{workflowId}` - References the workflow collection
   - `{status}` - The specific status being tracked
3. **Document Fields**:
   - `totalTransitionTime` - Number: Total milliseconds cards have spent in this status (only for cards that have left)
   - `totalTransitionCount` - Number: Count of cards that have transitioned through this status (completed transitions only)
   - `currentPendings` - Array: Cards currently in this status with metadata
   - `lastUpdated` - Timestamp: Last time this stats document was modified
   - `workflowId` - String: Reference to parent workflow for validation

#### Current Pendings Array Structure

Each item in `currentPendings` contains:
- `cardId` - String: Reference to the card document ID
- `statusSince` - Timestamp: When the card entered this status
- `value` - Number: Card's current value field (for aggregation)
- `userId` - String: User who initiated the status change

#### Computed/Derived Fields (calculated client-side)

- `currentNetValue` - Number: Sum of all `value` fields in `currentPendings`
- `currentCount` - Number: Length of `currentPendings` array
- `currentTotalDuration` - Number: Total milliseconds all current cards have spent in this status
- `averageTransitionTime` - Number: `totalTransitionTime / totalTransitionCount` (if count > 0)

#### Example

```json
{
    "workflowId": "lead-to-proposal",
    "totalTransitionTime": 3050000,
    "totalTransitionCount": 2,
    "lastUpdated": "2024-01-16T14:30:00Z",
    "currentPendings": [
        {
            "cardId": "mts-gold",
            "statusSince": "2024-01-16T09:00:00Z",
            "value": 3000000,
            "userId": "user_123"
        },
        {
            "cardId": "small-project",
            "statusSince": "2024-01-16T12:15:00Z", 
            "value": 50000,
            "userId": "user_456"
        }
    ]
}
```

### Activity Document

1. Location /activities/
2. `documentKey` is automatically generated ID from firebase.
3. Document Fields:
    1. `id` - Auto-generated Firebase document ID
    1. `workflowId` - String: The workflow this activity belongs to
    1. `workflowCardId` - String: The card that was modified
    1. `cardTitle` - String: The title of the card for better display in UI
    1. `userId` - String: ID of the user who performed the action
    1. `timestamp` - Timestamp: When the activity occurred (server timestamp)
    1. `action` - String: Type of action performed:
        * 'create' - Card was created in DraftMode
        * 'update' - Card was updated but status remained the same
        * 'transit' - Card status was changed to another status
        * 'delete' - Card was deleted
    1. `changes` - Array: Records the specific field changes
        - Each change object contains the field key and before/after values
        - Keys use dot notation for nested fields (e.g., 'fieldData.proposal-url')
        - For 'create' actions, only 'to' values are recorded
        - For 'update'/'transit' actions, both 'from' and 'to' values are recorded
        - For 'delete' actions, only 'from' values are recorded

#### Example

```json
[
    { /* document key is auto generated from firebase */
        "workflowId": "lead-to-proposal",
        "workflowCardId": "mts-gold",
        "cardTitle": "MTS Gold",
        "userId": "user_123",
        "timestamp": "2024-01-15T10:30:00Z",
        "action": "create",
        "changes": [
            {
                "key": "title",
                "to": "MTS Gold"
            },
            {
                "key": "status",
                "to": "draft"
            },
            {
                "key": "value",
                "to": 3000000
            },
            {
                "key": "fieldData.type",
                "to": "OT"
            }
        ]
    },
    { /* document key is auto generated from firebase */
        "workflowId": "lead-to-proposal",
        "workflowCardId": "mts-gold",
        "cardTitle": "MTS Gold",
        "userId": "user_123",
        "timestamp": "2024-01-15T14:45:00Z",
        "action": "transit",
        "changes": [
            {
                "key": "status",
                "from": "draft",
                "to": "proposal"
            },
            {
                "key": "fieldData.proposal-url",
                "to": "https://drive.google.com/w/asdkj49012-"
            }
        ]
    },
    { /* document key is auto generated from firebase */
        "workflowId": "lead-to-proposal",
        "workflowCardId": "mts-gold",
        "cardTitle": "MTS Gold",
        "userId": "user_456",
        "timestamp": "2024-01-16T09:20:00Z",
        "action": "update",
        "changes": [
            {
                "key": "fieldData.proposal-url",
                "from": "https://drive.google.com/w/asdkj49012-",
                "to": "https://drive.google.com/w/asdkj49012-30-103"
            }
        ]
    },
    { /* document key is auto generated from firebase */
        "workflowId": "lead-to-proposal",
        "workflowCardId": "mts-gold",
        "cardTitle": "MTS Gold",
        "userId": "user_123",
        "timestamp": "2024-01-20T16:00:00Z",
        "action": "delete",
        "changes": [
            {
                "key": "status",
                "from": "proposal"
            },
            {
                "key": "fieldData.proposal-url",
                "from": "https://drive.google.com/w/asdkj49012-30-103"
            }
        ]
    }
]
```

## Implementation

### Firebase Function Setup

1. **Trigger Type**: Use Firestore onDocumentWritten trigger to capture all changes (create, update, delete)
2. **Document Path**: Listen to `/workflows/{workflowId}/cards/{cardId}` documents
3. **Function Location**: Deploy in same region as Firestore database for optimal performance

### Implementation Details

```typescript
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export const logCardActivity = onDocumentWritten(
  'workflows/{workflowId}/cards/{cardId}',
  async (event) => {
    const { workflowId, cardId } = event.params
    const beforeData = event.data?.before?.data()
    const afterData = event.data?.after?.data()
    
    // Determine action type and generate changes array
    // Create activity document in /activities/ collection
  }
)
```

### Key Implementation Steps

1. **Action Detection Logic**:
   - `create`: beforeData is null, afterData exists
     - **Stats Updates**: Add card to initial status stats
       - Target document: `/stats/{workflowId}/per/{item.status}` (draft)
       - `arrayUnion('currentPendings', { cardId, statusSince: NOW(), value: cardValue, userId })`
       - Update `lastUpdated` timestamp
   
   - `update`: both beforeData and afterData exist, status unchanged (no stats update is computed for this event)
    - **Stats Updates** no update needed
   - `transit`: both exist, status field changed
     - **Stats Updates**: Move card between status collections
       - **From Status** (`/stats/{workflowId}/per/{oldStatus}`):
         - `increment('totalTransitionTime', NOW() - originalStatusSince)`
         - `increment('totalTransitionCount', 1)`
         - `arrayRemove('currentPendings', oldPendingItem)`
       - **To Status** (`/stats/{workflowId}/per/{newStatus}`):
         - `arrayUnion('currentPendings', { cardId, statusSince: NOW(), value: cardValue, userId })`
       - Update `lastUpdated` on both documents
   
   - `delete`: beforeData exists, afterData is null
     - **Stats Updates**: Remove card from current status
       - Target document: `/stats/{workflowId}/per/{currentStatus}`
       - `increment('totalTransitionTime', NOW() - originalStatusSince)`
       - `increment('totalTransitionCount', 1)`
       - `arrayRemove('currentPendings', currentPendingItem)`
       - Update `lastUpdated` timestamp

2. **Change Detection**:
   - Compare beforeData and afterData recursively
   - Generate flattened key paths using dot notation
   - Record only fields that actually changed

3. **Activity Document Creation**:
   - Generate new document in `/activities/` collection
   - Use server timestamp for consistency
   - Extract userId from authentication context or document metadata

4. **Performance Considerations**:
   - Use batch writes for related operations
   - Implement debouncing for rapid successive changes
   - Consider using background queues for heavy processing

### Deployment Configuration

```json
{
  "source": "functions",
  "runtime": "nodejs22",
  "memory": "256MB",
  "timeout": "60s",
  "regions": // Use constants defined in /shared/ workspace
}
```

### TypeScript Interface Definitions

```typescript
// Aggregated stats document structure
interface StatusStats {
  workflowId: string
  totalTransitionTime: number // milliseconds
  totalTransitionCount: number
  lastUpdated: FirebaseFirestore.Timestamp
  currentPendings: StatusPending[]
}

// Individual pending card in a status
interface StatusPending {
  cardId: string
  statusSince: FirebaseFirestore.Timestamp
  value: number
  userId: string
}

// Activity log document structure  
interface ActivityLog {
  workflowId: string
  workflowCardId: string
  userId: string
  timestamp: FirebaseFirestore.Timestamp
  action: 'create' | 'update' | 'transit' | 'delete'
  changes: ActivityChange[]
}

// Individual field change in activity
interface ActivityChange {
  key: string
  from?: any // Only for update/transit/delete
  to?: any   // Only for create/update/transit
}

// Stats operations for Firebase Functions
interface StatsOperation {
  type: 'increment' | 'arrayUnion' | 'arrayRemove' | 'set'
  field: string
  value: any
  document: string // document path
}
```

## User Management System

To provide meaningful display names in activities and avoid duplicating user data, the application maintains a centralized users collection.

### Users Collection Structure

1. **Location**: `/users/{uid}` (Firebase Auth UID as document key)
2. **Document Fields**:
   - `uid` - String: Firebase Authentication UID (matches document ID)
   - `email` - String: User's email address from Firebase Auth
   - `displayName` - String: User-customizable display name (defaults to email prefix)
   - `role` - String: User role, either 'user' or 'admin' (defaults to 'user')
   - `createdAt` - Timestamp: When the user document was first created
   - `lastUpdated` - Timestamp: Last time user data was modified

#### Example User Document

```json
{
  "uid": "firebase_auth_uid_123",
  "email": "john.doe@company.com", 
  "displayName": "John Doe",
  "role": "user",
  "createdAt": "2024-01-15T10:00:00Z",
  "lastUpdated": "2024-01-20T14:30:00Z"
}
```

### User Directory Management

#### Frontend Implementation

1. **Local Storage Caching**:
   - Cache user directory in browser localStorage
   - Key: `cadence_user_directory_v1`
   - Structure: `Record<string, { displayName: string, email: string }>`
   - Invalidate cache after 1 hour for fresh data

2. **Centralized User Resolution Function**:
   ```typescript
   // /web/src/lib/users/directory.ts
   export class UserDirectory {
     private static cache: Map<string, UserInfo> = new Map()
     private static cacheTimestamp: number = 0
     private static CACHE_DURATION = 60 * 60 * 1000 // 1 hour
     
     static async getDisplayName(uid: string): Promise<string> {
       // Try cache first
       if (this.isCacheValid() && this.cache.has(uid)) {
         return this.cache.get(uid)!.displayName
       }
       
       // Fetch from Firestore and update cache
       const userDoc = await firestore.doc(`users/${uid}`).get()
       if (userDoc.exists) {
         const userData = userDoc.data() as UserInfo
         this.cache.set(uid, userData)
         return userData.displayName
       }
       
       // Fallback to UID if user not found
       return uid
     }
     
     static async batchGetDisplayNames(uids: string[]): Promise<Record<string, string>> {
       // Batch fetch multiple users for efficiency
     }
   }
   ```

3. **User Document Creation**:
   - Auto-create user documents when users first authenticate
   - Default displayName to email prefix (before @)
   - Allow users to customize displayName in settings

#### Backend Integration

1. **Activity Logging Enhancement**:
   - Continue storing userId (Firebase UID) in ActivityLog
   - Frontend resolves displayName using UserDirectory
   - No changes needed to existing activity logging functions

2. **User Document Provisioning via Firebase Functions**:
   ```typescript
   // Backend: /functions/src/fns/provision-user.ts
   export function createProvisionUser(app: App) {
     return async (request: CallableRequest<ProvisionUserRequest>): Promise<ProvisionUserResponse> => {
       const uid = request.auth.uid
       const userRef = db.collection('users').doc(uid)
       const userDoc = await userRef.get()
       
       if (!userDoc.exists) {
         const authUser = await auth.getUser(uid)
         const userInfo: UserInfo = {
           uid,
           email: authUser.email,
           displayName: authUser.displayName || authUser.email.split('@')[0],
           role: 'user',
           createdAt: Timestamp.now(),
           lastUpdated: Timestamp.now()
         }
         await userRef.set(userInfo)
         return { success: true, userInfo, wasCreated: true }
       }
       
       return { success: true, userInfo: userDoc.data(), wasCreated: false }
     }
   }
   ```

3. **Frontend Auto-Provisioning**:
   ```typescript
   // Frontend: Called automatically on auth state changes
   onAuthStateChanged(this.auth, async (user) => {
     if (user && user.uid) {
       try {
         await UserDirectory.provisionCurrentUser()
       } catch (error) {
         console.warn('Failed to provision user:', error)
       }
     }
   })
   ```

### Frontend UI Updates

1. **Activity Display**:
   - Replace `activity.userId` with resolved displayName
   - Show "by John Doe" instead of "by firebase_auth_uid_123"
   - Add loading states for user resolution

2. **Card Ownership**:
   - Display card owners with displayNames
   - Update card forms to show current user's displayName

3. **User Settings Page**:
   - Allow users to edit their displayName
   - Show email (read-only)
   - Show current role (read-only for regular users)
   - Admin interface for role management
   - Update lastUpdated timestamp on changes

### Performance Considerations

1. **Batch User Lookups**:
   - Fetch multiple user documents in single request for activity lists
   - Use Firestore's `getAll()` method for efficiency

2. **Cache Management**:
   - Implement cache warming for frequently accessed users
   - Use reactive stores for real-time displayName updates
   - Clear cache on user logout

3. **Firestore Rules**:
   ```javascript
   // firestore.rules
   match /users/{uid} {
     allow read: if request.auth != null; // Any authenticated user can read
     allow write: if request.auth != null && request.auth.uid == uid; // Only owner can write
   }
   ```

### Security & Permissions

- Function service account needs read access to card documents
- Function service account needs write access to activities collection  
- Function service account needs write access to stats collection
- Function service account needs read/write access to users collection (for auto-creation)
- Frontend users need read access to all user documents (for displayName resolution)
- Frontend users can only write to their own user document

### Error Handling & Reliability

1. **Retry Logic**:
   - Firebase Functions automatically retry on failures
   - Implement idempotency checks to prevent duplicate activities
   - Use activity document ID based on timestamp + cardId for deduplication
   - **Stats Operations**: Use Firestore transactions for atomic updates across multiple stats documents

2. **Error Scenarios**:
   - **Missing user context**: Log activity with system user ID, extract from auth context when possible
   - **Malformed data**: Skip invalid fields, log warnings, continue with valid data
   - **Database write failures**: Function will auto-retry up to 3 times
   - **Large change sets**: Truncate changes array if exceeds reasonable limit (>50 changes)
   - **Stats inconsistencies**: Log errors but don't block activity creation
   - **Missing stats documents**: Auto-create with default values during first write
   - **Array operation conflicts**: Use transactions to prevent race conditions in currentPendings updates

3. **Monitoring & Logging**:
   - Log function execution metrics to Firebase console
   - Track success/failure rates for both activity creation and stats updates
   - Monitor stats document sizes and currentPendings array lengths
   - Alert on high failure rates or unusual activity patterns
   - Track performance metrics for batch operations

4. **Data Consistency**:
   - Activities are eventually consistent (acceptable delay)
   - Stats updates use Firestore transactions for atomic operations
   - Implement periodic reconciliation jobs to fix stats inconsistencies
   - Consider implementing cleanup for orphaned currentPendings entries
   - Add validation to ensure currentPendings arrays don't grow unbounded

5. **Performance Considerations**:
   - Batch multiple stats operations when possible
   - Use appropriate indexes on stats collection for dashboard queries
   - Consider implementing stats caching for frequently accessed data
   - Monitor function execution time and optimize for large workflows

