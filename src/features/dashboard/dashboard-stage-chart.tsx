'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface StageChartItem {
  name: string;
  deals: number;
  value: number;
  color: string;
}

interface DashboardStageChartProps {
  data: StageChartItem[];
}

export function DashboardStageChart({ data }: DashboardStageChartProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-56 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center text-xs text-zinc-400">
        Loading chart visualization...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-56 w-full flex items-center justify-center text-xs text-zinc-400">
        No stage pipeline data available
      </div>
    );
  }

  return (
    <div className="h-56 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-zinc-200/60 dark:text-zinc-800/60" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-zinc-500 dark:text-zinc-400 font-medium"
            interval={0}
            angle={-15}
            textAnchor="end"
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-zinc-400 dark:text-zinc-500 font-mono"
          />
          <Tooltip
            cursor={{ fill: 'currentColor', opacity: 0.05 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as StageChartItem;
                return (
                  <div className="rounded-lg border border-zinc-200 bg-white p-2.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <div className="space-y-0.5 text-zinc-500 dark:text-zinc-400">
                      <div>
                        Deals:{' '}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.deals}
                        </span>
                      </div>
                      <div>
                        Volume:{' '}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="deals" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
