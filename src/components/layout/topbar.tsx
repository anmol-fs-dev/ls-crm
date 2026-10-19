'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
  Sun,
  Moon,
  Search,
  UserCheck,
  ShieldCheck,
  LogOut,
  Settings as SettingsIcon,
  Sparkles,
  Bell,
  AlertCircle,
  Clock,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import Link from 'next/link';
import { useVertical } from '@/context/vertical-context';
import { useAuth } from '@/context/auth-context';
import { useCrmData } from '@/context/crm-data-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Topbar({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) {
  const { theme, setTheme } = useTheme();
  const { selectedVertical, selectedVerticalId } = useVertical();
  const { user, profiles, role, switchDemoUser, logout } = useAuth();
  const { tasks } = useCrmData();

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const overdueTasks = React.useMemo(() => {
    if (!mounted) return [];
    const now = Date.now();
    return tasks.filter((t) => {
      if (t.deleted_at || t.status === 'completed') return false;
      if (selectedVerticalId !== 'all' && t.vertical_id && t.vertical_id !== selectedVerticalId) {
        return false;
      }
      return t.due_date && new Date(t.due_date).getTime() < now;
    });
  }, [tasks, selectedVerticalId, mounted]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Left: Active Vertical & Context Indicator */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          {selectedVertical ? (
            <>
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: selectedVertical.color }}
              />
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {selectedVertical.name}
              </span>
              <Badge variant="secondary" className="text-[10px] uppercase font-mono tracking-wider h-5">
                {selectedVertical.slug}
              </Badge>
            </>
          ) : (
            <>
              <div className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                All Verticals
              </span>
              <Badge variant="outline" className="text-[10px] text-zinc-500 h-5">
                Global View
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Center: Command Palette Trigger Button */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <button
          onClick={onOpenCommandPalette}
          className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500 shadow-2xs hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400 dark:hover:border-zinc-700 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <Search className="h-3.5 w-3.5" />
            <span>Search leads, customers, tasks...</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-zinc-200 bg-white px-1.5 font-mono text-[10px] font-medium text-zinc-500 opacity-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right: Role Switcher & Controls */}
      <div className="flex items-center space-x-2">
        {/* Quick Role Tester Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-dashed">
              <UserCheck className="h-3.5 w-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Role:</span>
              <span className="font-semibold capitalize text-zinc-900 dark:text-zinc-100">{role}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center justify-between text-xs">
              <span>Switch Testing Role</span>
              <Sparkles className="h-3 w-3 text-amber-500" />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={user?.id} onValueChange={(val) => switchDemoUser(val)}>
              {profiles
                .filter((profile) => !profile.deleted_at && profile.is_active)
                .map((profile) => (
                  <DropdownMenuRadioItem key={profile.id} value={profile.id} className="cursor-pointer">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{profile.full_name}</span>
                      <span className="text-[10px] text-zinc-500 capitalize">{profile.role} • {profile.email}</span>
                    </div>
                  </DropdownMenuRadioItem>
                ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* In-App Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 text-zinc-600 dark:text-zinc-300"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {mounted && overdueTasks.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-white dark:ring-zinc-950">
                  {overdueTasks.length > 9 ? '9+' : overdueTasks.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0 shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">In-App Notifications</span>
                {mounted && overdueTasks.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                    {overdueTasks.length} Overdue
                  </Badge>
                )}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
              {mounted && overdueTasks.length > 0 ? (
                overdueTasks.map((t) => (
                  <Link
                    key={t.id}
                    href="/tasks"
                    className="flex items-start space-x-2.5 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {t.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-zinc-500">
                        <span className="capitalize text-red-600 font-medium">{t.priority} Priority</span>
                        <span>•</span>
                        <span>Overdue</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-6 text-center text-zinc-500 text-xs">
                  No unread alerts. You are all caught up!
                </div>
              )}
            </div>

            <div className="border-t border-zinc-100 p-2 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <Button asChild variant="ghost" size="sm" className="w-full text-xs justify-center gap-1.5 h-7">
                <Link href="/tasks">
                  <span>View All Action Items</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-600 dark:text-zinc-300"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-zinc-200 dark:border-zinc-800">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
                {user?.full_name?.substring(0, 1) || 'U'}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-medium leading-none text-zinc-900 dark:text-zinc-100">
                  {user?.full_name}
                </p>
                <p className="text-[11px] leading-none text-zinc-500 dark:text-zinc-400">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer flex items-center text-xs">
                <Sliders className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                <span>All Settings & Preferences</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings/profile" className="cursor-pointer flex items-center text-xs">
                <SettingsIcon className="mr-2 h-3.5 w-3.5" />
                <span>Account & Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-xs text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
