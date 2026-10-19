-- Triggers, Automation and Audit Migration
-- Version: 20261019000003

-- 1. Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
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

-- 2. Auth user creation trigger -> Sync with public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    first_user boolean;
    initial_role text;
BEGIN
    -- Check if this is the first user registered in the system
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO first_user;
    IF first_user THEN
        initial_role := 'owner';
    ELSE
        initial_role := coalesce(NEW.raw_user_meta_data->>'role', 'member');
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        avatar_url,
        role,
        is_active,
        created_at,
        updated_at
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
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Automatic Vertical Stage & Project Board Provisioning
CREATE OR REPLACE FUNCTION public.auto_provision_vertical_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_board_id UUID;
BEGIN
    -- 1. Create Default Pipeline Stages
    INSERT INTO public.pipeline_stages (vertical_id, name, position, color, is_won, is_lost)
    VALUES
        (NEW.id, 'New Lead', 1000, '#3b82f6', false, false),
        (NEW.id, 'Contacted', 2000, '#8b5cf6', false, false),
        (NEW.id, 'Qualified', 3000, '#eab308', false, false),
        (NEW.id, 'Proposal Sent', 4000, '#f97316', false, false),
        (NEW.id, 'Won', 5000, '#10b981', true, false),
        (NEW.id, 'Lost', 6000, '#ef4444', false, true);

    -- 2. Create Default Operations Kanban Board
    INSERT INTO public.boards (id, vertical_id, name, description, created_by)
    VALUES (gen_random_uuid(), NEW.id, 'Operations & Delivery', 'Default project and workflow board', NEW.created_by)
    RETURNING id INTO new_board_id;

    -- 3. Create Default Board Columns
    INSERT INTO public.board_columns (board_id, name, position, color)
    VALUES
        (new_board_id, 'Backlog', 1000, '#64748b'),
        (new_board_id, 'In Progress', 2000, '#3b82f6'),
        (new_board_id, 'In Review', 3000, '#f59e0b'),
        (new_board_id, 'Done', 4000, '#10b981');

    -- 4. If created_by is specified, automatically grant membership
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO public.vertical_members (vertical_id, user_id, role_override)
        VALUES (NEW.id, NEW.created_by, 'manager')
        ON CONFLICT (vertical_id, user_id) DO NOTHING;
    END IF;

    -- 5. Record Audit Log for vertical creation
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
CREATE TRIGGER tr_vertical_auto_provision
    AFTER INSERT ON public.verticals
    FOR EACH ROW EXECUTE FUNCTION public.auto_provision_vertical_defaults();

-- 4. Audit Log Helper Procedure
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_vertical_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_old_data JSONB DEFAULT NULL,
    p_new_data JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_logs (
        vertical_id,
        user_id,
        action,
        entity_type,
        entity_id,
        old_data,
        new_data
    ) VALUES (
        p_vertical_id,
        auth.uid(),
        p_action,
        p_entity_type,
        p_entity_id,
        p_old_data,
        p_new_data
    );
END;
$$;
