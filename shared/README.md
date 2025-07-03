# @cadence/shared

Shared TypeScript utilities and logic for the Cadence monorepo.

## Overview

This workspace contains common code that can be used by both the frontend (`web`) and backend (`functions`) workspaces. It provides:

- **Types**: Common TypeScript interfaces and type definitions
- **Utils**: Utility functions for common operations
- **Validation**: Zod schemas for data validation

## Structure

```
shared/
├── src/
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── validation/     # Zod validation schemas
│   └── index.ts        # Main entry point
├── dist/               # Compiled JavaScript output
├── package.json
├── tsconfig.json
└── README.md
```

## Usage

### From Web Workspace

```typescript
import { WorkflowCard, ApiResponse } from '@cadence/shared';
import { slugify, formatDate } from '@cadence/shared/utils';
import { WorkflowCardSchema } from '@cadence/shared/validation';
```

### From Functions Workspace

```typescript
import { WorkflowConfiguration } from '@cadence/shared';
import { validateEmail } from '@cadence/shared/validation';
import { deepClone } from '@cadence/shared/utils';
```

## Available Exports

### Main Entry (`@cadence/shared`)
- All types, utils, and validation exports

### Types (`@cadence/shared/types`)
- `User`, `WorkflowCard`, `WorkflowConfiguration`
- `WorkflowStatus`, `WorkflowType`, `WorkflowField`
- `ApiResponse`, `ApiError`

### Utils (`@cadence/shared/utils`)
- `formatDate`, `formatDateTime`
- `slugify`, `capitalize`, `truncate`
- `deepClone`, `omit`, `pick`
- `generateId`, `isValidEmail`, `isValidUrl`
- `groupBy`, `uniqueBy`

### Validation (`@cadence/shared/validation`)
- `UserSchema`, `WorkflowCardSchema`, `WorkflowConfigurationSchema`
- `EmailSchema`, `UrlSchema`, `SlugSchema`, `ColorSchema`
- `validateEmail`, `validateUrl`, `validateSlug`, `validateColor`

## Development

### Build
```bash
npm run build --workspace=shared
```

### Watch Mode
```bash
npm run build:watch --workspace=shared
```

### Type Check
```bash
npm run type-check --workspace=shared
```

### Test
```bash
npm run test --workspace=shared
```

### Format
```bash
npm run format --workspace=shared
```
