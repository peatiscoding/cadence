# User Management System

This directory contains the user management functionality for Cadence, including display name resolution and provisioning optimization.

## Components

### UserDirectory

Main class for user management operations:

- `getDisplayName(uid)` - Get display name for a user
- `getUserInfo(uid)` - Get full user information
- `provisionCurrentUser()` - Ensure current user exists in Firestore
- `batchGetDisplayNames(uids)` - Efficiently fetch multiple user names
- `clearCache()` - Clear all caches (useful on logout)

### ProvisioningCache

Cookie-based caching to prevent unnecessary server calls:

- Automatically prevents redundant `provisionUserFn` calls
- Uses secure, first-party cookies with 30-day expiration
- Cleared automatically on logout

## Development & Debugging

### Debug Console Commands

```javascript
// Check if a user is provisioned
UserDirectory.debug.isUserProvisioned('user_123')

// List all provisioning cookies
UserDirectory.debug.listProvisioningCookies()

// Get current cache state
UserDirectory.debug.getCacheState()

// Force re-provisioning (clears cache)
UserDirectory.forceReprovisionUser('user_123')
```

### Performance Monitoring

The system includes debug logging to help monitor provisioning behavior:

```javascript
// Enable debug logging in browser console
localStorage.setItem('debug', 'cadence:*')
```

Look for these log messages:

- `"User {uid} already provisioned (cached), skipping server call"` - Cache hit
- `"Calling provisionUserFn for user {uid}"` - Server call being made
- `"Marked user {uid} as provisioned"` - Cookie cache set

## How It Works

1. **First Login**: User logs in → `provisionUserFn` called → User document created → Cookie set
2. **Subsequent Sessions**: User logs in → Cookie found → Server call skipped → Local cache used
3. **Cache Expiry**: After 30 days → Cookie expires → Next login triggers server call again

## Cache Layers

1. **Provisioning Cache** (Cookie): Tracks if user has been provisioned on server
2. **Display Name Cache** (localStorage): Caches user display names for 1 hour
3. **Memory Cache** (Map): In-memory cache for current session

This multi-layer approach ensures optimal performance while maintaining data freshness.
