-- Consolidated Supabase Schema & Initial Setup
-- Multi-Vertical Company CRM (Production Ready)
-- Compatible with Supabase Free Tier Postgres & Supabase SQL Editor

-- ====================================================================
-- SECTION 1: CORE TABLES & INDEXES
-- ====================================================================

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

CREATE TABLE IF NOT EXISTS public.vertical_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_override TEXT CHECK (role_override IN ('manager', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (vertical_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS public.customer_verticals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    vertical_id UUID NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (customer_id, vertical_id)
);

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

CREATE TABLE IF NOT EXISTS public.board_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position DOUBLE PRECISION NOT NULL DEFAULT 1000,
    color TEXT DEFAULT '#64748b',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

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

CREATE TABLE IF NOT EXISTS public.card_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

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

CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID REFERENCES public.verticals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#64748b',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (vertical_id, name)
);

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

-- ====================================================================
-- SECTION 2: ROW LEVEL SECURITY & PERMISSIONS
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vertical_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true AND deleted_at IS NULL LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
    SELECT coalesce(public.current_user_role() IN ('owner', 'admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.has_vertical_access(target_vertical_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
    SELECT CASE
        WHEN target_vertical_id IS NULL THEN true
        WHEN public.is_admin() THEN true
        ELSE EXISTS (
            SELECT 1 FROM public.vertical_members vm
            JOIN public.verticals v ON v.id = vm.vertical_id
            WHERE vm.vertical_id = target_vertical_id 
              AND vm.user_id = auth.uid()
              AND v.deleted_at IS NULL
        )
    END;
$$;

CREATE OR REPLACE FUNCTION public.can_write_vertical(target_vertical_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
    SELECT CASE
        WHEN public.is_admin() THEN true
        ELSE EXISTS (
            SELECT 1 FROM public.vertical_members vm
            JOIN public.profiles p ON p.id = vm.user_id
            WHERE vm.vertical_id = target_vertical_id 
              AND vm.user_id = auth.uid()
              AND coalesce(vm.role_override, p.role) NOT IN ('viewer')
              AND p.is_active = true
        )
    END;
$$;

CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (deleted_at IS NULL OR public.is_admin());
CREATE POLICY "Users can update own profile name and avatar" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND (role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) OR public.is_admin()));
CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Verticals viewable by vertical members or admins" ON public.verticals FOR SELECT TO authenticated USING ((deleted_at IS NULL AND (status = 'active' OR public.is_admin())) AND public.has_vertical_access(id));
CREATE POLICY "Only admins can insert verticals" ON public.verticals FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Only admins can update verticals" ON public.verticals FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Only admins can delete verticals" ON public.verticals FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "Vertical members viewable by assigned users or admins" ON public.vertical_members FOR SELECT TO authenticated USING (public.has_vertical_access(vertical_id));
CREATE POLICY "Admins or managers can manage vertical membership" ON public.vertical_members FOR ALL TO authenticated USING (public.is_admin() OR (public.current_user_role() = 'manager' AND public.has_vertical_access(vertical_id))) WITH CHECK (public.is_admin() OR (public.current_user_role() = 'manager' AND public.has_vertical_access(vertical_id)));

CREATE POLICY "Stages readable by vertical members" ON public.pipeline_stages FOR SELECT TO authenticated USING (public.has_vertical_access(vertical_id));
CREATE POLICY "Stages manageable by managers and admins" ON public.pipeline_stages FOR ALL TO authenticated USING (public.can_write_vertical(vertical_id)) WITH CHECK (public.can_write_vertical(vertical_id));

CREATE POLICY "Custom fields readable by vertical members" ON public.custom_field_definitions FOR SELECT TO authenticated USING (public.has_vertical_access(vertical_id));
CREATE POLICY "Custom fields manageable by managers and admins" ON public.custom_field_definitions FOR ALL TO authenticated USING (public.can_write_vertical(vertical_id)) WITH CHECK (public.can_write_vertical(vertical_id));

CREATE POLICY "Leads readable by vertical members" ON public.leads FOR SELECT TO authenticated USING (public.has_vertical_access(vertical_id) AND (deleted_at IS NULL OR public.is_admin()));
CREATE POLICY "Leads insertable by writers in vertical" ON public.leads FOR INSERT TO authenticated WITH CHECK (public.can_write_vertical(vertical_id));
CREATE POLICY "Leads updatable by vertical writers" ON public.leads FOR UPDATE TO authenticated USING (public.can_write_vertical(vertical_id) AND (public.is_admin() OR public.current_user_role() IN ('owner', 'admin', 'manager') OR created_by = auth.uid() OR owner_id = auth.uid())) WITH CHECK (public.can_write_vertical(vertical_id));
CREATE POLICY "Leads soft-deletable by managers and admins" ON public.leads FOR DELETE TO authenticated USING (public.is_admin() OR (public.current_user_role() = 'manager' AND public.has_vertical_access(vertical_id)));

CREATE POLICY "Customers readable by linked vertical members or admins" ON public.customers FOR SELECT TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.customer_verticals cv WHERE cv.customer_id = id AND public.has_vertical_access(cv.vertical_id)));
CREATE POLICY "Customers insertable by authenticated users" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Customers updatable by linked vertical members" ON public.customers FOR UPDATE TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.customer_verticals cv WHERE cv.customer_id = id AND public.can_write_vertical(cv.vertical_id)));

CREATE POLICY "Customer verticals readable by members" ON public.customer_verticals FOR SELECT TO authenticated USING (public.has_vertical_access(vertical_id));
CREATE POLICY "Customer verticals manageable by vertical writers" ON public.customer_verticals FOR ALL TO authenticated USING (public.can_write_vertical(vertical_id)) WITH CHECK (public.can_write_vertical(vertical_id));

CREATE POLICY "Activities viewable by entity vertical members" ON public.activities FOR SELECT TO authenticated USING (vertical_id IS NULL OR public.has_vertical_access(vertical_id));
CREATE POLICY "Activities insertable by vertical writers" ON public.activities FOR INSERT TO authenticated WITH CHECK (vertical_id IS NULL OR public.can_write_vertical(vertical_id));

CREATE POLICY "Tasks readable by assigned user or vertical members" ON public.tasks FOR SELECT TO authenticated USING (assignee_id = auth.uid() OR created_by = auth.uid() OR public.has_vertical_access(vertical_id));
CREATE POLICY "Tasks insertable by authenticated users" ON public.tasks FOR INSERT TO authenticated WITH CHECK (vertical_id IS NULL OR public.can_write_vertical(vertical_id));
CREATE POLICY "Tasks updatable by assignee, creator, or managers" ON public.tasks FOR UPDATE TO authenticated USING (assignee_id = auth.uid() OR created_by = auth.uid() OR public.is_admin() OR (public.current_user_role() = 'manager' AND public.has_vertical_access(vertical_id)));
CREATE POLICY "Tasks deletable by creator, manager, or admin" ON public.tasks FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.is_admin() OR (public.current_user_role() = 'manager' AND public.has_vertical_access(vertical_id)));

CREATE POLICY "Boards readable by vertical members" ON public.boards FOR SELECT TO authenticated USING (public.has_vertical_access(vertical_id));
CREATE POLICY "Boards manageable by vertical writers" ON public.boards FOR ALL TO authenticated USING (public.can_write_vertical(vertical_id)) WITH CHECK (public.can_write_vertical(vertical_id));

CREATE POLICY "Board columns readable by board vertical members" ON public.board_columns FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND public.has_vertical_access(b.vertical_id)));
CREATE POLICY "Board columns manageable by vertical writers" ON public.board_columns FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND public.can_write_vertical(b.vertical_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND public.can_write_vertical(b.vertical_id)));

CREATE POLICY "Cards readable by vertical members" ON public.cards FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND public.has_vertical_access(b.vertical_id)));
CREATE POLICY "Cards manageable by vertical writers" ON public.cards FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND public.can_write_vertical(b.vertical_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.boards b WHERE b.id = board_id AND public.can_write_vertical(b.vertical_id)));

CREATE POLICY "Card comments readable by vertical members" ON public.card_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.cards c JOIN public.boards b ON b.id = c.board_id WHERE c.id = card_id AND public.has_vertical_access(b.vertical_id)));
CREATE POLICY "Card comments manageable by vertical writers" ON public.card_comments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.cards c JOIN public.boards b ON b.id = c.board_id WHERE c.id = card_id AND public.can_write_vertical(b.vertical_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.cards c JOIN public.boards b ON b.id = c.board_id WHERE c.id = card_id AND public.can_write_vertical(b.vertical_id)));

CREATE POLICY "Tags readable by vertical members" ON public.tags FOR SELECT TO authenticated USING (vertical_id IS NULL OR public.has_vertical_access(vertical_id));
CREATE POLICY "Tags insertable by vertical writers" ON public.tags FOR ALL TO authenticated USING (vertical_id IS NULL OR public.can_write_vertical(vertical_id)) WITH CHECK (vertical_id IS NULL OR public.can_write_vertical(vertical_id));

CREATE POLICY "Audit logs only viewable by admins" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());

-- ====================================================================
-- SECTION 3: AUTOMATION & TRIGGERS
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'profiles', 'verticals', 'pipeline_stages', 'custom_field_definitions',
            'leads', 'customers', 'boards', 'board_columns', 'cards', 
            'card_comments', 'tasks'
        ])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_%I_updated_at ON public.%I;', t, t);
        EXECUTE format('CREATE TRIGGER tr_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();', t, t);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    first_user boolean;
    initial_role text;
BEGIN
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO first_user;
    IF first_user THEN
        initial_role := 'owner';
    ELSE
        initial_role := coalesce(NEW.raw_user_meta_data->>'role', 'member');
    END IF;

    INSERT INTO public.profiles (
        id, email, full_name, avatar_url, role, is_active, created_at, updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        initial_role,
        true,
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.auto_provision_vertical_defaults()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    new_board_id UUID;
BEGIN
    INSERT INTO public.pipeline_stages (vertical_id, name, position, color, is_won, is_lost)
    VALUES
        (NEW.id, 'New Lead', 1000, '#3b82f6', false, false),
        (NEW.id, 'Contacted', 2000, '#8b5cf6', false, false),
        (NEW.id, 'Qualified', 3000, '#eab308', false, false),
        (NEW.id, 'Proposal Sent', 4000, '#f97316', false, false),
        (NEW.id, 'Won', 5000, '#10b981', true, false),
        (NEW.id, 'Lost', 6000, '#ef4444', false, true);

    INSERT INTO public.boards (id, vertical_id, name, description, created_by)
    VALUES (gen_random_uuid(), NEW.id, 'Operations & Delivery', 'Default project and workflow board', NEW.created_by)
    RETURNING id INTO new_board_id;

    INSERT INTO public.board_columns (board_id, name, position, color)
    VALUES
        (new_board_id, 'Backlog', 1000, '#64748b'),
        (new_board_id, 'In Progress', 2000, '#3b82f6'),
        (new_board_id, 'In Review', 3000, '#f59e0b'),
        (new_board_id, 'Done', 4000, '#10b981');

    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO public.vertical_members (vertical_id, user_id, role_override)
        VALUES (NEW.id, NEW.created_by, 'manager')
        ON CONFLICT (vertical_id, user_id) DO NOTHING;
    END IF;

    INSERT INTO public.audit_logs (vertical_id, user_id, action, entity_type, entity_id, new_data)
    VALUES (
        NEW.id,
        NEW.created_by,
        'CREATE',
        'vertical',
        NEW.id,
        jsonb_build_object('name', NEW.name, 'slug', NEW.slug, 'color', NEW.color)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_vertical_auto_provision ON public.verticals;
CREATE TRIGGER tr_vertical_auto_provision AFTER INSERT ON public.verticals FOR EACH ROW EXECUTE FUNCTION public.auto_provision_vertical_defaults();

-- ====================================================================
-- SECTION 4: SEED VERTICALS & INITIAL DATA
-- ====================================================================

INSERT INTO public.verticals (id, name, slug, color, icon, description, status)
VALUES
    ('11111111-1111-4111-a111-111111111111', 'Mentorship', 'mentorship', '#6366f1', 'graduation-cap', '1-on-1 career, engineering, and leadership mentorship programs.', 'active'),
    ('22222222-2222-4222-a222-222222222222', 'C2C Marketplace', 'c2c', '#06b6d4', 'users', 'Consumer-to-consumer peer marketplace transactions and high-trust brokerage.', 'active'),
    ('33333333-3333-4333-a333-333333333333', 'SaaS Solutions', 'saas', '#3b82f6', 'cloud', 'B2B software subscriptions, multi-seat accounts, and enterprise integrations.', 'active'),
    ('44444444-4444-4444-a444-444444444444', 'Corporate Training', 'training', '#10b981', 'book-open', 'B2B enterprise upskilling bootcamps, workshops, and certified cohorts.', 'active')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description;
