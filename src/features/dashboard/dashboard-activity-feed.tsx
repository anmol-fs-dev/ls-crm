'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  Shuffle,
  UserCheck,
  Activity as ActivityIcon,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Activity, Vertical } from '@/types/custom.types';
import { formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DashboardActivityFeedProps {
  activities: Activity[];
  verticals: Vertical[];
}

const TYPE_CONFIG: Record<
  Activity['activity_type'],
  { icon: React.ElementType; colorClass: string; label: string }
> = {
  note: { icon: MessageSquare, colorClass: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50', label: 'Note' },
  call: { icon: Phone, colorClass: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50', label: 'Call' },
  email: { icon: Mail, colorClass: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50', label: 'Email' },
  meeting: { icon: Calendar, colorClass: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50', label: 'Meeting' },
  stage_change: { icon: Shuffle, colorClass: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50', label: 'Stage Move' },
  status_change: { icon: Shuffle, colorClass: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50', label: 'Status Change' },
  converted: { icon: UserCheck, colorClass: 'text-teal-500 bg-teal-50 dark:bg-teal-950/50', label: 'Converted' },
  system: { icon: ActivityIcon, colorClass: 'text-zinc-500 bg-zinc-50 dark:bg-zinc-800', label: 'System' },
};

export function DashboardActivityFeed({ activities, verticals }: DashboardActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-zinc-400">
        No recent activity logged yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((act) => {
        const config = TYPE_CONFIG[act.activity_type] || TYPE_CONFIG.system;
        const Icon = config.icon;
        const vertical = verticals.find((v) => v.id === act.vertical_id);

        const entityLink =
          act.entity_type === 'lead'
            ? `/leads/${act.entity_id}`
            : act.entity_type === 'customer'
            ? `/customers/${act.entity_id}`
            : act.entity_type === 'task'
            ? `/tasks`
            : `/projects`;

        return (
          <div
            key={act.id}
            className="flex items-start gap-3 rounded-lg border border-zinc-100 p-2.5 transition-colors hover:bg-zinc-50/70 dark:border-zinc-800 dark:hover:bg-zinc-900/40 text-xs"
          >
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${config.colorClass}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {act.title}
                  </span>
                  {vertical && (
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: vertical.color }}
                      title={vertical.name}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0 font-mono">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(act.created_at)}</span>
                </div>
              </div>

              {act.description && (
                <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                  {act.description}
                </p>
              )}

              <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
                <span className="capitalize">{act.entity_type}</span>
                <Link
                  href={entityLink}
                  className="flex items-center gap-0.5 font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <span>View</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
