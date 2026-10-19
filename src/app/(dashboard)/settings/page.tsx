'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Layers,
  Users,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Sliders,
  Sparkles,
  ArrowRight,
  Activity,
  Laptop,
  Sun,
  Moon,
  Keyboard,
  RefreshCw,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/auth-context';
import { useVertical } from '@/context/vertical-context';
import { useCrmData } from '@/context/crm-data-context';
import { useProject } from '@/context/project-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export default function SettingsHubPage() {
  const { user, profiles, role, switchDemoUser } = useAuth();
  const { verticals, selectedVerticalId, setSelectedVerticalId } = useVertical();
  const { leads, customers, tasks, stages } = useCrmData();
  const { cards } = useProject();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = React.useState(false);
  const [isPinging, setIsPinging] = React.useState(false);
  const [pingResult, setPingResult] = React.useState<{ status: 'ok' | 'error'; latency: number } | null>(null);

  const activeProfiles = React.useMemo(() => {
    return profiles.filter((p) => !p.deleted_at && p.is_active);
  }, [profiles]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const deletedLeadsCount = leads.filter((l) => Boolean(l.deleted_at)).length;
  const deletedCustomersCount = customers.filter((c) => Boolean(c.deleted_at)).length;
  const deletedTasksCount = tasks.filter((t) => Boolean(t.deleted_at)).length;
  const deletedCardsCount = cards.filter((c) => Boolean(c.deleted_at)).length;
  const totalTrashCount =
    deletedLeadsCount +
    deletedCustomersCount +
    deletedTasksCount +
    deletedCardsCount;

  const activeVerticals = verticals.filter((v) => v.status === 'active');

  const handlePingHealth = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/crm?table=verticals');
      const latency = Math.round(performance.now() - start);
      if (res.ok) {
        setPingResult({ status: 'ok', latency });
      } else {
        setPingResult({ status: 'error', latency });
      }
    } catch {
      setPingResult({ status: 'error', latency: Math.round(performance.now() - start) });
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl pb-12">
      {/* Overview & Security Status Hero */}
      <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-zinc-100 p-6 shadow-xs dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xl font-bold text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900">
              {user?.full_name?.substring(0, 1) || 'A'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {user?.full_name || 'CRM Administrator'}
                </h2>
                <Badge
                  variant="outline"
                  className="capitalize font-semibold text-xs border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                >
                  {role} Access
                </Badge>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                  <ShieldCheck className="h-3 w-3 mr-1 inline" />
                  Account Active
                </Badge>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {user?.email} • Organization: <span className="font-medium text-zinc-700 dark:text-zinc-300">Multi-Vertical Company CRM</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Supabase RLS Protected
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-amber-500" />
                  Sliding-Window Rate Limiting (100 req/min)
                </span>
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3 w-3 text-cyan-500" />
                  Keep-Alive Heartbeat Enabled
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePingHealth}
              disabled={isPinging}
              className="text-xs gap-1.5 bg-white dark:bg-zinc-900"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? 'Pinging DB...' : 'Test Connection'}</span>
            </Button>
            {pingResult && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  pingResult.status === 'ok'
                    ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'border-red-500/30 text-red-600'
                }`}
              >
                {pingResult.status === 'ok'
                  ? `Connected (${pingResult.latency}ms)`
                  : 'Connection Alert'}
              </Badge>
            )}
            <Button asChild size="sm" className="text-xs gap-1.5">
              <Link href="/settings/verticals">
                <Sliders className="h-3.5 w-3.5" />
                <span>Quick Manage</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of All Setting Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Category 1: Verticals & Pipelines */}
        <Card className="flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Layers className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                {activeVerticals.length} Active
              </Badge>
            </div>
            <CardTitle className="mt-3 text-base font-semibold">
              Business Verticals & Pipelines
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Configure multi-vertical business lines, custom branding colors, icons, and customized deal stages per vertical.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {activeVerticals.slice(0, 4).map((v) => (
                <span
                  key={v.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: v.color }} />
                  {v.name}
                </span>
              ))}
              {activeVerticals.length > 4 && (
                <span className="text-[11px] text-zinc-400 self-center">
                  +{activeVerticals.length - 4} more
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Total Stages Configured: <span className="font-semibold text-zinc-700 dark:text-zinc-200">{stages.length}</span>
            </div>
          </CardContent>
          <CardFooter className="pt-0 border-t border-zinc-100 dark:border-zinc-800/60 mt-auto flex justify-between items-center py-3">
            <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              <Link href="/settings/verticals">
                <span>Configure Verticals & Stages</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Category 2: Team Members & RBAC */}
        <Card className="flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Users className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                {activeProfiles.length} Members
              </Badge>
            </div>
            <CardTitle className="mt-3 text-base font-semibold">
              Team & Role-Based Access (RBAC)
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Manage organization members, send email invitations, and assign vertical-specific visibility scopes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center -space-x-2 overflow-hidden">
              {activeProfiles.map((p) => (
                <div
                  key={p.id}
                  title={`${p.full_name} (${p.role})`}
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white dark:ring-zinc-950 bg-zinc-800 text-white text-[10px] font-bold flex items-center justify-center"
                >
                  {p.full_name.substring(0, 1)}
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-zinc-500">Quick Testing Role Switcher:</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {activeProfiles.map((p) => (
                  <Button
                    key={p.id}
                    variant={user?.id === p.id ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 px-2 text-[10px] capitalize"
                    onClick={() => switchDemoUser(p.id)}
                  >
                    {p.role}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0 border-t border-zinc-100 dark:border-zinc-800/60 mt-auto flex justify-between items-center py-3">
            <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              <Link href="/settings/team">
                <span>Manage Team & Access Scopes</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Category 3: Account & Profile */}
        <Card className="flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-zinc-600 dark:text-zinc-400 text-xs">
                Active Session
              </Badge>
            </div>
            <CardTitle className="mt-3 text-base font-semibold">
              Account & Profile Settings
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Manage your personal display name, email credentials, password security, and active sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900 text-xs space-y-1">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span>Display Name:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{user?.full_name}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span>Email:</span>
                <span className="text-zinc-500">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span>Account Status:</span>
                <span className="text-emerald-600 font-medium">Verified Active</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0 border-t border-zinc-100 dark:border-zinc-800/60 mt-auto flex justify-between items-center py-3">
            <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-medium group-hover:text-amber-600 dark:group-hover:text-amber-400">
              <Link href="/settings/profile">
                <span>Manage Profile & Password</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Category 4: Appearance & Workspace Preferences */}
        <Card className="flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs capitalize font-normal">
                {mounted ? theme || 'system' : 'theme'}
              </Badge>
            </div>
            <CardTitle className="mt-3 text-base font-semibold">
              Appearance & Display
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Customize interface color theme, default startup vertical, and table visual density.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1.5">
                Theme Mode
              </Label>
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className="h-7 text-xs gap-1"
                >
                  <Sun className="h-3 w-3" />
                  <span>Light</span>
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className="h-7 text-xs gap-1"
                >
                  <Moon className="h-3 w-3" />
                  <span>Dark</span>
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                  className="h-7 text-xs gap-1"
                >
                  <Laptop className="h-3 w-3" />
                  <span>System</span>
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1.5">
                Active Workspace Vertical
              </Label>
              <select
                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                value={selectedVerticalId}
                onChange={(e) => setSelectedVerticalId(e.target.value)}
              >
                <option value="all">All Verticals (Unified Workspace)</option>
                {activeVerticals.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
          <CardFooter className="pt-0 border-t border-zinc-100 dark:border-zinc-800/60 mt-auto flex justify-between items-center py-3">
            <span className="text-[11px] text-zinc-400">Settings auto-saved</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </CardFooter>
        </Card>

        {/* Category 5: Data Recovery (Recycle Bin) */}
        <Card className="flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <Badge variant="outline" className={totalTrashCount > 0 ? 'border-rose-400 text-rose-600' : 'text-zinc-500'}>
                {totalTrashCount} in Trash
              </Badge>
            </div>
            <CardTitle className="mt-3 text-base font-semibold">
              Recycle Bin & Data Protection
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Enterprise soft-delete safety net. Recover accidentally removed leads, customers, and tasks, or purge permanently.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900 space-y-1">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Deleted Leads:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{deletedLeadsCount}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Deleted Customers:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{deletedCustomersCount}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Deleted Tasks & Cards:</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{deletedTasksCount + deletedCardsCount}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0 border-t border-zinc-100 dark:border-zinc-800/60 mt-auto flex justify-between items-center py-3">
            <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-medium group-hover:text-rose-600 dark:group-hover:text-rose-400">
              <Link href="/recycle-bin">
                <span>Open Recycle Bin</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Category 6: Audit Logs & Security Trail */}
        <Card className="flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs group">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                Live Audit Stream
              </Badge>
            </div>
            <CardTitle className="mt-3 text-base font-semibold">
              Compliance & Audit Trail
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Immutable chronological record of all data changes, logins, stage movements, and field edits with JSON diffs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-zinc-500 dark:text-zinc-400">
              Captures actor identity, IP address, user agent, timestamp, before/after record snapshots, and action category.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline" className="text-[10px]">INSERT</Badge>
              <Badge variant="outline" className="text-[10px]">UPDATE</Badge>
              <Badge variant="outline" className="text-[10px]">DELETE</Badge>
              <Badge variant="outline" className="text-[10px]">CONVERT</Badge>
            </div>
          </CardContent>
          <CardFooter className="pt-0 border-t border-zinc-100 dark:border-zinc-800/60 mt-auto flex justify-between items-center py-3">
            <Button asChild variant="ghost" size="sm" className="w-full justify-between text-xs font-medium group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
              <Link href="/audit-logs">
                <span>Inspect Audit Trail</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Enterprise Security & System Specifications */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base font-semibold">
              System Infrastructure & Hardening Status
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Core enterprise security configurations, database connections, and operational health status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <span className="text-zinc-500 block mb-1">PostgreSQL Database</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Supabase Cloud (REST)
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block">Tables with RLS Enabled</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <span className="text-zinc-500 block mb-1">Rate Limiter</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Sliding-Window Active
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block">100 write / 200 read per min</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <span className="text-zinc-500 block mb-1">Keep-Alive Heartbeat</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                GitHub Actions Cron
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block">Prevents free-tier pause</span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
              <span className="text-zinc-500 block mb-1">Keyboard Shortcuts</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Keyboard className="h-3.5 w-3.5 text-zinc-500" />
                Global Palette Enabled
              </span>
              <span className="text-[11px] text-zinc-400 mt-1 block">Press ⌘K or ? anywhere</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
