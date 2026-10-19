-- Row Level Security (RLS) Helper Functions and Policies
-- Version: 20261019000002

-- Enable RLS on every table
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

-- Security Helper Functions
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = true AND deleted_at IS NULL LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT coalesce(public.current_user_role() IN ('owner', 'admin'), false);
$$;

CREATE OR REPLACE FUNCTION public.has_vertical_access(target_vertical_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
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
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
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

-- 1. Profiles Policies
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (deleted_at IS NULL OR public.is_admin());

CREATE POLICY "Users can update own profile name and avatar"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() AND (
        -- Regular user cannot elevate their own role or active status
        (role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
        OR public.is_admin()
    )
);

CREATE POLICY "Admins have full access to profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 2. Verticals Policies
CREATE POLICY "Verticals viewable by vertical members or admins"
ON public.verticals FOR SELECT
TO authenticated
USING (
    (deleted_at IS NULL AND (status = 'active' OR public.is_admin()))
    AND public.has_vertical_access(id)
);

CREATE POLICY "Only admins can modify verticals"
ON public.verticals FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update verticals"
ON public.verticals FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete verticals"
ON public.verticals FOR DELETE
TO authenticated
USING (public.is_admin());

-- 3. Vertical Members Policies
CREATE POLICY "Vertical members viewable by assigned users or admins"
ON public.vertical_members FOR SELECT
TO authenticated
USING (public.has_vertical_access(vertical_id));

CREATE POLICY "Admins or managers can manage vertical membership"
ON public.vertical_members FOR ALL
TO authenticated
USING (
    public.is_admin() OR 
    (public.current_user_role() = 'manager' AND public.has_vertical_access(vertical_id))
)
WITH CHECK (
    public.is_admin() OR 
    (public.current_user_role() = 'manager' AND public.has_vertical_access(vertical_id))
);

-- 4. Pipeline Stages Policies
CREATE POLICY "Stages readable by vertical members"
ON public.pipeline_stages FOR SELECT
TO authenticated
USING (public.has_vertical_access(vertical_id));

CREATE POLICY "Stages manageable by managers and admins"
ON public.pipeline_stages FOR ALL
TO authenticated
USING (public.can_write_vertical(vertical_id))
WITH CHECK (public.can_write_vertical(vertical_id));

-- 5. Custom Field Definitions Policies
CREATE POLICY "Custom fields readable by vertical members"
ON public.custom_field_definitions FOR SELECT
TO authenticated
USING (public.has_vertical_access(vertical_id));

CREATE POLICY "Custom fields manageable by managers and admins"
ON public.custom_field_definitions FOR ALL
TO authenticated
USING (public.can_write_vertical(vertical_id))
WITH CHECK (public.can_write_vertical(vertical_id));

-- 6. Leads Policies
CREATE POLICY "Leads readable by vertical members"
ON public.leads FOR SELECT
TO authenticated
USING (
    public.has_vertical_access(vertical_id) AND (deleted_at IS NULL OR public.is_admin())
);

CREATE POLICY "Leads insertable by writers in vertical"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (public.can_write_vertical(vertical_id));

CREATE POLICY "Leads updatable by vertical writers"
ON public.leads FOR UPDATE
TO authenticated
USING (
    public.can_write_vertical(vertical_id) AND (
        public.is_admin() 
        OR public.current_user_role() IN ('owner', 'admin', 'manager')
        OR created_by = auth.uid() 
        OR owner_id = auth.uid()
    )
)
WITH CHECK (public.can_write_vertical(vertical_id));

CREATE POLICY "Leads soft-deletable by managers and admins"
ON public.leads FOR DELETE
TO authenticated
USING (
    public.is_admin() OR (
        public.current_user_role() = 'manager' AND public.has_vertical_access(vertical_id)
    )
);

-- 7. Customers & Customer Verticals Policies
CREATE POLICY "Customers readable by linked vertical members or admins"
ON public.customers FOR SELECT
TO authenticated
USING (
    public.is_admin() OR EXISTS (
        SELECT 1 FROM public.customer_verticals cv
        WHERE cv.customer_id = id AND public.has_vertical_access(cv.vertical_id)
    )
);

CREATE POLICY "Customers insertable by authenticated users"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Customers updatable by linked vertical members"
ON public.customers FOR UPDATE
TO authenticated
USING (
    public.is_admin() OR EXISTS (
        SELECT 1 FROM public.customer_verticals cv
        WHERE cv.customer_id = id AND public.can_write_vertical(cv.vertical_id)
    )
);

CREATE POLICY "Customer verticals readable by members"
ON public.customer_verticals FOR SELECT
TO authenticated
USING (public.has_vertical_access(vertical_id));

CREATE POLICY "Customer verticals manageable by vertical writers"
ON public.customer_verticals FOR ALL
TO authenticated
USING (public.can_write_vertical(vertical_id))
WITH CHECK (public.can_write_vertical(vertical_id));

-- 8. Activities Policies
CREATE POLICY "Activities viewable by entity vertical members"
ON public.activities FOR SELECT
TO authenticated
USING (vertical_id IS NULL OR public.has_vertical_access(vertical_id));

CREATE POLICY "Activities insertable by vertical writers"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (vertical_id IS NULL OR public.can_write_vertical(vertical_id));

-- 9. Tasks Policies
CREATE POLICY "Tasks readable by assigned user or vertical members"
ON public.tasks FOR SELECT
TO authenticated
USING (
    assignee_id = auth.uid() 
    OR created_by = auth.uid() 
    OR public.has_vertical_access(vertical_id)
);

CREATE POLICY "Tasks insertable by authenticated users"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (vertical_id IS NULL OR public.can_write_vertical(vertical_id));

CREATE POLICY "Tasks updatable by assignee, creator, or managers"
ON public.tasks FOR UPDATE
TO authenticated
USING (
    assignee_id = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin()
    OR (public.current_user_role() = 'manager' AND public.has_vertical_access(vertical_id))
);

CREATE POLICY "Tasks deletable by creator, manager, or admin"
ON public.tasks FOR DELETE
TO authenticated
USING (
    created_by = auth.uid()
    OR public.is_admin()
    OR (public.current_user_role() = 'manager' AND public.has_vertical_access(vertical_id))
);

-- 10. Boards, Columns, Cards Policies
CREATE POLICY "Boards readable by vertical members"
ON public.boards FOR SELECT
TO authenticated
USING (public.has_vertical_access(vertical_id));

CREATE POLICY "Boards manageable by vertical writers"
ON public.boards FOR ALL
TO authenticated
USING (public.can_write_vertical(vertical_id))
WITH CHECK (public.can_write_vertical(vertical_id));

CREATE POLICY "Board columns readable by board vertical members"
ON public.board_columns FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.boards b 
        WHERE b.id = board_id AND public.has_vertical_access(b.vertical_id)
    )
);

CREATE POLICY "Board columns manageable by vertical writers"
ON public.board_columns FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.boards b 
        WHERE b.id = board_id AND public.can_write_vertical(b.vertical_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.boards b 
        WHERE b.id = board_id AND public.can_write_vertical(b.vertical_id)
    )
);

CREATE POLICY "Cards readable by vertical members"
ON public.cards FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.boards b 
        WHERE b.id = board_id AND public.has_vertical_access(b.vertical_id)
    )
);

CREATE POLICY "Cards manageable by vertical writers"
ON public.cards FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.boards b 
        WHERE b.id = board_id AND public.can_write_vertical(b.vertical_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.boards b 
        WHERE b.id = board_id AND public.can_write_vertical(b.vertical_id)
    )
);

CREATE POLICY "Card comments readable by vertical members"
ON public.card_comments FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cards c
        JOIN public.boards b ON b.id = c.board_id
        WHERE c.id = card_id AND public.has_vertical_access(b.vertical_id)
    )
);

CREATE POLICY "Card comments manageable by vertical writers"
ON public.card_comments FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cards c
        JOIN public.boards b ON b.id = c.board_id
        WHERE c.id = card_id AND public.can_write_vertical(b.vertical_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.cards c
        JOIN public.boards b ON b.id = c.board_id
        WHERE c.id = card_id AND public.can_write_vertical(b.vertical_id)
    )
);

-- 11. Tags Policies
CREATE POLICY "Tags readable by vertical members"
ON public.tags FOR SELECT
TO authenticated
USING (vertical_id IS NULL OR public.has_vertical_access(vertical_id));

CREATE POLICY "Tags insertable by vertical writers"
ON public.tags FOR ALL
TO authenticated
USING (vertical_id IS NULL OR public.can_write_vertical(vertical_id))
WITH CHECK (vertical_id IS NULL OR public.can_write_vertical(vertical_id));

-- 12. Audit Logs Policies (Read-only for Admins, no direct insert/update/delete)
CREATE POLICY "Audit logs only viewable by admins"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_admin());
