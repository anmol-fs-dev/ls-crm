export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
export type VerticalStatus = 'active' | 'archived';
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox';
export type CustomerType = 'individual' | 'company';
export type LifecycleStatus = 'lead_converted' | 'active' | 'churned' | 'onboarding' | 'vip';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'status_change' | 'converted' | 'system';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: UserRole;
          is_active: boolean;
          mfa_enabled: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          role?: UserRole;
          is_active?: boolean;
          mfa_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: UserRole;
          is_active?: boolean;
          mfa_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      verticals: {
        Row: {
          id: string;
          name: string;
          slug: string;
          color: string;
          icon: string;
          description: string | null;
          status: VerticalStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          color?: string;
          icon?: string;
          description?: string | null;
          status?: VerticalStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          color?: string;
          icon?: string;
          description?: string | null;
          status?: VerticalStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      vertical_members: {
        Row: {
          id: string;
          vertical_id: string;
          user_id: string;
          role_override: 'manager' | 'member' | 'viewer' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vertical_id: string;
          user_id: string;
          role_override?: 'manager' | 'member' | 'viewer' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vertical_id?: string;
          user_id?: string;
          role_override?: 'manager' | 'member' | 'viewer' | null;
          created_at?: string;
        };
      };
      pipeline_stages: {
        Row: {
          id: string;
          vertical_id: string;
          name: string;
          position: number;
          color: string | null;
          is_won: boolean;
          is_lost: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          vertical_id: string;
          name: string;
          position?: number;
          color?: string | null;
          is_won?: boolean;
          is_lost?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          vertical_id?: string;
          name?: string;
          position?: number;
          color?: string | null;
          is_won?: boolean;
          is_lost?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      custom_field_definitions: {
        Row: {
          id: string;
          vertical_id: string;
          entity_type: 'lead' | 'customer' | 'card';
          name: string;
          key: string;
          field_type: CustomFieldType;
          options: Json;
          is_required: boolean;
          position: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          vertical_id: string;
          entity_type: 'lead' | 'customer' | 'card';
          name: string;
          key: string;
          field_type: CustomFieldType;
          options?: Json;
          is_required?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          vertical_id?: string;
          entity_type?: 'lead' | 'customer' | 'card';
          name?: string;
          key?: string;
          field_type?: CustomFieldType;
          options?: Json;
          is_required?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      leads: {
        Row: {
          id: string;
          vertical_id: string;
          stage_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          source: string | null;
          owner_id: string | null;
          estimated_value: number;
          position: number;
          tags: string[];
          notes: string | null;
          custom_fields: Record<string, Json>;
          converted_to_customer_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          vertical_id: string;
          stage_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          source?: string | null;
          owner_id?: string | null;
          estimated_value?: number;
          position?: number;
          tags?: string[];
          notes?: string | null;
          custom_fields?: Record<string, Json>;
          converted_to_customer_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          vertical_id?: string;
          stage_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          source?: string | null;
          owner_id?: string | null;
          estimated_value?: number;
          position?: number;
          tags?: string[];
          notes?: string | null;
          custom_fields?: Record<string, Json>;
          converted_to_customer_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          type: CustomerType;
          email: string | null;
          phone: string | null;
          company: string | null;
          lifecycle_status: LifecycleStatus;
          owner_id: string | null;
          tags: string[];
          notes: string | null;
          custom_fields: Record<string, Json>;
          converted_from_lead_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          type?: CustomerType;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          lifecycle_status?: LifecycleStatus;
          owner_id?: string | null;
          tags?: string[];
          notes?: string | null;
          custom_fields?: Record<string, Json>;
          converted_from_lead_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          type?: CustomerType;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          lifecycle_status?: LifecycleStatus;
          owner_id?: string | null;
          tags?: string[];
          notes?: string | null;
          custom_fields?: Record<string, Json>;
          converted_from_lead_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      customer_verticals: {
        Row: {
          id: string;
          customer_id: string;
          vertical_id: string;
          custom_fields: Record<string, Json>;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          vertical_id: string;
          custom_fields?: Record<string, Json>;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          vertical_id?: string;
          custom_fields?: Record<string, Json>;
          status?: string;
          created_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          vertical_id: string | null;
          entity_type: 'lead' | 'customer' | 'card' | 'task';
          entity_id: string;
          activity_type: ActivityType;
          title: string;
          description: string | null;
          metadata: Record<string, Json>;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vertical_id?: string | null;
          entity_type: 'lead' | 'customer' | 'card' | 'task';
          entity_id: string;
          activity_type: ActivityType;
          title: string;
          description?: string | null;
          metadata?: Record<string, Json>;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vertical_id?: string | null;
          entity_type?: 'lead' | 'customer' | 'card' | 'task';
          entity_id?: string;
          activity_type?: ActivityType;
          title?: string;
          description?: string | null;
          metadata?: Record<string, Json>;
          created_by?: string | null;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          vertical_id: string | null;
          title: string;
          description: string | null;
          due_date: string | null;
          priority: PriorityLevel;
          status: TaskStatus;
          assignee_id: string | null;
          lead_id: string | null;
          customer_id: string | null;
          project_id: string | null;
          completed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          vertical_id?: string | null;
          title: string;
          description?: string | null;
          due_date?: string | null;
          priority?: PriorityLevel;
          status?: TaskStatus;
          assignee_id?: string | null;
          lead_id?: string | null;
          customer_id?: string | null;
          project_id?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          vertical_id?: string | null;
          title?: string;
          description?: string | null;
          due_date?: string | null;
          priority?: PriorityLevel;
          status?: TaskStatus;
          assignee_id?: string | null;
          lead_id?: string | null;
          customer_id?: string | null;
          project_id?: string | null;
          completed_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      boards: {
        Row: {
          id: string;
          vertical_id: string;
          name: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          vertical_id: string;
          name: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          vertical_id?: string;
          name?: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      board_columns: {
        Row: {
          id: string;
          board_id: string;
          name: string;
          position: number;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          name: string;
          position?: number;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          name?: string;
          position?: number;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cards: {
        Row: {
          id: string;
          board_id: string;
          column_id: string;
          title: string;
          description: string | null;
          position: number;
          priority: PriorityLevel;
          due_date: string | null;
          labels: string[];
          checklist: Json;
          assignee_ids: string[];
          lead_id: string | null;
          customer_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          board_id: string;
          column_id: string;
          title: string;
          description?: string | null;
          position?: number;
          priority?: PriorityLevel;
          due_date?: string | null;
          labels?: string[];
          checklist?: Json;
          assignee_ids?: string[];
          lead_id?: string | null;
          customer_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          board_id?: string;
          column_id?: string;
          title?: string;
          description?: string | null;
          position?: number;
          priority?: PriorityLevel;
          due_date?: string | null;
          labels?: string[];
          checklist?: Json;
          assignee_ids?: string[];
          lead_id?: string | null;
          customer_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      card_comments: {
        Row: {
          id: string;
          card_id: string;
          content: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          card_id: string;
          content: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          card_id?: string;
          content?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          vertical_id: string | null;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vertical_id?: string | null;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          vertical_id?: string | null;
          name?: string;
          color?: string;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          vertical_id: string | null;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_data: Json;
          new_data: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          vertical_id?: string | null;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_data?: Json;
          new_data?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          vertical_id?: string | null;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          old_data?: Json;
          new_data?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
  };
}
