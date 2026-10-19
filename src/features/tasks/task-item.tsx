'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Check,
  Calendar,
  AlertCircle,
  MoreHorizontal,
  Edit2,
  Trash2,
  User,
  Users2,
  Building2,
  Clock,
} from 'lucide-react';
import { Task } from '@/types/custom.types';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import { MOCK_PROFILES } from '@/lib/mock-data';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskItem({ task, onEdit, onDelete }: TaskItemProps) {
  const { toggleTaskComplete, leads, customers } = useCrmData();
  const { verticals } = useVertical();

  const isCompleted = task.status === 'completed';
  const assignee = MOCK_PROFILES.find((p) => p.id === task.assignee_id);
  const vertical = verticals.find((v) => v.id === task.vertical_id);
  const linkedLead = leads.find((l) => l.id === task.lead_id);
  const linkedCustomer = customers.find((c) => c.id === task.customer_id);

  // Compute overdue / today status
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isOverdue =
    mounted &&
    !isCompleted &&
    task.due_date &&
    new Date(task.due_date).getTime() < Date.now();

  const isDueToday =
    mounted &&
    !isCompleted &&
    task.due_date &&
    new Date(task.due_date).toDateString() === new Date().toDateString();

  return (
    <div
      className={`group flex items-start sm:items-center justify-between rounded-lg border p-3 transition-colors ${
        isCompleted
          ? 'border-zinc-100 bg-zinc-50/50 dark:border-zinc-800/40 dark:bg-zinc-950/20 opacity-70'
          : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0 pr-2">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => toggleTaskComplete(task.id)}
          className={`mt-0.5 sm:mt-0 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer ${
            isCompleted
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500'
          }`}
          title={isCompleted ? 'Mark pending' : 'Mark completed'}
        >
          {isCompleted && <Check className="h-3.5 w-3.5 stroke-[3]" />}
        </button>

        {/* Title, description & badges */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`text-xs font-semibold truncate ${
                isCompleted
                  ? 'line-through text-zinc-400 dark:text-zinc-500'
                  : 'text-zinc-900 dark:text-zinc-100'
              }`}
            >
              {task.title}
            </span>

            {/* Priority Badge */}
            <Badge
              variant={
                task.priority === 'urgent'
                  ? 'destructive'
                  : task.priority === 'high'
                  ? 'warning'
                  : 'secondary'
              }
              className="text-[9px] uppercase tracking-wider px-1.5 py-0 h-4"
            >
              {task.priority}
            </Badge>

            {/* Overdue / Due Today Badge */}
            {isOverdue ? (
              <Badge variant="destructive" className="text-[9px] gap-0.5 px-1.5 py-0 h-4">
                <AlertCircle className="h-2.5 w-2.5" />
                <span>Overdue</span>
              </Badge>
            ) : isDueToday ? (
              <Badge variant="warning" className="text-[9px] gap-0.5 px-1.5 py-0 h-4">
                <Clock className="h-2.5 w-2.5" />
                <span>Due Today</span>
              </Badge>
            ) : null}

            {/* Linked Entity Badges */}
            {linkedLead && (
              <Link
                href={`/leads/${linkedLead.id}`}
                className="inline-flex items-center space-x-1 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-700 hover:underline dark:bg-blue-950/40 dark:text-blue-300"
              >
                <Users2 className="h-2.5 w-2.5" />
                <span className="truncate max-w-[120px]">{linkedLead.name}</span>
              </Link>
            )}

            {linkedCustomer && (
              <Link
                href={`/customers/${linkedCustomer.id}`}
                className="inline-flex items-center space-x-1 rounded bg-purple-50 px-1.5 py-0.5 text-[9px] font-medium text-purple-700 hover:underline dark:bg-purple-950/40 dark:text-purple-300"
              >
                <Building2 className="h-2.5 w-2.5" />
                <span className="truncate max-w-[120px]">{linkedCustomer.name}</span>
              </Link>
            )}
          </div>

          {task.description && (
            <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Due Date, Vertical, Assignee & Actions */}
      <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
        {/* Vertical Tag */}
        {vertical && (
          <div className="hidden md:flex items-center space-x-1 text-[11px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: vertical.color }} />
            <span className="truncate max-w-[90px]">{vertical.name}</span>
          </div>
        )}

        {/* Due Date */}
        {task.due_date && (
          <span
            className={`text-[11px] font-mono flex items-center gap-1 ${
              isOverdue ? 'text-red-600 font-bold' : isDueToday ? 'text-amber-600 font-semibold' : 'text-zinc-500'
            }`}
          >
            <Calendar className="h-3 w-3 opacity-60" />
            <span>{formatDate(task.due_date)}</span>
          </span>
        )}

        {/* Assignee */}
        {assignee && (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-white dark:bg-zinc-200 dark:text-zinc-900"
            title={`Assigned to ${assignee.full_name}`}
          >
            {assignee.full_name.substring(0, 2).toUpperCase()}
          </div>
        )}

        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-700">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onEdit(task)} className="cursor-pointer text-xs">
              <Edit2 className="mr-2 h-3.5 w-3.5" />
              <span>Edit Task</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(task.id)}
              className="cursor-pointer text-xs text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
