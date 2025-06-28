# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cadence is a configurable project management tool with Firebase/Firestore backend and Svelte frontend. The system uses file-based workflow configurations to create customizable Kanban-style boards with cards that move through defined statuses.

## Development Commands

### Web Frontend (SvelteKit)
- `cd web && npm run dev` - Start development server
- `cd web && npm run build` - Build for production  
- `cd web && npm run preview` - Preview production build
- `cd web && npm run test` - Run all tests
- `cd web && npm run test:unit` - Run unit tests with Vitest (interactive mode)
- `cd web && npm run test:unit -- --run` - Run unit tests once
- `cd web && npm run check` - Type check with svelte-check
- `cd web && npm run lint` - Check code formatting with Prettier
- `cd web && npm run format` - Format code with Prettier

### Firebase Functions
- `cd functions && npm run build` - Compile TypeScript
- `cd functions && npm run serve` - Start Firebase emulators
- `cd functions && npm run deploy` - Deploy to Firebase
- `cd functions && npm run logs` - View function logs

## Architecture

### Project Structure
- `/web` - SvelteKit frontend with TailwindCSS v4
- `/functions` - Firebase Functions backend (TypeScript)
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

**Escape Key Implementation:**
```javascript
// Handle escape key to close modal
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeModal() // or onCancel() depending on modal
  }
}
```

```html
<!-- Modal with escape key support -->
<div class="fixed inset-0 z-50 bg-black bg-opacity-50" onclick={closeModal} onkeydown={handleKeydown} tabindex="-1">
  <div class="modal-content" onclick={(e) => e.stopPropagation()}>
    <!-- Modal content -->
  </div>
</div>
```