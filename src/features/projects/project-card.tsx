'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Link2,
  Building2,
  AlertCircle,
  MoreVertical,
  Clock,
} from 'lucide-react';
import { Card, CardChecklistItem } from '@/types/custom.types';
import { useCrmData } from '@/context/crm-data-context';
import { useProject } from '@/context/project-context';
import { MOCK_PROFILES } from '@/lib/mock-data';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface ProjectCardProps {
  card: Card;
  onClick: () => void;
}

export function ProjectCard({ card, onClick }: ProjectCardProps) {
  const { leads, customers } = useCrmData();
  const { getCardComments } = useProject();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  // Find linked entities
  const linkedLead = React.useMemo(() => {
    if (!card.lead_id) return null;
    return leads.find((l) => l.id === card.lead_id && !l.deleted_at) || null;
  }, [card.lead_id, leads]);

  const linkedCustomer = React.useMemo(() => {
    if (!card.customer_id) return null;
    return customers.find((c) => c.id === card.customer_id && !c.deleted_at) || null;
  }, [card.customer_id, customers]);

  // Checklist counts
  const checklistItems: CardChecklistItem[] = Array.isArray(card.checklist)
    ? (card.checklist as unknown as CardChecklistItem[])
    : [];
  const totalChecklist = checklistItems.length;
  const completedChecklist = checklistItems.filter((i) => i.is_completed).length;

  // Comments
  const comments = getCardComments(card.id);

  // Due date status
  const dueDateInfo = React.useMemo(() => {
    if (!card.due_date) return null;
    const due = new Date(card.due_date);
    const now = new Date();
    const isOverdue = due < now && !now.toDateString().includes(due.toDateString());
    const isToday = due.toDateString() === now.toDateString();
    return { formatted: formatDate(card.due_date), isOverdue, isToday };
  }, [card.due_date]);

  // Priority styling
  const priorityColor = {
    urgent: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    high: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
    medium: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
    low: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
  }[card.priority || 'medium'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group relative cursor-grab active:cursor-grabbing rounded-lg border border-zinc-200/80 bg-white p-3.5 shadow-sm transition-all hover:border-zinc-300 hover:shadow dark:border-zinc-800/80 dark:bg-zinc-900/90 dark:hover:border-zinc-700"
    >
      {/* Priority & Top Badges */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${priorityColor}`}
        >
          {card.priority}
        </span>

        {/* Labels preview */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex items-center gap-1 overflow-hidden">
            {card.labels.slice(0, 2).map((label, idx) => (
              <span
                key={idx}
                className="truncate max-w-[80px] rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                {label}
              </span>
            ))}
            {card.labels.length > 2 && (
              <span className="text-[10px] text-zinc-400">+{card.labels.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Card Title */}
      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-relaxed mb-2">
        {card.title}
      </h4>

      {/* Linked Entity Badges */}
      {(linkedLead || linkedCustomer) && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {linkedLead && (
            <div className="inline-flex items-center gap-1 rounded bg-indigo-50/70 dark:bg-indigo-950/40 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 truncate max-w-[170px]">
              <Link2 className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{linkedLead.name}</span>
            </div>
          )}
          {linkedCustomer && (
            <div className="inline-flex items-center gap-1 rounded bg-emerald-50/70 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 truncate max-w-[170px]">
              <Building2 className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{linkedCustomer.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Bottom Row: Checklist, Date, Comments, Assignees */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          {/* Checklist progress */}
          {totalChecklist > 0 && (
            <div
              className={`flex items-center gap-1 ${
                completedChecklist === totalChecklist
                  ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                  : ''
              }`}
            >
              <CheckSquare className="h-3 w-3" />
              <span>
                {completedChecklist}/{totalChecklist}
              </span>
            </div>
          )}

          {/* Comments count */}
          {comments.length > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{comments.length}</span>
            </div>
          )}

          {/* Due date */}
          {dueDateInfo && (
            <div
              className={`flex items-center gap-1 ${
                dueDateInfo.isOverdue
                  ? 'text-red-600 dark:text-red-400 font-medium'
                  : dueDateInfo.isToday
                  ? 'text-amber-600 dark:text-amber-400 font-medium'
                  : ''
              }`}
            >
              <Clock className="h-3 w-3" />
              <span>{dueDateInfo.formatted}</span>
            </div>
          )}
        </div>

        {/* Assignees initials avatar */}
        {card.assignee_ids && card.assignee_ids.length > 0 && (
          <div className="flex -space-x-1.5 overflow-hidden">
            {card.assignee_ids.slice(0, 3).map((aId, idx) => {
              const profile = MOCK_PROFILES.find((p) => p.id === aId);
              const initials = profile ? profile.full_name.slice(0, 2).toUpperCase() : 'U';
              return (
                <div
                  key={idx}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[9px] font-bold text-zinc-700 ring-2 ring-white dark:bg-zinc-700 dark:text-zinc-200 dark:ring-zinc-900"
                  title={profile?.full_name || 'Assigned member'}
                >
                  {initials}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
