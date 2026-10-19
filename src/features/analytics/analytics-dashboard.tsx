'use client';

import * as React from 'react';
import {
  TrendingUp,
  DollarSign,
  Users2,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
  Layers,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  UserCheck,
  Building2,
  Briefcase,
} from 'lucide-react';
import { useVertical } from '@/context/vertical-context';
import { useCrmData } from '@/context/crm-data-context';
import { MOCK_PROFILES, MOCK_STAGES } from '@/lib/mock-data';
import { formatCurrency, formatDate, downloadCsv, sanitizeCsvCell } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type TimeframePreset = '7d' | '30d' | '90d' | 'ytd' | 'all';

export function AnalyticsDashboard() {
  const { verticals, selectedVertical, selectedVerticalId, setSelectedVerticalId } = useVertical();
  const { leads, customers, tasks, stages } = useCrmData();

  const [timeframe, setTimeframe] = React.useState<TimeframePreset>('30d');

  // Filter by timeframe
  const cutoffDate = React.useMemo(() => {
    const now = new Date();
    if (timeframe === '7d') return new Date(now.setDate(now.getDate() - 7));
    if (timeframe === '30d') return new Date(now.setDate(now.getDate() - 30));
    if (timeframe === '90d') return new Date(now.setDate(now.getDate() - 90));
    if (timeframe === 'ytd') return new Date(new Date().getFullYear(), 0, 1);
    return null; // 'all'
  }, [timeframe]);

  const activeLeads = React.useMemo(() => {
    return leads.filter((l) => {
      if (l.deleted_at) return false;
      if (cutoffDate && new Date(l.created_at) < cutoffDate) return false;
      return true;
    });
  }, [leads, cutoffDate]);

  const scopedLeads = React.useMemo(() => {
    if (selectedVerticalId === 'all') return activeLeads;
    return activeLeads.filter((l) => l.vertical_id === selectedVerticalId);
  }, [activeLeads, selectedVerticalId]);

  const scopedTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      if (t.deleted_at) return false;
      if (cutoffDate && new Date(t.created_at) < cutoffDate) return false;
      if (selectedVerticalId !== 'all' && t.vertical_id && t.vertical_id !== selectedVerticalId) {
        return false;
      }
      return true;
    });
  }, [tasks, selectedVerticalId, cutoffDate]);

  // Aggregate Key Metrics
  const totalPipelineValue = scopedLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  const wonLeads = scopedLeads.filter((l) => {
    const stg = stages.find((s) => s.id === l.stage_id) || MOCK_STAGES.find((s) => s.id === l.stage_id);
    return stg?.is_won || l.converted_to_customer_id;
  });

  const wonValue = wonLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  const conversionRate = scopedLeads.length > 0
    ? Math.round((wonLeads.length / scopedLeads.length) * 100)
    : 0;

  const avgDealSize = scopedLeads.length > 0
    ? Math.round(totalPipelineValue / scopedLeads.length)
    : 0;

  // Tasks metrics
  const completedTasks = scopedTasks.filter((t) => t.status === 'completed');
  const nowTime = Date.now();
  const overdueTasks = scopedTasks.filter(
    (t) => t.status !== 'completed' && t.due_date && new Date(t.due_date).getTime() < nowTime
  );

  // Vertical Breakdown (for rollup view)
  const verticalBreakdowns = React.useMemo(() => {
    return verticals.map((vert) => {
      const vLeads = activeLeads.filter((l) => l.vertical_id === vert.id);
      const vValue = vLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
      const vWon = vLeads.filter((l) => {
        const stg = stages.find((s) => s.id === l.stage_id) || MOCK_STAGES.find((s) => s.id === l.stage_id);
        return stg?.is_won || l.converted_to_customer_id;
      });
      const vWonValue = vWon.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
      const vConvRate = vLeads.length > 0 ? Math.round((vWon.length / vLeads.length) * 100) : 0;
      const vAvgDeal = vLeads.length > 0 ? Math.round(vValue / vLeads.length) : 0;

      return {
        vertical: vert,
        leadCount: vLeads.length,
        pipelineValue: vValue,
        wonValue: vWonValue,
        conversionRate: vConvRate,
        avgDealSize: vAvgDeal,
      };
    });
  }, [verticals, activeLeads, stages]);

  const maxVerticalValue = Math.max(1, ...verticalBreakdowns.map((v) => v.pipelineValue));

  // Funnel by Stages (for selected vertical or consolidated)
  const stageFunnel = React.useMemo(() => {
    const relevantStages = selectedVerticalId === 'all'
      ? stages.slice(0, 6)
      : stages.filter((s) => s.vertical_id === selectedVerticalId);

    const effectiveStages = relevantStages.length > 0 ? relevantStages : MOCK_STAGES.slice(0, 6);

    return effectiveStages.map((stg) => {
      const stageLeads = scopedLeads.filter((l) => l.stage_id === stg.id);
      const value = stageLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
      return {
        stage: stg,
        count: stageLeads.length,
        value,
      };
    });
  }, [stages, selectedVerticalId, scopedLeads]);

  const maxStageCount = Math.max(1, ...stageFunnel.map((s) => s.count));

  // Team Workload Metrics
  const teamWorkload = React.useMemo(() => {
    return MOCK_PROFILES.map((profile) => {
      const assignedLeads = scopedLeads.filter((l) => l.owner_id === profile.id);
      const leadValue = assignedLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
      const assignedTasks = scopedTasks.filter((t) => t.assignee_id === profile.id);
      const doneTasks = assignedTasks.filter((t) => t.status === 'completed');
      const lateTasks = assignedTasks.filter(
        (t) => t.status !== 'completed' && t.due_date && new Date(t.due_date).getTime() < nowTime
      );

      return {
        profile,
        leadCount: assignedLeads.length,
        leadValue,
        taskCount: assignedTasks.length,
        doneTasks: doneTasks.length,
        lateTasks: lateTasks.length,
      };
    });
  }, [scopedLeads, scopedTasks, nowTime]);

  // CSV Export Handler
  const handleExportCsv = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const scopeName = selectedVertical ? selectedVertical.slug : 'cross-vertical';
    const filename = `crm-analytics-${scopeName}-${timeframe}-${timestamp}.csv`;

    let csvContent = 'CRM PERFORMANCE & ANALYTICS REPORT\n';
    csvContent += `Generated At,${sanitizeCsvCell(new Date().toISOString())}\n`;
    csvContent += `Scope,${sanitizeCsvCell(selectedVertical ? selectedVertical.name : 'All Verticals')}\n`;
    csvContent += `Timeframe,${sanitizeCsvCell(timeframe.toUpperCase())}\n\n`;

    csvContent += 'KEY PERFORMANCE INDICATORS\n';
    csvContent += 'Metric,Value\n';
    csvContent += `Total Pipeline Value,${sanitizeCsvCell(totalPipelineValue)}\n`;
    csvContent += `Closed Won Revenue,${sanitizeCsvCell(wonValue)}\n`;
    csvContent += `Conversion Rate,${sanitizeCsvCell(conversionRate)}%\n`;
    csvContent += `Average Deal Size,${sanitizeCsvCell(avgDealSize)}\n`;
    csvContent += `Total Leads,${sanitizeCsvCell(scopedLeads.length)}\n`;
    csvContent += `Completed Tasks,${sanitizeCsvCell(completedTasks.length)}\n`;
    csvContent += `Overdue Tasks,${sanitizeCsvCell(overdueTasks.length)}\n\n`;

    csvContent += 'VERTICAL COMPARISON BREAKDOWN\n';
    csvContent += 'Vertical,Leads,Pipeline Value,Won Revenue,Conversion Rate,Avg Deal Size\n';
    for (const v of verticalBreakdowns) {
      csvContent += `${sanitizeCsvCell(v.vertical.name)},${sanitizeCsvCell(v.leadCount)},${sanitizeCsvCell(v.pipelineValue)},${sanitizeCsvCell(v.wonValue)},${sanitizeCsvCell(v.conversionRate)}%,${sanitizeCsvCell(v.avgDealSize)}\n`;
    }

    csvContent += '\nTEAM WORKLOAD & ASSIGNMENTS\n';
    csvContent += 'Member,Role,Assigned Leads,Pipeline Value,Total Tasks,Done Tasks,Overdue Tasks\n';
    for (const t of teamWorkload) {
      csvContent += `${sanitizeCsvCell(t.profile.full_name)},${sanitizeCsvCell(t.profile.role)},${sanitizeCsvCell(t.leadCount)},${sanitizeCsvCell(t.leadValue)},${sanitizeCsvCell(t.taskCount)},${sanitizeCsvCell(t.doneTasks)},${sanitizeCsvCell(t.lateTasks)}\n`;
    }

    downloadCsv(filename, csvContent);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Executive Analytics & Forecasting
            </h1>
            <Badge variant="outline" className="text-xs bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60">
              Live Data
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Cross-vertical performance, stage velocity, deal distribution, and team capacity.
          </p>
        </div>

        {/* Toolbar: Timeframe & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe Presets */}
          <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {(['7d', '30d', '90d', 'ytd', 'all'] as TimeframePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => setTimeframe(preset)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  timeframe === preset
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            className="h-8 gap-1.5 text-xs font-medium border-zinc-200 dark:border-zinc-800"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pipeline Value */}
        <Card className="border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/90">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Pipeline Value</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {formatCurrency(totalPipelineValue)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Across {scopedLeads.length} active opportunities
            </p>
          </CardContent>
        </Card>

        {/* Won Revenue */}
        <Card className="border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/90">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Closed Won Revenue</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {formatCurrency(wonValue)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {wonLeads.length} closed won deals
            </p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/90">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Conversion Rate</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <PieChart className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {conversionRate}%
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              Avg deal size: {formatCurrency(avgDealSize)}
            </p>
          </CardContent>
        </Card>

        {/* Tasks Velocity */}
        <Card className="border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/90">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Task Execution</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {completedTasks.length} / {scopedTasks.length}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              {overdueTasks.length > 0 ? (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {overdueTasks.length} tasks overdue
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">All on schedule</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cross-Vertical Rollup Matrix (Side-by-Side Comparison) */}
      <Card className="border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/90">
        <CardHeader className="border-b border-zinc-100 p-4 dark:border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-500" />
                Cross-Vertical Comparative Matrix
              </CardTitle>
              <CardDescription className="text-xs">
                Side-by-side revenue, pipeline depth, and conversion performance by business line.
              </CardDescription>
            </div>
            {selectedVerticalId !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedVerticalId('all')}
                className="h-7 text-xs text-indigo-600 hover:text-indigo-700"
              >
                Reset to All Verticals
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-3">
            {verticalBreakdowns.map((v) => {
              const barWidth = Math.max(5, Math.round((v.pipelineValue / maxVerticalValue) * 100));
              const isSelected = selectedVerticalId === v.vertical.id;

              return (
                <div
                  key={v.vertical.id}
                  onClick={() => setSelectedVerticalId(v.vertical.id)}
                  className={`group cursor-pointer rounded-xl p-3 border transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-zinc-100 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: v.vertical.color }}
                      />
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {v.vertical.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                        {v.leadCount} leads
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <span>Pipeline: {formatCurrency(v.pipelineValue)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Won: {formatCurrency(v.wonValue)}
                      </span>
                      <span className="text-zinc-400">({v.conversionRate}% win rate)</span>
                    </div>
                  </div>

                  {/* Visual comparison bar */}
                  <div className="h-2 w-full bg-zinc-200/60 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: v.vertical.color || '#3b82f6',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout: Stage Funnel & Team Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Funnel Chart */}
        <Card className="border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/90">
          <CardHeader className="border-b border-zinc-100 p-4 dark:border-zinc-800/80">
            <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              Pipeline Velocity & Stage Funnel
            </CardTitle>
            <CardDescription className="text-xs">
              Deal distribution and volume progressing through pipeline stages.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {stageFunnel.map((item, idx) => {
              const funnelWidth = Math.max(8, Math.round((item.count / maxStageCount) * 100));

              return (
                <div key={item.stage.id || idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-zinc-800 dark:text-zinc-200">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.stage.color || '#64748b' }}
                      />
                      <span>{item.stage.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.count} deals
                      </span>
                      <span>{formatCurrency(item.value)}</span>
                    </div>
                  </div>

                  <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all duration-500"
                      style={{
                        width: `${funnelWidth}%`,
                        backgroundColor: item.stage.color || '#3b82f6',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Team Workload & Allocation */}
        <Card className="border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/90">
          <CardHeader className="border-b border-zinc-100 p-4 dark:border-zinc-800/80">
            <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-purple-500" />
              Team Workload & Capacity
            </CardTitle>
            <CardDescription className="text-xs">
              Opportunities and action items assigned per team member.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {teamWorkload.map((member) => (
              <div
                key={member.profile.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                    {member.profile.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {member.profile.full_name}
                    </p>
                    <p className="text-[10px] text-zinc-400 capitalize">{member.profile.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {member.leadCount} leads
                    </span>
                    <p className="text-[10px] text-zinc-400">{formatCurrency(member.leadValue)}</p>
                  </div>
                  <div className="border-l border-zinc-200 dark:border-zinc-800 pl-4">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {member.doneTasks}/{member.taskCount} tasks
                    </span>
                    {member.lateTasks > 0 ? (
                      <p className="text-[10px] text-red-500 font-medium">{member.lateTasks} overdue</p>
                    ) : (
                      <p className="text-[10px] text-emerald-500">On track</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
