'use client';

import * as React from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  Users,
  User,
  Sparkles,
  Mail,
  RefreshCw,
  Flame,
} from 'lucide-react';
import { Task, PriorityLevel } from '@/types/custom.types';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { TaskItem } from '@/features/tasks/task-item';
import { TaskQuickAdd } from '@/features/tasks/task-quick-add';
import { TaskFormModal } from '@/features/tasks/task-form-modal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ScopeView = 'my' | 'team';
type TimeframeFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'completed';

export default function TasksPage() {
  const { tasks, deleteTask, updateTask } = useCrmData();
  const { selectedVerticalId, selectedVertical } = useVertical();
  const { user } = useAuth();

  const [mounted, setMounted] = React.useState(false);
  const [scope, setScope] = React.useState<ScopeView>('my');
  const [timeframe, setTimeframe] = React.useState<TimeframeFilter>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = React.useState<string | null>(null);
  const [isDigestOpen, setIsDigestOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'new') {
        setIsFormOpen(true);
      }
      const filterParam = params.get('filter');
      if (filterParam && ['today', 'upcoming', 'overdue', 'completed'].includes(filterParam)) {
        setTimeframe(filterParam as TimeframeFilter);
      }
    }
  }, []);

  // Filter tasks based on vertical, scope, timeframe, priority, search
  const visibleTasks = React.useMemo(() => {
    if (!mounted) return [];

    const now = new Date();
    const todayStr = now.toDateString();
    const nowTime = now.getTime();

    return tasks.filter((task) => {
      // Exclude soft-deleted tasks
      if (task.deleted_at) return false;

      // 1. Vertical Scoping: if vertical selected, match vertical_id or global (null)
      if (selectedVerticalId !== 'all') {
        if (task.vertical_id && task.vertical_id !== selectedVerticalId) {
          return false;
        }
      }

      // 2. Scope: My Tasks vs Team Tasks
      if (scope === 'my' && user) {
        if (task.assignee_id !== user.id) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      // 4. Priority Filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // 5. Timeframe Filter
      const isCompleted = task.status === 'completed';
      const taskDate = task.due_date ? new Date(task.due_date) : null;
      const isOverdue = !isCompleted && taskDate && taskDate.getTime() < nowTime;
      const isToday = !isCompleted && taskDate && taskDate.toDateString() === todayStr;
      const isUpcoming = !isCompleted && taskDate && taskDate.getTime() >= nowTime && !isToday;

      if (timeframe === 'completed') return isCompleted;
      if (timeframe === 'overdue') return isOverdue;
      if (timeframe === 'today') return isToday;
      if (timeframe === 'upcoming') return isUpcoming;

      // 'all' tab: hide completed by default unless explicitly in completed tab?
      // standard CRM behavior: in 'all', show pending/in-progress first, or show all
      return true;
    });
  }, [tasks, selectedVerticalId, scope, user, searchQuery, priorityFilter, timeframe, mounted]);

  // Global counts for badges & alert cards
  const stats = React.useMemo(() => {
    if (!mounted) {
      return { total: 0, myTotal: 0, overdue: 0, myOverdue: 0, today: 0, completed: 0 };
    }

    const now = new Date();
    const todayStr = now.toDateString();
    const nowTime = now.getTime();

    const activeTasks = tasks.filter((t) => {
      if (t.deleted_at) return false;
      if (selectedVerticalId !== 'all' && t.vertical_id && t.vertical_id !== selectedVerticalId) {
        return false;
      }
      return true;
    });

    let overdue = 0;
    let myOverdue = 0;
    let today = 0;
    let completed = 0;
    let myTotal = 0;

    activeTasks.forEach((t) => {
      const isMine = user && t.assignee_id === user.id;
      if (isMine) myTotal++;
      if (t.status === 'completed') {
        completed++;
        return;
      }
      if (t.due_date) {
        const d = new Date(t.due_date);
        if (d.getTime() < nowTime) {
          overdue++;
          if (isMine) myOverdue++;
        } else if (d.toDateString() === todayStr) {
          today++;
        }
      }
    });

    return {
      total: activeTasks.length,
      myTotal,
      overdue,
      myOverdue,
      today,
      completed,
    };
  }, [tasks, selectedVerticalId, user, mounted]);

  // Reschedule all overdue tasks to today
  const handleRescheduleOverdueToToday = async () => {
    const now = new Date();
    const nowTime = now.getTime();
    const todayEvening = new Date();
    todayEvening.setHours(18, 0, 0, 0);

    const overdueList = tasks.filter((t) => {
      if (t.deleted_at || t.status === 'completed') return false;
      if (scope === 'my' && user && t.assignee_id !== user.id) return false;
      if (!t.due_date) return false;
      return new Date(t.due_date).getTime() < nowTime;
    });

    for (const t of overdueList) {
      await updateTask(t.id, { due_date: todayEvening.toISOString() });
    }
  };

  const activeOverdueCount = scope === 'my' ? stats.myOverdue : stats.overdue;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Tasks & Reminders
            </h1>
            {selectedVertical && (
              <Badge
                variant="secondary"
                className="text-[10px] uppercase font-mono tracking-wider h-5"
                style={{ borderLeft: `3px solid ${selectedVertical.color}` }}
              >
                {selectedVertical.name}
              </Badge>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Track personal action items, manage team assignments, and stay ahead of deadlines.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Email Digest Preview */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDigestOpen(true)}
            className="text-xs h-8 gap-1.5"
            title="Preview Free-Tier In-App / Email Digest"
          >
            <Mail className="h-3.5 w-3.5 text-zinc-500" />
            <span className="hidden md:inline">Daily Digest Preview</span>
          </Button>

          {/* New Task Button */}
          <Button
            size="sm"
            onClick={() => {
              setEditingTask(null);
              setIsFormOpen(true);
            }}
            className="text-xs h-8 gap-1.5 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Overdue Notification Alert Banner (if any overdue tasks exist) */}
      {mounted && activeOverdueCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-red-900 shadow-2xs dark:border-red-950 dark:bg-red-950/30 dark:text-red-200">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold">
                {activeOverdueCount} Overdue {activeOverdueCount === 1 ? 'Task Requires' : 'Tasks Require'} Attention
              </h2>
              <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">
                {scope === 'my'
                  ? 'You have past-due action items assigned to you. Review or reschedule to keep pipelines moving.'
                  : 'There are past-due action items across the team. Follow up or reassign to avoid blockers.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTimeframe('overdue')}
              className="h-7 text-xs bg-white text-red-800 border-red-300 hover:bg-red-100 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
            >
              Filter Overdue ({activeOverdueCount})
            </Button>
            <Button
              size="sm"
              onClick={handleRescheduleOverdueToToday}
              className="h-7 text-xs gap-1 bg-red-700 text-white hover:bg-red-800 dark:bg-red-600"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reschedule to Today</span>
            </Button>
          </div>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-medium">
              {scope === 'my' ? 'My Active Tasks' : 'Total Active'}
            </span>
            <CheckSquare className="h-3.5 w-3.5" />
          </div>
          <div className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">
            {mounted ? (scope === 'my' ? stats.myTotal : stats.total) : '...'}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-medium">Due Today</span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-amber-600 dark:text-amber-400">
            {mounted ? stats.today : '...'}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-medium">Overdue</span>
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-red-600 dark:text-red-400">
            {mounted ? (scope === 'my' ? stats.myOverdue : stats.overdue) : '...'}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-medium">Completed</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {mounted ? stats.completed : '...'}
          </div>
        </div>
      </div>

      {/* Quick Add Bar */}
      <div>
        <TaskQuickAdd
          defaultVerticalId={selectedVerticalId !== 'all' ? selectedVerticalId : undefined}
          defaultAssigneeId={user?.id}
        />
      </div>

      {/* Scope Switcher, Timeframe Tabs & Search Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Left: Scope Toggle (My Tasks vs Team Tasks) */}
        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100/70 p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setScope('my')}
            className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              scope === 'my'
                ? 'bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>My Tasks</span>
            {mounted && stats.myTotal > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-1">
                {stats.myTotal}
              </Badge>
            )}
          </button>
          <button
            type="button"
            onClick={() => setScope('team')}
            className={`flex items-center space-x-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              scope === 'team'
                ? 'bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Team Tasks</span>
            {mounted && stats.total > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-1">
                {stats.total}
              </Badge>
            )}
          </button>
        </div>

        {/* Right: Search Bar & Priority Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Timeframe Filter Pills */}
      <div className="flex items-center space-x-1 overflow-x-auto border-b border-zinc-200 pb-2 dark:border-zinc-800">
        {[
          { id: 'all', label: 'All Open & Active' },
          { id: 'today', label: 'Due Today' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'completed', label: 'Completed' },
        ].map((tab) => {
          const isActive = timeframe === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTimeframe(tab.id as TimeframeFilter)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              }`}
            >
              {tab.label}
              {tab.id === 'overdue' && mounted && activeOverdueCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.2 text-[9px] font-bold text-white">
                  {activeOverdueCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Task List Section */}
      <div className="space-y-2">
        {visibleTasks.length > 0 ? (
          visibleTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onEdit={(t) => {
                setEditingTask(t);
                setIsFormOpen(true);
              }}
              onDelete={(id) => setDeletingTaskId(id)}
            />
          ))
        ) : (
          <EmptyState
            icon={CheckSquare}
            title={
              timeframe === 'overdue'
                ? 'No overdue tasks!'
                : timeframe === 'completed'
                ? 'No completed tasks yet'
                : 'No tasks found'
            }
            description={
              timeframe === 'overdue'
                ? 'You are all caught up! Great job staying ahead of deadlines.'
                : 'Use the quick-add bar above to create a task, or change your filter.'
            }
            actionLabel={timeframe !== 'all' ? 'Show All Tasks' : undefined}
            onAction={timeframe !== 'all' ? () => setTimeframe('all') : undefined}
          />
        )}
      </div>

      {/* Create / Edit Task Modal */}
      <TaskFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        taskToEdit={editingTask}
        defaultVerticalId={selectedVerticalId !== 'all' ? selectedVerticalId : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingTaskId}
        onOpenChange={(open) => !open && setDeletingTaskId(null)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action can be reviewed in audit logs."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deletingTaskId) {
            await deleteTask(deletingTaskId);
            setDeletingTaskId(null);
          }
        }}
      />

      {/* Email Digest Simulator Dialog */}
      <Dialog open={isDigestOpen} onOpenChange={setIsDigestOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden sm:rounded-xl">
          <DialogHeader className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
            <DialogTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <Mail className="h-4 w-4 text-blue-600" />
              <span>Daily Morning Task Digest (8:00 AM)</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              Free-Tier In-App simulation of the automated daily task email sent to {user?.email || 'team members'}.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4 text-xs">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950 font-mono text-[11px] space-y-2">
              <div className="text-zinc-500">
                <strong>Subject:</strong> 📋 Your Daily Briefing: {stats.today} tasks due today, {activeOverdueCount} overdue
              </div>
              <div className="text-zinc-500">
                <strong>To:</strong> {user?.full_name} &lt;{user?.email}&gt;
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-zinc-700 dark:text-zinc-300">
                Good morning {user?.full_name?.split(' ')[0] || 'Team'}! Here is your CRM action item summary for today:
              </p>

              <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>🚨 Overdue Attention:</span>
                  <Badge variant={activeOverdueCount > 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                    {activeOverdueCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>⏰ Due Today:</span>
                  <Badge variant="warning" className="text-[10px]">
                    {stats.today}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>✅ Completed this Week:</span>
                  <Badge variant="default" className="text-[10px]">
                    {stats.completed}
                  </Badge>
                </div>
              </div>

              <div className="rounded bg-blue-50 p-2.5 text-[11px] text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                💡 <strong>Free Tier Architecture Note:</strong> To respect Supabase / Resend free-tier rate limits, task notifications are delivered in-app via Topbar badges and persistent alert banners, with webhook triggers ready for Resend SMTP when configured.
              </div>
            </div>

            <Button
              className="w-full text-xs"
              onClick={() => setIsDigestOpen(false)}
            >
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
