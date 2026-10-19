-- Seed Initial Verticals and Custom Field Definitions
-- Version: 20261019000004

-- Seed 4 Initial Company Verticals (Mentorship, C2C, SaaS, Training)
INSERT INTO public.verticals (id, name, slug, color, icon, description, status)
VALUES
    (
        '11111111-1111-4111-a111-111111111111',
        'Mentorship',
        'mentorship',
        '#6366f1',
        'graduation-cap',
        '1-on-1 career, engineering, and leadership mentorship programs.',
        'active'
    ),
    (
        '22222222-2222-4222-a222-222222222222',
        'C2C Marketplace',
        'c2c',
        '#06b6d4',
        'users',
        'Consumer-to-consumer peer marketplace transactions and high-trust brokerage.',
        'active'
    ),
    (
        '33333333-3333-4333-a333-333333333333',
        'SaaS Solutions',
        'saas',
        '#3b82f6',
        'cloud',
        'B2B software subscriptions, multi-seat accounts, and enterprise integrations.',
        'active'
    ),
    (
        '44444444-4444-4444-a444-444444444444',
        'Corporate Training',
        'training',
        '#10b981',
        'book-open',
        'B2B enterprise upskilling bootcamps, workshops, and certified cohorts.',
        'active'
    )
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description;

-- Seed Vertical-Specific Custom Field Definitions (Stored dynamically as JSONB)
-- 1. Mentorship Custom Fields
INSERT INTO public.custom_field_definitions (vertical_id, entity_type, name, key, field_type, options, is_required, position)
VALUES
    (
        '11111111-1111-4111-a111-111111111111',
        'lead',
        'Target Track',
        'mentorship_track',
        'select',
        '["Career Switch", "Executive Coaching", "System Design", "Full-Stack Web"]'::jsonb,
        true,
        1
    ),
    (
        '11111111-1111-4111-a111-111111111111',
        'lead',
        'Target Completion Date',
        'target_date',
        'date',
        '[]'::jsonb,
        false,
        2
    ),
    (
        '11111111-1111-4111-a111-111111111111',
        'customer',
        'Assigned Senior Mentor',
        'assigned_mentor',
        'text',
        '[]'::jsonb,
        false,
        1
    )
ON CONFLICT (vertical_id, entity_type, key) DO NOTHING;

-- 2. C2C Custom Fields
INSERT INTO public.custom_field_definitions (vertical_id, entity_type, name, key, field_type, options, is_required, position)
VALUES
    (
        '22222222-2222-4222-a222-222222222222',
        'lead',
        'Marketplace Category',
        'marketplace_category',
        'select',
        '["Electronics", "Vehicles", "Home Goods", "High-Value Collectibles"]'::jsonb,
        true,
        1
    ),
    (
        '22222222-2222-4222-a222-222222222222',
        'customer',
        'Seller Trust Level',
        'trust_level',
        'select',
        '["Unverified", "ID Verified", "Top Rated Seller", "VIP Broker"]'::jsonb,
        false,
        1
    )
ON CONFLICT (vertical_id, entity_type, key) DO NOTHING;

-- 3. SaaS Custom Fields
INSERT INTO public.custom_field_definitions (vertical_id, entity_type, name, key, field_type, options, is_required, position)
VALUES
    (
        '33333333-3333-4333-a333-333333333333',
        'lead',
        'Target Tier',
        'subscription_tier',
        'select',
        '["Starter", "Professional ($99/mo)", "Enterprise Custom"]'::jsonb,
        true,
        1
    ),
    (
        '33333333-3333-4333-a333-333333333333',
        'customer',
        'Monthly Recurring Revenue ($)',
        'monthly_mrr',
        'number',
        '[]'::jsonb,
        false,
        1
    ),
    (
        '33333333-3333-4333-a333-333333333333',
        'customer',
        'Licensed Seat Count',
        'seat_count',
        'number',
        '[]'::jsonb,
        false,
        2
    )
ON CONFLICT (vertical_id, entity_type, key) DO NOTHING;

-- 4. Training Custom Fields
INSERT INTO public.custom_field_definitions (vertical_id, entity_type, name, key, field_type, options, is_required, position)
VALUES
    (
        '44444444-4444-4444-a444-444444444444',
        'lead',
        'Target Cohort Batch',
        'cohort_batch',
        'text',
        '[]'::jsonb,
        true,
        1
    ),
    (
        '44444444-4444-4444-a444-444444444444',
        'customer',
        'Certification Track',
        'certification_track',
        'select',
        '["Cloud Solutions Architect", "DevOps & SRE", "Full-Stack TypeScript"]'::jsonb,
        false,
        1
    )
ON CONFLICT (vertical_id, entity_type, key) DO NOTHING;
