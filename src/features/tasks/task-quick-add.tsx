'use client';

import * as React from 'react';
import { Plus, Calendar, Flag, User, Layers, ArrowRight } from 'lucide-react';
import { PriorityLevel, Task } from '@/types/custom.types';
import { useCrmData } from '@/context/crm-data-context';
import { useAuth } from '@/context/auth-context';
import { useVertical } from '@/context/vertical-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MOCK_PROFILES } from '@/lib/mock-data';

interface TaskQuickAddProps {
  defaultVerticalId?: string;
  defaultAssigneeId?: string;
}

export function TaskQuickAdd({
  defaultVerticalId,
  defaultAssigneeId,
}: TaskQuickAddProps) {
  const { createTask } = useCrmData();
  const { user } = useAuth();
  const { verticals, selectedVerticalId } = useVertical();

  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState<PriorityLevel>('medium');
  const [dueDateType, setDueDateType] = React.useState<'today' | 'tomorrow' | 'next_week' | 'none'>('today');
  const [verticalId, setVerticalId] = React.useState<string>('');
  const [isAdding, setIsAdding] = React.useState(false);

  const effectiveVerticalId =
    verticalId ||
    defaultVerticalId ||
    (selectedVerticalId !== 'all' ? selectedVerticalId : null);

  const calculateDueDate = () => {
    const now = new Date();
    if (dueDateType === 'today') {
      now.setHours(18, 0, 0, 0);
      return now.toISOString();
    } else if (dueDateType === 'tomorrow') {
      now.setDate(now.getDate() + 1);
      now.setHours(18, 0, 0, 0);
      return now.toISOString();
    } else if (dueDateType === 'next_week') {
      now.setDate(now.getDate() + 7);
      now.setHours(18, 0, 0, 0);
      return now.toISOString();
    }
    return null;
  };

  const handleQuickSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsAdding(true);
    try {
      await createTask({
        title: title.trim(),
        description: null,
        due_date: calculateDueDate(),
        priority,
        status: 'pending',
        assignee_id: defaultAssigneeId || user?.id || MOCK_PROFILES[0].id,
        vertical_id: effectiveVerticalId || null,
        lead_id: null,
        customer_id: null,
        project_id: null,
        completed_at: null,
        created_by: user?.id || null,
      });
      setTitle('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <form
      onSubmit={handleQuickSubmit}
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <div className="flex-1 flex items-center space-x-2 px-1">
        <Plus className="h-4 w-4 text-zinc-400 shrink-0" />
        <Input
          placeholder="Quick add a task (e.g. Follow up on proposal with CFO)..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 border-0 shadow-none focus-visible:ring-0 p-0 text-xs placeholder:text-zinc-400"
          required
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap border-t sm:border-t-0 sm:border-l border-zinc-100 dark:border-zinc-800 pt-2 sm:pt-0 sm:pl-2">
        {/* Due Date Shortcut */}
        <select
          value={dueDateType}
          onChange={(e) => setDueDateType(e.target.value as any)}
          className="flex h-7 rounded-md border border-zinc-200 bg-transparent px-2 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 dark:border-zinc-800 cursor-pointer"
        >
          <option value="today">Due Today</option>
          <option value="tomorrow">Due Tomorrow</option>
          <option value="next_week">In 1 Week</option>
          <option value="none">No Due Date</option>
        </select>

        {/* Priority Shortcut */}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as PriorityLevel)}
          className="flex h-7 rounded-md border border-zinc-200 bg-transparent px-2 text-[11px] font-medium text-zinc-600 dark:text-zinc-400 dark:border-zinc-800 cursor-pointer"
        >
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Submit Button */}
        <Button
          type="submit"
          size="sm"
          disabled={isAdding || !title.trim()}
          className="h-7 px-3 text-xs gap-1 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
        >
          <span>{isAdding ? 'Adding...' : 'Add Task'}</span>
        </Button>
      </div>
    </form>
  );
}
