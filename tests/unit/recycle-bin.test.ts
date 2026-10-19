import { describe, it, expect } from 'vitest';
import { Lead, Task, Card } from '@/types/custom.types';

describe('Phase 7: Recycle Bin & Data Recovery Logic', () => {
  const sampleLeads: Lead[] = [
    {
      id: 'lead-1',
      name: 'Active Lead Inc',
      company: null,
      email: null,
      phone: null,
      source: 'Website',
      owner_id: null,
      vertical_id: 'vert-1',
      stage_id: 'stg-1',
      estimated_value: 25000,
      position: 1000,
      tags: ['SaaS'],
      notes: null,
      custom_fields: {},
      created_by: 'usr-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      deleted_at: null,
      converted_to_customer_id: null,
    },
    {
      id: 'lead-2',
      name: 'Deleted Alpha Corp',
      company: 'Alpha Corp',
      email: 'contact@alphacorp.com',
      phone: null,
      source: 'Referral',
      owner_id: null,
      vertical_id: 'vert-1',
      stage_id: 'stg-2',
      estimated_value: 50000,
      position: 2000,
      tags: ['Enterprise'],
      notes: null,
      custom_fields: {},
      created_by: 'usr-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      deleted_at: '2026-02-15T12:00:00Z',
      converted_to_customer_id: null,
    },
    {
      id: 'lead-3',
      name: 'Deleted Beta Ltd',
      company: 'Beta Ltd',
      email: 'info@betaltd.co',
      phone: null,
      source: 'Outbound',
      owner_id: null,
      vertical_id: 'vert-2',
      stage_id: 'stg-3',
      estimated_value: 15000,
      position: 3000,
      tags: ['C2C'],
      notes: null,
      custom_fields: {},
      created_by: 'usr-2',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      deleted_at: '2026-02-16T15:30:00Z',
      converted_to_customer_id: null,
    },
  ];

  it('correctly separates active leads from soft-deleted leads in recycle bin', () => {
    const activeLeads = sampleLeads.filter((l) => !l.deleted_at);
    const deletedLeads = sampleLeads.filter((l) => Boolean(l.deleted_at));

    expect(activeLeads).toHaveLength(1);
    expect(activeLeads[0].name).toBe('Active Lead Inc');

    expect(deletedLeads).toHaveLength(2);
    expect(deletedLeads.map((l) => l.id)).toEqual(['lead-2', 'lead-3']);
  });

  it('calculates total value of deleted pipeline leads at risk', () => {
    const deletedLeads = sampleLeads.filter((l) => Boolean(l.deleted_at));
    const totalValue = deletedLeads.reduce((acc, l) => acc + (l.estimated_value || 0), 0);
    expect(totalValue).toBe(65000);
  });

  it('restores a soft-deleted lead by clearing deleted_at', () => {
    const leadToRestore = sampleLeads.find((l) => l.id === 'lead-2')!;
    const restoredLead: Lead = {
      ...leadToRestore,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    };

    expect(restoredLead.deleted_at).toBeNull();
    expect(restoredLead.name).toBe('Deleted Alpha Corp');
    expect(restoredLead.estimated_value).toBe(50000);
  });

  it('filters deleted records by vertical', () => {
    const deletedLeads = sampleLeads.filter((l) => Boolean(l.deleted_at));
    const vert1Deleted = deletedLeads.filter((l) => l.vertical_id === 'vert-1');
    const vert2Deleted = deletedLeads.filter((l) => l.vertical_id === 'vert-2');

    expect(vert1Deleted).toHaveLength(1);
    expect(vert1Deleted[0].name).toBe('Deleted Alpha Corp');
    expect(vert2Deleted).toHaveLength(1);
    expect(vert2Deleted[0].name).toBe('Deleted Beta Ltd');
  });

  it('fuzzy searches across deleted records by company, name, and email', () => {
    const deletedLeads = sampleLeads.filter((l) => Boolean(l.deleted_at));
    const searchAlpha = deletedLeads.filter(
      (l) =>
        l.name.toLowerCase().includes('alpha') ||
        (l.company && l.company.toLowerCase().includes('alpha')) ||
        (l.email && l.email.toLowerCase().includes('alpha'))
    );
    expect(searchAlpha).toHaveLength(1);
    expect(searchAlpha[0].id).toBe('lead-2');

    const searchEmail = deletedLeads.filter(
      (l) => l.email && l.email.toLowerCase().includes('betaltd.co')
    );
    expect(searchEmail).toHaveLength(1);
    expect(searchEmail[0].id).toBe('lead-3');
  });
});
