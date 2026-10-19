'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Users2,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Briefcase,
  Layers,
  GraduationCap,
  Users,
  Cloud,
  BookOpen,
  Calendar,
  BarChart3,
  Activity as ActivityIcon,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useVertical } from '@/context/vertical-context';
import { useAuth } from '@/context/auth-context';
import { useCrmData } from '@/context/crm-data-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { MOCK_STAGES } from '@/lib/mock-data';
import { DashboardStageChart } from '@/features/dashboard/dashboard-stage-chart';
import { DashboardActivityFeed } from '@/features/dashboard/dashboard-activity-feed';

const ICON_MAP: Record<string, React.ElementType> = {
  'graduation-cap': GraduationCap,
  GraduationCap: GraduationCap,
  users: Users,
  Users: Users,
  cloud: Cloud,
  Cloud: Cloud,
  'book-open': BookOpen,
  BookOpen: BookOpen,
  briefcase: Briefcase,
  Briefcase: Briefcase,
};

export default function DashboardPage() {
  const { selectedVertical, selectedVerticalId, setSelectedVerticalId, verticals } = useVertical();
  const { user, role } = useAuth();
  const { leads, tasks, customers, activities, stages } = useCrmData();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Filter leads based on selected vertical
  const filteredLeads = React.useMemo(() => {
    const active = leads.filter((l) => !l.deleted_at);
    if (selectedVerticalId === 'all') return active;
    return active.filter((l) => l.vertical_id === selectedVerticalId);
  }, [selectedVerticalId, leads]);

  // Filter tasks based on selected vertical
  const filteredTasks = React.useMemo(() => {
    const active = tasks.filter((t) => !t.deleted_at);
    if (selectedVerticalId === 'all') return active;
    return active.filter((t) => !t.vertical_id || t.vertical_id === selectedVerticalId);
  }, [selectedVerticalId, tasks]);

  // Compute metrics
  const totalPipelineValue = filteredLeads.reduce((acc, l) => acc + (l.estimated_value || 0), 0);

  const wonLeads = filteredLeads.filter((l) => {
    const stg = stages.find((s) => s.id === l.stage_id) || MOCK_STAGES.find((s) => s.id === l.stage_id);
    return stg?.is_won || l.converted_to_customer_id;
  });

  const wonValue = wonLeads.reduce((acc, l) => acc + (l.estimated_value || 0), 0);
  const conversionRate = filteredLeads.length > 0
    ? Math.round((wonLeads.length / filteredLeads.length) * 100)
    : 0;

  // New Leads This Week
  const newLeadsThisWeek = React.useMemo(() => {
    if (!mounted) return [];
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return filteredLeads.filter((l) => new Date(l.created_at).getTime() >= oneWeekAgo);
  }, [filteredLeads, mounted]);

  // Tasks Due Today & Overdue
  const { tasksDueToday, overdueTasks, pendingTasks } = React.useMemo(() => {
    if (!mounted) {
      return { tasksDueToday: [], overdueTasks: [], pendingTasks: [] };
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTime = Date.now();

    const pending = filteredTasks.filter((t) => t.status !== 'completed');
    const dueToday = pending.filter((t) => t.due_date && t.due_date.slice(0, 10) === todayStr);
    const overdue = pending.filter((t) => t.due_date && new Date(t.due_date).getTime() < nowTime);

    return { tasksDueToday: dueToday, overdueTasks: overdue, pendingTasks: pending };
  }, [filteredTasks, mounted]);

  // Stage Chart Data for Recharts
  const stageChartData = React.useMemo(() => {
    const relevantStages = selectedVerticalId === 'all'
      ? stages.slice(0, 6)
      : stages.filter((s) => s.vertical_id === selectedVerticalId);

    const effectiveStages = relevantStages.length > 0 ? relevantStages : MOCK_STAGES.slice(0, 6);

    return effectiveStages.map((stg) => {
      const stageLeads = filteredLeads.filter((l) => l.stage_id === stg.id);
      const val = stageLeads.reduce((acc, l) => acc + (l.estimated_value || 0), 0);
      return {
        name: stg.name,
        deals: stageLeads.length,
        value: val,
        color: stg.color || '#3b82f6',
      };
    });
  }, [stages, selectedVerticalId, filteredLeads]);

  // Filtered recent activities
  const recentActivities = React.useMemo(() => {
    return activities
      .filter((a) => selectedVerticalId === 'all' || !a.vertical_id || a.vertical_id === selectedVerticalId)
      .slice(0, 6);
  }, [activities, selectedVerticalId]);

  return (
    <div className="space-y-6">
      {/* Welcome & Action Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Executive'}
            </h1>
            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
              {role}
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Viewing {selectedVertical ? `${selectedVertical.name} business vertical overview` : 'consolidated cross-vertical company metrics'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-zinc-200 dark:border-zinc-800">
            <Link href="/analytics">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
              <span>Full Analytics</span>
            </Link>
          </Button>

          <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs border-zinc-200 dark:border-zinc-800">
            <Link href="/tasks?action=new">
              <Plus className="h-3.5 w-3.5" />
              <span>New Task</span>
            </Link>
          </Button>

          <Button asChild size="sm" className="h-8 gap-1.5 text-xs bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
            <Link href="/leads?action=new">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Lead</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Dynamic Vertical Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedVerticalId('all')}
          className={`flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0 cursor-pointer ${
            selectedVerticalId === 'all'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <Layers className="h-3 w-3" />
          <span>All Verticals ({verticals.length})</span>
        </button>
        {verticals
          .filter((v) => v.status === 'active')
          .map((vert) => {
            const isSelected = selectedVerticalId === vert.id;
            const VertIcon = (vert.icon && ICON_MAP[vert.icon]) || Briefcase;
            return (
              <button
                key={vert.id}
                onClick={() => setSelectedVerticalId(vert.id)}
                className={`flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  isSelected
                    ? 'text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                }`}
                style={isSelected ? { backgroundColor: vert.color } : {}}
              >
                <VertIcon className="h-3 w-3" />
                <span>{vert.name}</span>
              </button>
            );
          })}
      </div>

      {/* 6 Core Phase 6 KPI Stat Tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* 1. Total Pipeline Value */}
        <Card className="shadow-2xs border-zinc-200/80 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3.5">
            <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Pipeline Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatCurrency(totalPipelineValue)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 truncate">
              {filteredLeads.length} active opportunities
            </p>
          </CardContent>
        </Card>

        {/* 2. Won Revenue */}
        <Card className="shadow-2xs border-zinc-200/80 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3.5">
            <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Won Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatCurrency(wonValue)}
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {wonLeads.length} closed won deals
            </p>
          </CardContent>
        </Card>

        {/* 3. Conversion Rate */}
        <Card className="shadow-2xs border-zinc-200/80 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3.5">
            <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Conversion Rate
            </CardTitle>
            <Sparkles className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {conversionRate}%
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 truncate">
              Lead → Deal win rate
            </p>
          </CardContent>
        </Card>

        {/* 4. New Leads This Week */}
        <Card className="shadow-2xs border-zinc-200/80 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3.5">
            <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              New Leads (7d)
            </CardTitle>
            <Users2 className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              +{newLeadsThisWeek.length}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 truncate">
              Added this week
            </p>
          </CardContent>
        </Card>

        {/* 5. Tasks Due Today */}
        <Card className="shadow-2xs border-zinc-200/80 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3.5">
            <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Due Today
            </CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {tasksDueToday.length}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 truncate">
              Action items due today
            </p>
          </CardContent>
        </Card>

        {/* 6. Overdue Tasks */}
        <Card className="shadow-2xs border-zinc-200/80 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 p-3.5">
            <CardTitle className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Overdue Tasks
            </CardTitle>
            {overdueTasks.length > 0 ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className={`text-xl font-bold tracking-tight ${overdueTasks.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-50'}`}>
              {overdueTasks.length}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1 truncate">
              {overdueTasks.length > 0 ? 'Immediate action required' : 'All tasks on schedule'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Chart: Leads by Pipeline Stage (Recharts) */}
      <Card className="shadow-2xs border-zinc-200/80 dark:border-zinc-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <span>Pipeline Stage Distribution & Deal Volume</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Deals progressing across sales pipeline stages for {selectedVertical ? selectedVertical.name : 'all business verticals'}.
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1 mt-2 sm:mt-0">
            <Link href="/leads">
              <span>View Pipeline Kanban</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <DashboardStageChart data={stageChartData} />
        </CardContent>
      </Card>

      {/* Main Content Grid: Recent Activity Stream & Opportunities / Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity Timeline Stream */}
        <Card className="shadow-2xs border-zinc-200/80 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ActivityIcon className="h-4 w-4 text-teal-500" />
                <span>Recent Activity Feed</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time stream of stage movements, conversions, and client notes
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            <DashboardActivityFeed activities={recentActivities} verticals={verticals} />
          </CardContent>
        </Card>

        {/* Priority Action Tasks & Deals */}
        <div className="space-y-6">
          {/* Recent Opportunities */}
          <Card className="shadow-2xs border-zinc-200/80 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">Active Opportunities</CardTitle>
                <CardDescription className="text-xs">
                  Highest-value active deals in pipeline
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Link href="/leads">
                  <span>View all</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredLeads.slice(0, 3).map((lead) => {
                const stage = stages.find((s) => s.id === lead.stage_id) || MOCK_STAGES.find((s) => s.id === lead.stage_id);
                const vertical = verticals.find((v) => v.id === lead.vertical_id);
                return (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-md border border-zinc-100 p-2.5 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
                  >
                    <div className="flex flex-col truncate pr-2">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-xs font-semibold text-zinc-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400 truncate"
                        >
                          {lead.name}
                        </Link>
                        {vertical && (
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: vertical.color }}
                            title={vertical.name}
                          />
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {lead.company || lead.email || 'Direct Inquiry'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 font-mono">
                        {formatCurrency(lead.estimated_value)}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-5 py-0">
                        {stage?.name || 'In Progress'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Priority Tasks */}
          <Card className="shadow-2xs border-zinc-200/80 dark:border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">Priority Action Items</CardTitle>
                <CardDescription className="text-xs">
                  Tasks requiring attention or follow-up
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Link href="/tasks">
                  <span>View all</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredTasks.slice(0, 3).map((task) => {
                const isOverdue = mounted && task.due_date && new Date(task.due_date).getTime() < Date.now();
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md border border-zinc-100 p-2.5 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50"
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {task.title}
                      </span>
                      <span className="text-[11px] text-zinc-500 truncate mt-0.5">
                        Due {formatDate(task.due_date)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Badge
                        variant={
                          task.priority === 'urgent'
                            ? 'destructive'
                            : task.priority === 'high'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-[10px] uppercase h-5 py-0"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
