import { z } from 'zod';

// ====================================================================
// AUTH SCHEMAS
// ====================================================================
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const inviteUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'manager', 'member', 'viewer']),
  verticalIds: z.array(z.string()).min(1, 'Please select at least one vertical'),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

// ====================================================================
// VERTICAL SCHEMAS
// ====================================================================
export const verticalSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color code'),
  icon: z.string().min(1, 'Please select an icon'),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'archived']).default('active'),
});
export type VerticalInput = z.infer<typeof verticalSchema>;

export const pipelineStageSchema = z.object({
  name: z.string().min(2, 'Stage name must be at least 2 characters'),
  position: z.number().default(1000),
  color: z.string().optional().nullable(),
  is_won: z.boolean().default(false),
  is_lost: z.boolean().default(false),
});
export type PipelineStageInput = z.infer<typeof pipelineStageSchema>;

export const customFieldDefSchema = z.object({
  name: z.string().min(2, 'Field label required'),
  key: z.string().min(2, 'Field key required').regex(/^[a-z0-9_]+$/, 'Field key must be lowercase alphanumeric with underscores'),
  field_type: z.enum(['text', 'number', 'date', 'select', 'checkbox']),
  options: z.array(z.string()).optional(),
  is_required: z.boolean().default(false),
  position: z.number().default(0),
});
export type CustomFieldDefInput = z.infer<typeof customFieldDefSchema>;

// ====================================================================
// LEAD SCHEMAS
// ====================================================================
export const leadSchema = z.object({
  vertical_id: z.string().min(1, 'Vertical is required'),
  stage_id: z.string().min(1, 'Pipeline stage is required'),
  name: z.string().min(2, 'Lead name or company required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  source: z.string().optional().or(z.literal('')),
  owner_id: z.string().optional().nullable(),
  estimated_value: z.number().nonnegative('Value must be positive').default(0),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  custom_fields: z.record(z.string(), z.any()).default({}),
});
export type LeadInput = z.infer<typeof leadSchema>;

// ====================================================================
// CUSTOMER SCHEMAS
// ====================================================================
export const customerSchema = z.object({
  name: z.string().min(2, 'Customer name required'),
  type: z.enum(['individual', 'company']).default('individual'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  lifecycle_status: z.enum(['lead_converted', 'active', 'churned', 'onboarding', 'vip']).default('active'),
  owner_id: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
  custom_fields: z.record(z.string(), z.any()).default({}),
  vertical_ids: z.array(z.string()).min(1, 'Customer must belong to at least one vertical'),
});
export type CustomerInput = z.infer<typeof customerSchema>;

// ====================================================================
// TASK SCHEMAS
// ====================================================================
export const taskSchema = z.object({
  title: z.string().min(2, 'Task title required'),
  description: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  assignee_id: z.string().optional().nullable(),
  vertical_id: z.string().optional().nullable(),
  lead_id: z.string().optional().nullable(),
  customer_id: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
});
export type TaskInput = z.infer<typeof taskSchema>;
