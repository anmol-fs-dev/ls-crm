import { NextResponse } from 'next/server';
import { supabaseRest } from '@/lib/supabase/rest';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limiter';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Mock to UUID mapping for backwards compatibility
const VERTICAL_MAP: Record<string, string> = {
  'vert-1': '11111111-1111-4111-a111-111111111111',
  'vert-2': '22222222-2222-4222-a222-222222222222',
  'vert-3': '33333333-3333-4333-a333-333333333333',
  'vert-4': '44444444-4444-4444-a444-444444444444',
};

const STAGE_MAP: Record<string, string> = {
  // Mentorship
  'stg-1': '173d122f-6fee-4255-a602-daa1d9acb630',
  'stg-2': '75a4f934-497c-4482-af81-03ead98bceb2',
  'stg-3': '5ff9c71b-f2b0-4ada-9083-d6e8b45c99b9',
  'stg-4': '60923b5f-6dca-49c2-9237-a76e110a1d9a',
  'stg-5': '82b58318-97c7-477c-ad4f-fb7de67b9dc8',
  // C2C
  'stg-6': '78ea98c2-d3cc-44f0-9490-38b46f7bcf4b',
  'stg-7': '7e7bf3c8-c41e-46c5-9519-2d618d8b70ca',
  'stg-8': '22312118-35da-4f64-bb8f-17e86d0ba330',
  'stg-9': 'e37daf19-5312-40bd-8f58-81f424637b52',
  // SaaS
  'stg-10': '3e067a1e-0b08-463b-9ed0-f1e8f684397e',
  'stg-11': '68c5e13c-2265-433c-86c7-d5ebe3524937',
  'stg-12': '2b7bfa5a-6df4-4fed-9556-e6d34c4abe3f',
  'stg-13': '96bead00-519c-450d-aedd-52d1102605a7',
  'stg-14': '746923aa-4c83-454c-a7a4-ed7d729118cb',
  'stg-15': 'b7fdef53-c279-4bcf-b2bf-a53399bbc85e',
  // Training
  'stg-16': 'fce6b5d1-b634-4c1c-9b09-29775484fced',
  'stg-17': '9d61ef5f-2b56-454d-b63a-304999850efe',
  'stg-18': 'a3ad0f6c-4f27-40eb-9ae4-264151de9fb6',
};

function sanitizeRecord(data: Record<string, any>) {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data };

  // ID check
  if (sanitized.id && !UUID_REGEX.test(sanitized.id)) {
    sanitized.id = crypto.randomUUID();
  }

  // Vertical mapping
  if (sanitized.vertical_id && VERTICAL_MAP[sanitized.vertical_id]) {
    sanitized.vertical_id = VERTICAL_MAP[sanitized.vertical_id];
  } else if (sanitized.vertical_id && !UUID_REGEX.test(sanitized.vertical_id)) {
    sanitized.vertical_id = '33333333-3333-4333-a333-333333333333';
  }

  // Stage mapping
  if (sanitized.stage_id && STAGE_MAP[sanitized.stage_id]) {
    sanitized.stage_id = STAGE_MAP[sanitized.stage_id];
  } else if (sanitized.stage_id && !UUID_REGEX.test(sanitized.stage_id)) {
    // Default fallback stage (SaaS New Lead)
    sanitized.stage_id = '3e067a1e-0b08-463b-9ed0-f1e8f684397e';
  }

  // Profile nullable foreign keys
  const profileFkFields = ['owner_id', 'created_by', 'assignee_id'];
  for (const f of profileFkFields) {
    if (f in sanitized) {
      if (!sanitized[f] || typeof sanitized[f] !== 'string' || !UUID_REGEX.test(sanitized[f])) {
        sanitized[f] = null;
      }
    }
  }

  // Entity nullable foreign keys
  const entityFkFields = [
    'lead_id',
    'customer_id',
    'project_id',
    'converted_to_customer_id',
    'converted_from_lead_id',
  ];
  for (const f of entityFkFields) {
    if (f in sanitized) {
      if (!sanitized[f] || typeof sanitized[f] !== 'string' || !UUID_REGEX.test(sanitized[f])) {
        sanitized[f] = null;
      }
    }
  }

  // Tags array check
  if ('tags' in sanitized && !Array.isArray(sanitized.tags)) {
    sanitized.tags = [];
  }

  return sanitized;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');

    if (table) {
      if (table === 'profiles') {
        const data = await supabaseRest('profiles?select=*&deleted_at=is.null&order=created_at.asc');
        return NextResponse.json({ success: true, data });
      }
      const data = await supabaseRest(`${table}?select=*&order=created_at.desc`);
      return NextResponse.json({ success: true, data });
    }

    // Default: fetch all core CRM datasets in parallel
    const [
      verticals,
      stages,
      leads,
      customers,
      customerVerticals,
      tasks,
      activities,
      boards,
      boardColumns,
      cards,
      cardComments,
      auditLogs,
      deletedLeads,
      deletedCustomers,
      deletedTasks,
      deletedCards,
    ] = await Promise.all([
      supabaseRest('verticals?select=*&order=created_at.asc').catch(() => []),
      supabaseRest('pipeline_stages?select=*&order=position.asc').catch(() => []),
      supabaseRest('leads?select=*&deleted_at=is.null&order=position.asc').catch(() => []),
      supabaseRest('customers?select=*&deleted_at=is.null&order=created_at.desc').catch(() => []),
      supabaseRest('customer_verticals?select=*').catch(() => []),
      supabaseRest('tasks?select=*&deleted_at=is.null&order=created_at.desc').catch(() => []),
      supabaseRest('activities?select=*&order=created_at.desc&limit=100').catch(() => []),
      supabaseRest('boards?select=*&deleted_at=is.null&order=created_at.asc').catch(() => []),
      supabaseRest('board_columns?select=*&order=position.asc').catch(() => []),
      supabaseRest('cards?select=*&deleted_at=is.null&order=position.asc').catch(() => []),
      supabaseRest('card_comments?select=*&order=created_at.asc').catch(() => []),
      supabaseRest('audit_logs?select=*&order=created_at.desc&limit=100').catch(() => []),
      supabaseRest('leads?select=*&deleted_at=not.is.null&order=deleted_at.desc').catch(() => []),
      supabaseRest('customers?select=*&deleted_at=not.is.null&order=deleted_at.desc').catch(() => []),
      supabaseRest('tasks?select=*&deleted_at=not.is.null&order=deleted_at.desc').catch(() => []),
      supabaseRest('cards?select=*&deleted_at=not.is.null&order=deleted_at.desc').catch(() => []),
    ]);

    return NextResponse.json({
      success: true,
      verticals,
      stages,
      leads,
      customers,
      customerVerticals,
      tasks,
      activities,
      boards,
      boardColumns,
      cards,
      cardComments,
      auditLogs,
      deletedLeads,
      deletedCustomers,
      deletedTasks,
      deletedCards,
    });
  } catch (error: any) {
    console.error('API /api/crm GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Database fetch error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Phase 7: Sliding window rate limiting on write endpoints
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const rateLimit = checkRateLimit(`crm_api_write_${ip}`, 120, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Too many write operations; please wait before retrying.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { table, action, data, id } = body;

    // Seed mock data into Supabase if empty
    if (action === 'seed') {
      const existingLeads = await supabaseRest('leads?select=id').catch(() => []);
      if (!Array.isArray(existingLeads) || existingLeads.length <= 1) {
        // Seed 4 realistic leads
        const demoLeads = [
          {
            id: '2f340a97-66f8-4c98-a0cc-bdc1f0699435',
            name: 'Acme Health Systems',
            email: 'procurement@acmehealth.org',
            phone: '+1 (555) 234-5678',
            company: 'Acme Health Systems',
            source: 'Website Demo',
            vertical_id: '33333333-3333-4333-a333-333333333333',
            stage_id: '68c5e13c-2265-433c-86c7-d5ebe3524937', // Contacted
            estimated_value: 36000,
            position: 1000,
            tags: ['Healthcare', 'Enterprise', 'HIPAA'],
            notes: 'Requires SSO and 50 seats minimum. Security team asked for SOC2 Type II.',
            custom_fields: { subscription_tier: 'Enterprise Custom' },
          },
          {
            id: '9b7f5194-4d43-441d-b633-9133e5066dc1',
            name: 'David Kim',
            email: 'david.kim@techcorp.io',
            phone: '+1 (555) 876-5432',
            company: 'TechCorp',
            source: 'Referral',
            vertical_id: '11111111-1111-4111-a111-111111111111',
            stage_id: '75a4f934-497c-4482-af81-03ead98bceb2', // Contacted
            estimated_value: 4500,
            position: 1000,
            tags: ['Staff Engineer', 'Career Growth'],
            notes: 'Aiming for Principal promotion in Q3. Wants mentor with FAANG distributed systems background.',
            custom_fields: { mentorship_track: 'Executive Coaching' },
          },
          {
            id: '7188f2bf-6f5b-4395-8162-d2787e6fa5ea',
            name: 'FinBank Global',
            email: 'learning@finbank.com',
            phone: '+1 (555) 432-1098',
            company: 'FinBank Global',
            source: 'Outbound',
            vertical_id: '44444444-4444-4444-a444-444444444444',
            stage_id: '9d61ef5f-2b56-454d-b63a-304999850efe', // Contacted
            estimated_value: 85000,
            position: 1000,
            tags: ['Financial Services', 'Upskilling'],
            notes: 'Training cohort of 40 junior developers on React and cloud architecture.',
            custom_fields: {},
          },
          {
            id: 'a8043640-7e37-4d64-946f-d316fb008e34',
            name: 'Sophia Patel',
            email: 'sophia@luxecollective.com',
            phone: '+1 (555) 345-6789',
            company: 'Luxe Collective',
            source: 'Organic Search',
            vertical_id: '22222222-2222-4222-a222-222222222222',
            stage_id: '7e7bf3c8-c41e-46c5-9519-2d618d8b70ca', // Contacted
            estimated_value: 12000,
            position: 1000,
            tags: ['High Value', 'Verified Seller'],
            notes: 'Consignment inventory value over $200k. Needs bespoke escrow terms.',
            custom_fields: {},
          },
        ];

        for (const l of demoLeads) {
          await supabaseRest('leads', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify(l),
          }).catch((err) => console.warn('Lead seed warning:', err));
        }

        // Seed demo customer
        const demoCustomer = {
          id: '55555555-5555-4555-a555-555555555555',
          name: 'OmniGlobal Dynamics',
          type: 'company',
          email: 'admin@omniglobal.com',
          phone: '+1 (555) 999-0000',
          company: 'OmniGlobal Dynamics',
          lifecycle_status: 'active',
          tags: ['Multi-Vertical', 'VIP', 'Enterprise'],
          notes: 'Customer across SaaS and Corporate Training verticals.',
          custom_fields: {},
        };

        await supabaseRest('customers', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(demoCustomer),
        }).catch((err) => console.warn('Customer seed warning:', err));

        // Seed customer vertical links
        const custVerts = [
          {
            customer_id: '55555555-5555-4555-a555-555555555555',
            vertical_id: '33333333-3333-4333-a333-333333333333',
            status: 'active',
          },
          {
            customer_id: '55555555-5555-4555-a555-555555555555',
            vertical_id: '44444444-4444-4444-a444-444444444444',
            status: 'active',
          },
        ];

        for (const cv of custVerts) {
          await supabaseRest('customer_verticals', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify(cv),
          }).catch(() => null);
        }
      }

      // Check and seed demo cards if cards table is empty
      const existingCards = await supabaseRest('cards?select=id').catch(() => []);
      if (!Array.isArray(existingCards) || existingCards.length === 0) {
        // Seed demo cards on SaaS Operations Board
        const demoCards = [
          {
            id: 'c1111111-1111-4111-a111-111111111111',
            board_id: '2c80c2fd-d4ca-4394-a634-e1d80bbc0ca5',
            column_id: '49fcd982-7735-4f32-a19c-1c87c87ec3a5', // In Progress
            title: 'Configure SAML SSO for Nexus Dynamics',
            description: 'Setup Okta metadata, configure ACS URL, and verify employee claims mapping for multi-seat rollout.',
            position: 1000,
            priority: 'high',
            due_date: '2026-10-24T17:00:00Z',
            labels: ['SSO', 'Enterprise', 'Security'],
            checklist: [
              { id: 'chk-1', title: 'Export IdP metadata XML', is_completed: true },
              { id: 'chk-2', title: 'Verify email & role claims', is_completed: true },
              { id: 'chk-3', title: 'Complete test login with procurement lead', is_completed: false },
            ],
            assignee_ids: [],
            lead_id: null,
            customer_id: '55555555-5555-4555-a555-555555555555',
          },
          {
            id: 'c2222222-2222-4222-a222-222222222222',
            board_id: '2c80c2fd-d4ca-4394-a634-e1d80bbc0ca5',
            column_id: 'c755a791-b32b-4d32-b245-93cd9e64f77b', // Backlog
            title: 'Automate weekly MRR email digest',
            description: 'Generate weekly executive summary with net new ARR, churn rates, and pipeline health metrics.',
            position: 1000,
            priority: 'medium',
            due_date: '2026-10-28T17:00:00Z',
            labels: ['Automation', 'Reporting', 'Leadership'],
            checklist: [
              { id: 'chk-1', title: 'Draft SQL query for MRR waterfall', is_completed: true },
              { id: 'chk-2', title: 'Implement Resend email template', is_completed: false },
            ],
            assignee_ids: [],
            lead_id: null,
            customer_id: null,
          },
          {
            id: 'c3333333-3333-4333-a333-333333333333',
            board_id: '2c80c2fd-d4ca-4394-a634-e1d80bbc0ca5',
            column_id: '08520c62-9e29-4d22-a4dd-be8d7d007e96', // In Review
            title: 'Enterprise HIPAA compliance audit sign-off',
            description: 'Security and compliance review for Acme Health Systems enterprise tier agreement.',
            position: 1000,
            priority: 'urgent',
            due_date: '2026-10-20T18:00:00Z',
            labels: ['Compliance', 'HIPAA', 'Healthcare'],
            checklist: [
              { id: 'chk-1', title: 'Sign BAA agreement', is_completed: true },
              { id: 'chk-2', title: 'Provide SOC2 Type II report', is_completed: true },
              { id: 'chk-3', title: 'Legal counsel sign-off', is_completed: false },
            ],
            assignee_ids: [],
            lead_id: '2f340a97-66f8-4c98-a0cc-bdc1f0699435', // Acme Health Systems
            customer_id: null,
          },
          {
            id: 'c4444444-4444-4444-a444-444444444444',
            board_id: '2c80c2fd-d4ca-4394-a634-e1d80bbc0ca5',
            column_id: 'a32a0f03-2501-4527-980c-a4e655d09073', // Done
            title: 'Upgrade Redis cache to AWS ElastiCache cluster',
            description: 'Successfully migrated session caching and rate limiter store to clustered Redis 7.',
            position: 1000,
            priority: 'low',
            due_date: '2026-10-14T12:00:00Z',
            labels: ['Infrastructure', 'DevOps'],
            checklist: [
              { id: 'chk-1', title: 'Provision subnet groups', is_completed: true },
              { id: 'chk-2', title: 'Switch environment variables', is_completed: true },
            ],
            assignee_ids: [],
            lead_id: null,
            customer_id: null,
          },
        ];

        for (const card of demoCards) {
          await supabaseRest('cards', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates' },
            body: JSON.stringify(card),
          }).catch((err) => console.warn('Card seed warning:', err));
        }

        // Seed demo comments
        const demoComments = [
          {
            card_id: 'c1111111-1111-4111-a111-111111111111',
            content: 'Received metadata file from customer IT director. ACS URL mapped cleanly.',
          },
          {
            card_id: 'c3333333-3333-4333-a333-333333333333',
            content: 'SOC2 Type II report delivered to Acme compliance desk. Awaiting legal response.',
          },
        ];

        for (const comment of demoComments) {
          await supabaseRest('card_comments', {
            method: 'POST',
            body: JSON.stringify(comment),
          }).catch(() => null);
        }
      }

      return NextResponse.json({ success: true, message: 'Seeded demo data successfully' });
    }

    // Reset demo team
    if (action === 'reset_team') {
      await supabaseRest('profiles?deleted_at=not.is.null', {
        method: 'PATCH',
        body: JSON.stringify({ deleted_at: null, is_active: true, updated_at: new Date().toISOString() }),
      }).catch(() => null);
      return NextResponse.json({ success: true, message: 'Team reset to active status' });
    }

    // User Creation via Supabase Auth Admin
    if (action === 'create_user' || (table === 'profiles' && action === 'insert')) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      const userEmail = data.email?.trim().toLowerCase();
      const userName = data.full_name?.trim() || userEmail;
      const userRole = data.role || 'member';

      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          apikey: serviceKey!,
          Authorization: `Bearer ${serviceKey!}`,
          'Content-Type': 'application/json',
          'User-Agent': 'SupabaseAdmin/1.0',
        },
        body: JSON.stringify({
          email: userEmail,
          password: data.password || 'password123',
          email_confirm: true,
          user_metadata: {
            full_name: userName,
            role: userRole,
          },
        }),
      });

      if (!authRes.ok) {
        const errJson = await authRes.json().catch(() => null);
        return NextResponse.json(
          { success: false, error: errJson?.message || 'Failed to create user in auth database' },
          { status: 400 }
        );
      }

      const authUser = await authRes.json();
      // Ensure profile role is explicitly updated
      await supabaseRest(`profiles?id=eq.${authUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: userRole, full_name: userName }),
      }).catch(() => null);

      const createdProfile = await supabaseRest(`profiles?id=eq.${authUser.id}`).catch(() => []);
      const profile = Array.isArray(createdProfile) && createdProfile.length > 0 ? createdProfile[0] : {
        id: authUser.id,
        email: userEmail,
        full_name: userName,
        role: userRole,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      return NextResponse.json({ success: true, data: profile });
    }

    // User Removal via Supabase
    if ((table === 'profiles' || action === 'delete_user') && action === 'delete' && id) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      // Soft delete in profiles
      await supabaseRest(`profiles?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ deleted_at: new Date().toISOString(), is_active: false }),
      }).catch(() => null);

      // Remove from auth admin
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceKey!,
          Authorization: `Bearer ${serviceKey!}`,
          'User-Agent': 'SupabaseAdmin/1.0',
        },
      }).catch(() => null);

      return NextResponse.json({ success: true, id });
    }

    if (!table) {
      return NextResponse.json({ success: false, error: 'Table name required' }, { status: 400 });
    }

    const sanitizedData = data ? sanitizeRecord(data) : undefined;

    // Insert
    if (action === 'insert') {
      const inserted = await supabaseRest(table, {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(sanitizedData),
      });
      return NextResponse.json({ success: true, data: Array.isArray(inserted) ? inserted[0] : inserted });
    }

    // Update
    if (action === 'update' && id) {
      const updated = await supabaseRest(`${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(sanitizedData),
      });
      return NextResponse.json({ success: true, data: Array.isArray(updated) ? updated[0] : updated });
    }

    // Soft delete
    if (action === 'delete' && id) {
      await supabaseRest(`${table}?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ deleted_at: new Date().toISOString() }),
      });
      // Audit log
      await supabaseRest('audit_logs', {
        method: 'POST',
        body: JSON.stringify({
          action: 'DELETE',
          entity_type: table.replace(/s$/, ''),
          entity_id: id,
          old_data: { active: true },
          new_data: { deleted_at: new Date().toISOString(), status: 'moved_to_recycle_bin' },
          ip_address: '127.0.0.1',
          user_agent: 'Antigravity CRM Admin Console',
        }),
      }).catch(() => null);
      return NextResponse.json({ success: true, id });
    }

    // Restore from soft-delete
    if (action === 'restore' && id) {
      const restored = await supabaseRest(`${table}?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ deleted_at: null, updated_at: new Date().toISOString() }),
      });
      // Audit log
      await supabaseRest('audit_logs', {
        method: 'POST',
        body: JSON.stringify({
          action: 'UPDATE',
          entity_type: table.replace(/s$/, ''),
          entity_id: id,
          old_data: { deleted_at: 'soft_deleted' },
          new_data: { deleted_at: null, status: 'restored' },
          ip_address: '127.0.0.1',
          user_agent: 'Antigravity CRM Admin Console',
        }),
      }).catch(() => null);
      return NextResponse.json({ success: true, data: Array.isArray(restored) ? restored[0] : restored });
    }

    // Permanent Purge (Hard Delete)
    if (action === 'purge' && id) {
      await supabaseRest(`${table}?id=eq.${id}`, {
        method: 'DELETE',
      });
      // Audit log
      await supabaseRest('audit_logs', {
        method: 'POST',
        body: JSON.stringify({
          action: 'DELETE',
          entity_type: table.replace(/s$/, ''),
          entity_id: id,
          old_data: { deleted_at: 'soft_deleted' },
          new_data: { status: 'purged_permanently' },
          ip_address: '127.0.0.1',
          user_agent: 'Antigravity CRM Admin Console',
        }),
      }).catch(() => null);
      return NextResponse.json({ success: true, id, status: 'purged' });
    }

    // Restore All soft-deleted in table
    if (action === 'restore_all') {
      await supabaseRest(`${table}?deleted_at=not.is.null`, {
        method: 'PATCH',
        body: JSON.stringify({ deleted_at: null, updated_at: new Date().toISOString() }),
      });
      return NextResponse.json({ success: true, message: `All soft-deleted ${table} restored` });
    }

    // Purge All soft-deleted in table
    if (action === 'purge_all') {
      await supabaseRest(`${table}?deleted_at=not.is.null`, {
        method: 'DELETE',
      });
      return NextResponse.json({ success: true, message: `All soft-deleted ${table} purged` });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API /api/crm POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Database write error' },
      { status: 500 }
    );
  }
}

