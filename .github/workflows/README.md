# GitHub Actions Deployment

This directory contains the GitHub Actions workflow for deploying the Cadence project to Firebase.

## Setup Instructions

To enable automatic deployment, you need to configure the following secrets in your GitHub repository:

### Required Secrets

1. **FIREBASE_SERVICE_ACCOUNT_KEY**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Copy the entire JSON content and add it as a repository secret

2. **FIREBASE_PROJECT_ID**
   - Your Firebase project ID (found in Firebase Console project settings)

### Setting up Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret with the exact names listed above

## Workflow Details

The deployment workflow:

1. **Triggers**: Runs on pushes to `main` branch and pull requests
2. **Build & Test**: 
   - Installs dependencies for both web and functions
   - Runs tests, type checking, and linting for web
   - Builds both web application and functions
3. **Deploy**: Only runs on `main` branch pushes after successful build/test
   - Deploys to Firebase hosting and functions

## Local Development

The workflow uses the same commands defined in CLAUDE.md:
- `cd web && npm run test` - Run tests
- `cd web && npm run check` - Type checking  
- `cd web && npm run lint` - Code formatting check
- `cd web && npm run build` - Build web app
- `cd functions && npm run build` - Build functions