import { describe, it, expect } from 'vitest';
import { Card, Board, BoardColumn, CardChecklistItem } from '@/types/custom.types';

describe('Project Planner Kanban Logic', () => {
  // Test Fractional Indexing calculation
  describe('Fractional Positioning', () => {
    it('calculates position when inserting at the top of a column', () => {
      const topCardPosition = 1000;
      const newPos = Math.max(10, topCardPosition / 2);
      expect(newPos).toBe(500);
    });

    it('calculates position when appending to the bottom of a column', () => {
      const bottomCardPosition = 3000;
      const newPos = bottomCardPosition + 1000;
      expect(newPos).toBe(4000);
    });

    it('calculates fractional position between two adjacent cards', () => {
      const prevPosition = 1000;
      const nextPosition = 2000;
      const newPos = (prevPosition + nextPosition) / 2;
      expect(newPos).toBe(1500);
    });

    it('handles multiple reorders without collisions using floating point', () => {
      const pos1 = 1000;
      const pos2 = 1500;
      const mid1 = (pos1 + pos2) / 2; // 1250
      const mid2 = (pos1 + mid1) / 2; // 1125
      expect(mid1).toBe(1250);
      expect(mid2).toBe(1125);
      expect(mid2).toBeGreaterThan(pos1);
      expect(mid2).toBeLessThan(mid1);
    });
  });

  // Test Checklist Progress Calculation
  describe('Checklist Completion Metrics', () => {
    it('returns 0% for empty checklist', () => {
      const items: CardChecklistItem[] = [];
      const total = items.length;
      const completed = items.filter((i) => i.is_completed).length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      expect(percent).toBe(0);
    });

    it('calculates exact progress percentage for checklist', () => {
      const items: CardChecklistItem[] = [
        { id: '1', title: 'Task 1', is_completed: true },
        { id: '2', title: 'Task 2', is_completed: false },
        { id: '3', title: 'Task 3', is_completed: true },
        { id: '4', title: 'Task 4', is_completed: false },
      ];
      const total = items.length;
      const completed = items.filter((i) => i.is_completed).length;
      const percent = Math.round((completed / total) * 100);
      expect(percent).toBe(50);
    });
  });

  // Test Vertical Scoping
  describe('Board Vertical Scoping', () => {
    const mockBoards: Board[] = [
      { id: 'b-1', vertical_id: 'vert-saas', name: 'SaaS Board', description: null, created_by: null, created_at: '', updated_at: '', deleted_at: null },
      { id: 'b-2', vertical_id: 'vert-c2c', name: 'C2C Board', description: null, created_by: null, created_at: '', updated_at: '', deleted_at: null },
      { id: 'b-3', vertical_id: 'vert-saas', name: 'SaaS Onboarding', description: null, created_by: null, created_at: '', updated_at: '', deleted_at: null },
      { id: 'b-4', vertical_id: 'vert-c2c', name: 'Archived Board', description: null, created_by: null, created_at: '', updated_at: '', deleted_at: '2026-10-10' },
    ];

    it('filters active boards strictly for selected vertical', () => {
      const saasBoards = mockBoards.filter((b) => !b.deleted_at && b.vertical_id === 'vert-saas');
      expect(saasBoards).toHaveLength(2);
      expect(saasBoards.map((b) => b.id)).toEqual(['b-1', 'b-3']);
    });

    it('returns all non-deleted boards when selectedVerticalId is all', () => {
      const allActive = mockBoards.filter((b) => !b.deleted_at);
      expect(allActive).toHaveLength(3);
      expect(allActive.some((b) => b.id === 'b-4')).toBe(false);
    });
  });

  // Test Card Search and Priority Filtering
  describe('Card Search and Filtering', () => {
    const sampleCards: Card[] = [
      {
        id: 'c-1',
        board_id: 'b-1',
        column_id: 'col-1',
        title: 'Configure SAML SSO for Enterprise',
        description: 'Verify IdP metadata',
        position: 1000,
        priority: 'urgent',
        due_date: null,
        labels: ['Security', 'SSO'],
        checklist: [],
        assignee_ids: ['usr-1'],
        lead_id: null,
        customer_id: null,
        created_by: null,
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
      {
        id: 'c-2',
        board_id: 'b-1',
        column_id: 'col-1',
        title: 'Weekly MRR summary digest',
        description: 'Prepare metrics for exec team',
        position: 2000,
        priority: 'medium',
        due_date: null,
        labels: ['Reporting'],
        checklist: [],
        assignee_ids: ['usr-2'],
        lead_id: null,
        customer_id: null,
        created_by: null,
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
    ];

    it('filters cards by search query in title or labels', () => {
      const query = 'sso';
      const results = sampleCards.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.labels.some((l) => l.toLowerCase().includes(query))
      );
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('c-1');
    });

    it('filters cards by priority level', () => {
      const urgentCards = sampleCards.filter((c) => c.priority === 'urgent');
      expect(urgentCards).toHaveLength(1);
      expect(urgentCards[0].id).toBe('c-1');
    });
  });
});
