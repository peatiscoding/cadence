/**
 * Shared TypeScript type definitions for Cadence
 * 
 * Common types that are used across frontend and backend
 */

// Base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User types
export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

// Workflow types
export interface WorkflowCard extends BaseEntity {
  workflowId: string;
  workflowCardId: string;
  title: string;
  description?: string;
  status: string;
  type: string;
  value: number;
  owner: string;
  createdBy: string;
  fieldData: Record<string, any>;
}

// Configuration types
export interface WorkflowConfiguration {
  id: string;
  name: string;
  description?: string;
  statuses: WorkflowStatus[];
  types: WorkflowType[];
  fields: WorkflowField[];
}

export interface WorkflowStatus {
  slug: string;
  title: string;
  terminal: boolean;
  ui: {
    color: string;
  };
  precondition?: {
    required: string[];
  };
}

export interface WorkflowType {
  slug: string;
  title: string;
  ui: {
    color: string;
  };
}

export interface WorkflowField {
  slug: string;
  title: string;
  description?: string;
  schema: FieldSchema;
}

export interface FieldSchema {
  kind: 'text' | 'number' | 'bool' | 'url' | 'choice' | 'multi-choice';
  min?: number;
  max?: number;
  choices?: string[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}