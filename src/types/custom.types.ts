import {
  Database,
  UserRole,
  VerticalStatus,
  CustomFieldType,
  CustomerType,
  LifecycleStatus,
  PriorityLevel,
  TaskStatus,
  ActivityType,
} from './database.types';

export type {
  UserRole,
  VerticalStatus,
  CustomFieldType,
  CustomerType,
  LifecycleStatus,
  PriorityLevel,
  TaskStatus,
  ActivityType,
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Vertical = Database['public']['Tables']['verticals']['Row'];
export type VerticalMember = Database['public']['Tables']['vertical_members']['Row'];
export type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row'];
export type CustomFieldDefinition = Database['public']['Tables']['custom_field_definitions']['Row'];
export type Lead = Database['public']['Tables']['leads']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type CustomerVertical = Database['public']['Tables']['customer_verticals']['Row'];
export type Activity = Database['public']['Tables']['activities']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Board = Database['public']['Tables']['boards']['Row'];
export type BoardColumn = Database['public']['Tables']['board_columns']['Row'];
export type Card = Database['public']['Tables']['cards']['Row'];
export type CardComment = Database['public']['Tables']['card_comments']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

export interface CardChecklistItem {
  id: string;
  title: string;
  is_completed: boolean;
}

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: Profile['role'];
  verticalMemberships: string[]; // vertical IDs
}

export interface LeadFilterState {
  search?: string;
  verticalId?: string;
  stageId?: string;
  ownerId?: string;
  source?: string;
  tag?: string;
  sortBy?: 'created_at' | 'estimated_value' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface TaskFilterState {
  view: 'my' | 'team';
  status?: Task['status'] | 'all';
  priority?: Task['priority'];
  verticalId?: string;
  timeframe?: 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';
}
