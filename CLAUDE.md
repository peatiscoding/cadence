# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cadence is a configurable project management tool with Firebase/Firestore backend and Svelte frontend. The system uses file-based workflow configurations to create customizable Kanban-style boards with cards that move through defined statuses.

## Development Commands

This project uses **npm workspaces** for monorepo management. You can run commands from the root directory.

### Root-level Commands
- `npm run dev` - Start web development server
- `npm run build` - Build all workspaces (web + functions)
- `npm run build:web` - Build web frontend only
- `npm run build:functions` - Build functions only
- `npm run test` - Run tests in all workspaces
- `npm run test:web` - Run web tests only
- `npm run check` - Type check web frontend
- `npm run lint` - Run linting on all workspaces
- `npm run format` - Format code in all workspaces
- `npm run deploy` - Build and deploy everything to Firebase
- `npm run deploy:web` - Build and deploy web frontend only
- `npm run deploy:functions` - Build and deploy functions only
- `npm run serve:functions` - Start Firebase emulators
- `npm run clean` - Clean all node_modules and build artifacts
- `npm run install:all` - Install dependencies for all workspaces

### Web Frontend (SvelteKit) - Workspace Commands
- `npm run dev --workspace=web` - Start development server
- `npm run build --workspace=web` - Build for production  
- `npm run preview --workspace=web` - Preview production build
- `npm run test --workspace=web` - Run all tests
- `npm run test:unit --workspace=web` - Run unit tests with Vitest (interactive mode)
- `npm run test:unit -- --run --workspace=web` - Run unit tests once
- `npm run check --workspace=web` - Type check with svelte-check
- `npm run lint --workspace=web` - Check code formatting with Prettier
- `npm run format --workspace=web` - Format code with Prettier

### Firebase Functions - Workspace Commands
- `npm run build --workspace=functions` - Compile TypeScript
- `npm run serve --workspace=functions` - Start Firebase emulators
- `npm run deploy --workspace=functions` - Deploy to Firebase
- `npm run logs --workspace=functions` - View function logs

### Shared Utilities - Workspace Commands
- `npm run build --workspace=shared` - Compile TypeScript shared utilities
- `npm run build:watch --workspace=shared` - Watch mode compilation
- `npm run type-check --workspace=shared` - Type check without compilation
- `npm run test --workspace=shared` - Run Jest tests
- `npm run test:watch --workspace=shared` - Run tests in watch mode
- `npm run format --workspace=shared` - Format code with Prettier

### Legacy Commands (still work)
- `cd web && npm run dev` - Start development server
- `cd web && npm run build` - Build for production  
- `cd functions && npm run build` - Compile TypeScript
- `cd functions && npm run serve` - Start Firebase emulators

## Architecture

### Project Structure
- `/web` - SvelteKit frontend with TailwindCSS v4
- `/functions` - Firebase Functions backend (TypeScript)
- `/shared` - Shared TypeScript utilities and logic (used by both web and functions)
- `/prompts` - Project requirements and specifications
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Database indexes

### Core Concepts
The application revolves around **Cards** that move through configurable **Workflows**:

- **Workflows**: JSON configuration files define fields, statuses, transitions, and actions
- **Cards**: Data entities with custom fields, owners, status tracking, and audit logs
- **Statuses**: Workflow states with preconditions, transitions, and UI configuration
- **Field Schemas**: Support number, text, boolean, and URL field types with validation

### Data Model
```
/users/<user-id> = User object
/workflows/<workflow-id>/cards/<card-id> = Card document  
/workflows/<workflow-id>/logs/<log-id> = Audit logs
```

### Testing Setup
- Vitest with dual test environments: browser (Playwright) and Node.js
- Client tests: `.svelte.test.ts` files run in browser environment for component testing
- Server tests: `.test.ts` files run in Node.js environment
- Test configuration splits client and server tests automatically

## Key Technologies
- Frontend: Svelte 5, SvelteKit, TailwindCSS v4, TypeScript
- Backend: Firebase Functions, Firestore
- Testing: Vitest, Playwright
- Build: Vite

## UI Style Guide

### Hover Effects
For interactive cards and clickable elements, use consistent hover effects:

**Standard Card Hover Pattern:**
```html
class="hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-1 transition-all duration-200"
```

**Components:**
- `hover:shadow-lg` - Enhanced shadow for depth
- `hover:border-blue-300 dark:hover:border-blue-600` - Blue border highlight 
- `hover:-translate-y-1` - Subtle upward lift (1 unit)
- `transition-all duration-200` - Smooth 200ms animation for all effects

**Usage Examples:**
- Workflow listing cards (`/workflows`)
- Project cards
- Interactive buttons and panels
- Any clickable card-like components

**Note:** Always include both light and dark mode variants for border colors.

### Modal Design
For consistent modal dialogs throughout the application:

**Standard Modal Pattern:**
```html
<!-- Modal Backdrop -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onclick={closeModal}>
  <!-- Modal Container -->
  <div class="mx-4 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800">
    <!-- Modal Header -->
    <div class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Modal Title</h2>
      <button class="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200">
        <!-- Close icon -->
      </button>
    </div>
    
    <!-- Modal Content -->
    <div class="p-6">
      <!-- Content goes here -->
    </div>
    
    <!-- Modal Footer -->
    <div class="flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-700">
      <button class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
        Cancel
      </button>
      <button class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
        Save Changes
      </button>
    </div>
  </div>
</div>
```

**Components:**
- **Backdrop:** `fixed inset-0 z-50 bg-black bg-opacity-50` - Full screen overlay with 50% opacity
- **Container:** `max-h-[90vh] max-w-4xl overflow-y-auto` - Responsive with scrollable content
- **Header:** Consistent border, padding, and close button positioning
- **Footer:** Right-aligned buttons with consistent spacing and colors
- **Buttons:** Cancel (gray) and primary action (blue) with hover states

**Usage Examples:**
- Configuration modals (workflow settings)
- Form dialogs
- Confirmation dialogs
- Content editing modals

**Interaction:**
- Click backdrop to close (implement `closeModal` handler)
- **Escape key support required** - All modals must be dismissible with the Escape key
- Focus management for accessibility
- Add `tabindex="-1"` to modal backdrop for keyboard focus
- Add `onkeydown={handleKeydown}` event handler for escape key detection

## Keyboard Shortcuts and Event Handling

### Global Keyboard Shortcuts
For application-wide keyboard shortcuts that work regardless of focus, use `window.addEventListener` in component lifecycle:

**Global Shortcut Pattern:**
```javascript
import { onMount } from 'svelte'

onMount(() => {
  // Global keyboard event handler
  const handleGlobalKeydown = (event: KeyboardEvent) => {
    // Handle escape key for modals
    if (event.key === 'Escape') {
      if (showConfigModal) {
        handleCancel()
      } else if (showCardFormModal) {
        closeCardFormModal()
      }
      return
    }
    
    // Only handle global shortcuts when no modal is open and no input is focused
    if (showConfigModal || showCardFormModal) return
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      return

    // Application shortcuts
    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault()
      openCardFormModal()
    } else if (event.key === 'c' || event.key === 'C') {
      event.preventDefault()
      openConfigModal()
    }
  }

  // Register global keyboard listener
  window.addEventListener('keydown', handleGlobalKeydown)

  // Always clean up on component destroy
  return () => {
    window.removeEventListener('keydown', handleGlobalKeydown)
  }
})
```

**Key Guidelines:**
- Use `window.addEventListener('keydown', handler)` for global shortcuts
- Always clean up with `window.removeEventListener` in onMount return function
- Check for modal states and input focus to prevent conflicts
- Use `event.preventDefault()` to prevent default browser behavior
- Test for both uppercase and lowercase key variants

### Input Focus Management
For auto-focusing form inputs when modals open:

```javascript
import { onMount } from 'svelte'

onMount(() => {
  const titleInput = document.getElementById('title') as HTMLInputElement
  if (titleInput) {
    titleInput.focus()
  }
})
```

**Note:** This pattern works better than element-level `onkeydown` handlers because:
- Works globally regardless of which element has focus
- No need for `tabindex="-1"` on containers
- More predictable behavior across the application
