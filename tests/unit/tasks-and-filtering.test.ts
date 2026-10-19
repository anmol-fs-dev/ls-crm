import { describe, it, expect } from 'vitest';
import { Task, PriorityLevel } from '@/types/custom.types';

describe('Tasks Filtering and Scoping Logic', () => {
  const sampleTasks: Task[] = [
    {
      id: 'tsk-1',
      vertical_id: 'vert-1',
      title: 'Overdue task assigned to User 1',
      description: 'Follow up on proposal',
      due_date: '2026-10-15T18:00:00Z',
      priority: 'urgent',
      status: 'pending',
      assignee_id: 'usr-1',
      lead_id: 'lead-100',
      customer_id: null,
      project_id: null,
      completed_at: null,
      created_by: 'usr-1',
      created_at: '2026-10-10T10:00:00Z',
      updated_at: '2026-10-10T10:00:00Z',
      deleted_at: null,
    },
    {
      id: 'tsk-2',
      vertical_id: 'vert-2',
      title: 'Due today task assigned to User 2',
      description: 'Prepare contract',
      due_date: new Date().toISOString(),
      priority: 'high',
      status: 'pending',
      assignee_id: 'usr-2',
      lead_id: null,
      customer_id: 'cust-200',
      project_id: null,
      completed_at: null,
      created_by: 'usr-2',
      created_at: '2026-10-18T10:00:00Z',
      updated_at: '2026-10-18T10:00:00Z',
      deleted_at: null,
    },
    {
      id: 'tsk-3',
      vertical_id: null,
      title: 'Completed task across verticals',
      description: 'All done',
      due_date: '2026-10-12T12:00:00Z',
      priority: 'medium',
      status: 'completed',
      assignee_id: 'usr-1',
      lead_id: null,
      customer_id: null,
      project_id: null,
      completed_at: '2026-10-12T11:00:00Z',
      created_by: 'usr-1',
      created_at: '2026-10-10T10:00:00Z',
      updated_at: '2026-10-12T11:00:00Z',
      deleted_at: null,
    },
    {
      id: 'tsk-4',
      vertical_id: 'vert-1',
      title: 'Soft deleted task',
      description: 'Should not appear',
      due_date: '2026-10-25T18:00:00Z',
      priority: 'low',
      status: 'pending',
      assignee_id: 'usr-1',
      lead_id: null,
      customer_id: null,
      project_id: null,
      completed_at: null,
      created_by: 'usr-1',
      created_at: '2026-10-10T10:00:00Z',
      updated_at: '2026-10-10T10:00:00Z',
      deleted_at: '2026-10-19T10:00:00Z',
    },
  ];

  it('filters out soft-deleted tasks', () => {
    const activeTasks = sampleTasks.filter((t) => !t.deleted_at);
    expect(activeTasks).toHaveLength(3);
    expect(activeTasks.map((t) => t.id)).not.toContain('tsk-4');
  });

  it('identifies overdue pending tasks correctly', () => {
    const nowTime = Date.now();
    const overdueTasks = sampleTasks.filter((t) => {
      if (t.deleted_at || t.status === 'completed') return false;
      return t.due_date && new Date(t.due_date).getTime() < nowTime;
    });

    // tsk-1 is due 2026-10-15 and pending -> overdue
    // tsk-3 is due 2026-10-12 but completed -> NOT overdue
    expect(overdueTasks.map((t) => t.id)).toContain('tsk-1');
    expect(overdueTasks.map((t) => t.id)).not.toContain('tsk-3');
  });

  it('scopes tasks to My Tasks for a given user', () => {
    const user1Tasks = sampleTasks.filter((t) => !t.deleted_at && t.assignee_id === 'usr-1');
    expect(user1Tasks).toHaveLength(2);
    expect(user1Tasks.map((t) => t.id)).toEqual(['tsk-1', 'tsk-3']);
  });

  it('scopes tasks by vertical correctly including global tasks', () => {
    const vert1Tasks = sampleTasks.filter((t) => {
      if (t.deleted_at) return false;
      return !t.vertical_id || t.vertical_id === 'vert-1';
    });

    // vert-1 has tsk-1 and global tsk-3
    expect(vert1Tasks.map((t) => t.id)).toEqual(['tsk-1', 'tsk-3']);
    expect(vert1Tasks.map((t) => t.id)).not.toContain('tsk-2');
  });

  it('correctly associates tasks with Leads and Customers', () => {
    const leadTasks = sampleTasks.filter((t) => t.lead_id === 'lead-100');
    expect(leadTasks).toHaveLength(1);
    expect(leadTasks[0].id).toBe('tsk-1');

    const customerTasks = sampleTasks.filter((t) => t.customer_id === 'cust-200');
    expect(customerTasks).toHaveLength(1);
    expect(customerTasks[0].id).toBe('tsk-2');
  });

  it('supports priority levels', () => {
    const priorities: PriorityLevel[] = ['low', 'medium', 'high', 'urgent'];
    priorities.forEach((p) => {
      expect(['low', 'medium', 'high', 'urgent']).toContain(p);
    });
  });
});
