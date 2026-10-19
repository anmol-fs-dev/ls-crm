-- Core Schema Migration for Multi-Vertical CRM
-- Version: 20261019000001
-- Tables: profiles, verticals, vertical_members, pipeline_stages, custom_field_definitions,
--         leads, customers, customer_verticals, activities, tasks, boards, board_columns,
--         cards, card_comments, tags, audit_logs

-- 1. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 2. Verticals (Dynamic Workspaces - pure data)
CREATE TABLE IF NOT EXISTS public.verticals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    icon TEXT NOT NULL DEFAULT 'briefcase',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 3. Vertical Members (User membership & permissions per vertical)
CREATE TABLE IF NOT EXISTS public.vertical_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_override TEXT CHECK (role_override IN ('manager', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (vertical_id, user_id)
);

-- 4. Pipeline Stages (Configurable per vertical)
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position DOUBLE PRECISION NOT NULL DEFAULT 1000,
    color TEXT DEFAULT '#64748b',
    is_won BOOLEAN NOT NULL DEFAULT false,
    is_lost BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 5. Custom Field Definitions (Per vertical custom fields stored as JSONB in records)
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'customer', 'card')),
    name TEXT NOT NULL,
    key TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'checkbox')),
    options JSONB DEFAULT '[]'::jsonb,
    is_required BOOLEAN NOT NULL DEFAULT false,
    position DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ,
    UNIQUE (vertical_id, entity_type, key)
);

-- 6. Leads
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID NOT NULL REFERENCES public.verticals(id) ON DELETE RESTRICT,
    stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    source TEXT,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    estimated_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    position DOUBLE PRECISION NOT NULL DEFAULT 1000,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    notes TEXT,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    converted_to_customer_id UUID,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 7. Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'company')),
    email TEXT,
    phone TEXT,
    company TEXT,
    lifecycle_status TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN ('lead_converted', 'active', 'churned', 'onboarding', 'vip')),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    notes TEXT,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    converted_from_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- Circular foreign key from leads to customers
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_leads_converted_customer'
    ) THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT fk_leads_converted_customer 
        FOREIGN KEY (converted_to_customer_id) 
        REFERENCES public.customers(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 8. Customer Verticals (Many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.customer_verticals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    vertical_id UUID NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (customer_id, vertical_id)
);

-- 9. Activities (Central timeline for leads, customers, tasks, cards)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID REFERENCES public.verticals(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'customer', 'card', 'task')),
    entity_id UUID NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('note', 'call', 'email', 'meeting', 'stage_change', 'status_change', 'converted', 'system')),
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Boards (Per-vertical project kanban boards)
CREATE TABLE IF NOT EXISTS public.boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 11. Board Columns
CREATE TABLE IF NOT EXISTS public.board_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position DOUBLE PRECISION NOT NULL DEFAULT 1000,
    color TEXT DEFAULT '#64748b',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Cards (Kanban project cards)
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    position DOUBLE PRECISION NOT NULL DEFAULT 1000,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    labels TEXT[] NOT NULL DEFAULT '{}'::text[],
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    assignee_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 13. Card Comments
CREATE TABLE IF NOT EXISTS public.card_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. Tasks (Personal & team todos)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID REFERENCES public.verticals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 15. Tags (General & vertical-specific tags)
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID REFERENCES public.verticals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#64748b',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (vertical_id, name)
);

-- 16. Audit Logs (Tamper-resistant audit trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID REFERENCES public.verticals(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_leads_vertical_stage ON public.leads (vertical_id, stage_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads (email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads (phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customer_verticals_customer ON public.customer_verticals (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_verticals_vertical ON public.customer_verticals (vertical_id);
CREATE INDEX IF NOT EXISTS idx_activities_entity ON public.activities (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON public.tasks (assignee_id, status, due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cards_column_pos ON public.cards (column_id, position) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
