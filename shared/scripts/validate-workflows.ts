#!/usr/bin/env node

/**
 * Validation script for workflow configuration files
 * This script validates all *.workflow.ts files in the shared/src/defined directory
 * against the ConfigurationSchema to catch errors before compilation.
 */

import * as fs from 'fs'
import * as path from 'path'
import { ConfigurationSchema } from '../src/validation/configuration/configuration'
import type { WorkflowConfiguration } from '../src/types'

interface WorkflowModule {
  default: WorkflowConfiguration & { workflowId: string }
}

/**
 * Dynamically import and validate a workflow configuration file
 */
async function validateWorkflowFile(filePath: string): Promise<void> {
  const relativePath = path.relative(process.cwd(), filePath)
  console.log(`🔍 Validating ${relativePath}...`)

  try {
    // Import the workflow configuration
    const workflowModule: WorkflowModule = await import(filePath)

    if (!workflowModule.default) {
      throw new Error(`No default export found in ${relativePath}`)
    }

    const workflowConfig = workflowModule.default

    // Validate against schema
    const result = ConfigurationSchema.safeParse(workflowConfig)

    if (!result.success) {
      console.error(`❌ Validation failed for ${relativePath}:`)
      result.error.errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error.path.join('.')}: ${error.message}`)
      })
      throw new Error(`Schema validation failed for ${relativePath}`)
    }

    // Additional validations
    if (!workflowConfig.workflowId) {
      throw new Error(`Missing workflowId property in ${relativePath}`)
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(workflowConfig.workflowId)) {
      throw new Error(
        `Invalid workflowId format in ${relativePath}. Must contain only letters, numbers, underscores, and hyphens`
      )
    }

    console.log(`✅ ${relativePath} is valid`)

    return
  } catch (error) {
    console.error(`❌ Error validating ${relativePath}:`)
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    throw error
  }
}

/**
 * Find all *.workflow.ts files in a directory
 */
function findWorkflowFiles(dir: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...findWorkflowFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.workflow.ts')) {
      files.push(fullPath)
    }
  }

  return files
}

/**
 * Main validation function
 */
async function validateAllWorkflows(): Promise<void> {
  const definedDir = path.join(__dirname, '..', 'src', 'defined')

  console.log('🚀 Starting workflow configuration validation...')
  console.log(`📂 Searching in: ${definedDir}`)

  const workflowFiles = findWorkflowFiles(definedDir)

  if (workflowFiles.length === 0) {
    console.log('⚠️  No *.workflow.ts files found')
    return
  }

  console.log(`📄 Found ${workflowFiles.length} workflow file(s)`)
  console.log('')

  let hasErrors = false

  for (const filePath of workflowFiles) {
    try {
      await validateWorkflowFile(filePath)
    } catch (error) {
      hasErrors = true
    }
    console.log('')
  }

  if (hasErrors) {
    console.error('💥 Workflow validation failed! Please fix the errors above.')
    process.exit(1)
  } else {
    console.log('🎉 All workflow configurations are valid!')
  }
}

// Check if this script is being run directly
if (require.main === module) {
  validateAllWorkflows().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { validateAllWorkflows, validateWorkflowFile, findWorkflowFiles }

