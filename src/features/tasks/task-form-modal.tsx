'use client';

import * as React from 'react';
import { Calendar, Flag, User, Layers, Users2, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { PriorityLevel, Task } from '@/types/custom.types';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MOCK_PROFILES } from '@/lib/mock-data';

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskToEdit?: Task | null;
  defaultVerticalId?: string;
  defaultLeadId?: string;
  defaultCustomerId?: string;
}

export function TaskFormModal({
  open,
  onOpenChange,
  taskToEdit,
  defaultVerticalId,
  defaultLeadId,
  defaultCustomerId,
}: TaskFormModalProps) {
  const { createTask, updateTask, leads, customers } = useCrmData();
  const { verticals, selectedVerticalId } = useVertical();
  const { user } = useAuth();

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [priority, setPriority] = React.useState<PriorityLevel>('medium');
  const [status, setStatus] = React.useState<Task['status']>('pending');
  const [assigneeId, setAssigneeId] = React.useState<string>(MOCK_PROFILES[0].id);
  const [verticalId, setVerticalId] = React.useState<string>('');
  const [linkType, setLinkType] = React.useState<'none' | 'lead' | 'customer'>('none');
  const [linkedLeadId, setLinkedLeadId] = React.useState<string>('');
  const [linkedCustomerId, setLinkedCustomerId] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Initialize or reset form values
  React.useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setDueDate(taskToEdit.due_date ? taskToEdit.due_date.substring(0, 10) : '');
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
      setAssigneeId(taskToEdit.assignee_id || MOCK_PROFILES[0].id);
      setVerticalId(taskToEdit.vertical_id || '');
      if (taskToEdit.lead_id) {
        setLinkType('lead');
        setLinkedLeadId(taskToEdit.lead_id);
      } else if (taskToEdit.customer_id) {
        setLinkType('customer');
        setLinkedCustomerId(taskToEdit.customer_id);
      } else {
        setLinkType('none');
      }
    } else {
      setTitle('');
      setDescription('');
      // Default due date to today
      const today = new Date().toISOString().substring(0, 10);
      setDueDate(today);
      setPriority('medium');
      setStatus('pending');
      setAssigneeId(user?.id || MOCK_PROFILES[0].id);
      setVerticalId(defaultVerticalId || (selectedVerticalId !== 'all' ? selectedVerticalId : ''));
      
      if (defaultLeadId) {
        setLinkType('lead');
        setLinkedLeadId(defaultLeadId);
      } else if (defaultCustomerId) {
        setLinkType('customer');
        setLinkedCustomerId(defaultCustomerId);
      } else {
        setLinkType('none');
        setLinkedLeadId('');
        setLinkedCustomerId('');
      }
    }
  }, [taskToEdit, open, defaultVerticalId, defaultLeadId, defaultCustomerId, selectedVerticalId, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const formattedDueDate = dueDate ? new Date(`${dueDate}T18:00:00Z`).toISOString() : null;

      if (taskToEdit) {
        await updateTask(taskToEdit.id, {
          title: title.trim(),
          description: description.trim() || null,
          due_date: formattedDueDate,
          priority,
          status,
          assignee_id: assigneeId || null,
          vertical_id: verticalId || null,
          lead_id: linkType === 'lead' ? linkedLeadId || null : null,
          customer_id: linkType === 'customer' ? linkedCustomerId || null : null,
        });
      } else {
        await createTask({
          title: title.trim(),
          description: description.trim() || null,
          due_date: formattedDueDate,
          priority,
          status,
          assignee_id: assigneeId || null,
          vertical_id: verticalId || null,
          lead_id: linkType === 'lead' ? linkedLeadId || null : null,
          customer_id: linkType === 'customer' ? linkedCustomerId || null : null,
          project_id: null,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
          created_by: user?.id || null,
        });
      }
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShortcutDueDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setDueDate(d.toISOString().substring(0, 10));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden sm:rounded-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>{taskToEdit ? 'Edit Task Details' : 'Create New Action Item'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
              {taskToEdit
                ? 'Update deadline, status, assignment or linked CRM records.'
                : 'Assign an actionable follow-up to yourself or a team member across verticals.'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[75vh] overflow-y-auto px-6 py-4 space-y-4 text-xs">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="task-title" className="text-xs font-medium">
                Task Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="task-title"
                placeholder="e.g. Schedule technical evaluation with engineering VP"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="text-xs h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="task-description" className="text-xs font-medium">
                Description & Notes
              </Label>
              <textarea
                id="task-description"
                rows={3}
                placeholder="Add background context, required documents, call agenda, or next steps..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-300"
              />
            </div>

            {/* Priority & Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Flag className="h-3 w-3 text-zinc-400" />
                  <span>Priority</span>
                </Label>
                <div className="grid grid-cols-4 gap-1">
                  {(['low', 'medium', 'high', 'urgent'] as PriorityLevel[]).map((p) => {
                    const isSelected = priority === p;
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`py-1 text-[11px] font-semibold uppercase rounded border transition-all cursor-pointer ${
                          isSelected
                            ? p === 'urgent'
                              ? 'border-red-600 bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                              : p === 'high'
                              ? 'border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-status" className="text-xs font-medium">
                  Status
                </Label>
                <select
                  id="task-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Task['status'])}
                  className="w-full h-8 rounded-md border border-zinc-200 bg-transparent px-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:text-zinc-100 cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Due Date with shortcuts */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="task-due-date" className="text-xs font-medium flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-zinc-400" />
                  <span>Due Date</span>
                </Label>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleShortcutDueDate(0)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline px-1"
                  >
                    Today
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <button
                    type="button"
                    onClick={() => handleShortcutDueDate(1)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline px-1"
                  >
                    Tomorrow
                  </button>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <button
                    type="button"
                    onClick={() => handleShortcutDueDate(7)}
                    className="text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:underline px-1"
                  >
                    +1 Week
                  </button>
                </div>
              </div>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs h-8"
              />
            </div>

            {/* Assignee & Vertical */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="task-assignee" className="text-xs font-medium flex items-center gap-1.5">
                  <User className="h-3 w-3 text-zinc-400" />
                  <span>Assignee</span>
                </Label>
                <select
                  id="task-assignee"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full h-8 rounded-md border border-zinc-200 bg-transparent px-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:text-zinc-100 cursor-pointer"
                >
                  {MOCK_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-vertical" className="text-xs font-medium flex items-center gap-1.5">
                  <Layers className="h-3 w-3 text-zinc-400" />
                  <span>Vertical</span>
                </Label>
                <select
                  id="task-vertical"
                  value={verticalId}
                  onChange={(e) => setVerticalId(e.target.value)}
                  className="w-full h-8 rounded-md border border-zinc-200 bg-transparent px-2.5 text-xs text-zinc-900 dark:border-zinc-800 dark:text-zinc-100 cursor-pointer"
                >
                  <option value="">Global / Cross-Vertical</option>
                  {verticals
                    .filter((v) => v.status === 'active')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Entity Linking Section */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Link to CRM Record
                </Label>
                <div className="flex items-center space-x-1.5 bg-white dark:bg-zinc-800 p-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setLinkType('none')}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors cursor-pointer ${
                      linkType === 'none'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    None
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkType('lead')}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                      linkType === 'lead'
                        ? 'bg-blue-600 text-white'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Users2 className="h-3 w-3" />
                    <span>Lead</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkType('customer')}
                    className={`px-2 py-0.5 text-[11px] rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                      linkType === 'customer'
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Building2 className="h-3 w-3" />
                    <span>Customer</span>
                  </button>
                </div>
              </div>

              {linkType === 'lead' && (
                <div className="space-y-1">
                  <Label htmlFor="linked-lead" className="text-[11px] text-zinc-500">
                    Select Target Lead
                  </Label>
                  <select
                    id="linked-lead"
                    value={linkedLeadId}
                    onChange={(e) => setLinkedLeadId(e.target.value)}
                    className="w-full h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 cursor-pointer"
                  >
                    <option value="">Select a lead...</option>
                    {leads
                      .filter((l) => !l.deleted_at)
                      .map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.name} {lead.company ? `(${lead.company})` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {linkType === 'customer' && (
                <div className="space-y-1">
                  <Label htmlFor="linked-customer" className="text-[11px] text-zinc-500">
                    Select Target Customer
                  </Label>
                  <select
                    id="linked-customer"
                    value={linkedCustomerId}
                    onChange={(e) => setLinkedCustomerId(e.target.value)}
                    className="w-full h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 cursor-pointer"
                  >
                    <option value="">Select a customer...</option>
                    {customers
                      .filter((c) => !c.deleted_at)
                      .map((cust) => (
                        <option key={cust.id} value={cust.id}>
                          {cust.name} ({cust.lifecycle_status})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-zinc-100 px-6 py-3 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !title.trim()}
              className="text-xs bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {isSubmitting ? 'Saving...' : taskToEdit ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
