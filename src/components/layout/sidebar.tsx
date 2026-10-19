'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users2,
  Building2,
  CheckSquare,
  Kanban,
  BarChart3,
  Trash2,
  Settings,
  ChevronDown,
  Layers,
  GraduationCap,
  Users,
  Cloud,
  BookOpen,
  Briefcase,
  PanelLeftClose,
  PanelLeftOpen,
  PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVertical } from '@/context/vertical-context';
import { useAuth } from '@/context/auth-context';
import { useCrmData } from '@/context/crm-data-context';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  layers: Layers,
};

export function Sidebar() {
  const pathname = usePathname();
  const { verticals, selectedVertical, selectedVerticalId, setSelectedVerticalId } = useVertical();
  const { user, role, isAdmin } = useAuth();
  const { tasks } = useCrmData();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const overdueCount = React.useMemo(() => {
    if (!mounted) return 0;
    const now = Date.now();
    return tasks.filter((t) => {
      if (t.deleted_at || t.status === 'completed') return false;
      if (selectedVerticalId !== 'all' && t.vertical_id && t.vertical_id !== selectedVerticalId) {
        return false;
      }
      return t.due_date && new Date(t.due_date).getTime() < now;
    }).length;
  }, [tasks, selectedVerticalId, mounted]);

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Leads', href: '/leads', icon: Users2 },
    { label: 'Customers', href: '/customers', icon: Building2 },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Projects', href: '/projects', icon: Kanban },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    ...(isAdmin ? [{ label: 'Recycle Bin', href: '/recycle-bin', icon: Trash2 }] : []),
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const activeVerticals = verticals.filter((v) => v.status === 'active');

  const CurrentVerticalIcon = selectedVertical?.icon && ICON_MAP[selectedVertical.icon]
    ? ICON_MAP[selectedVertical.icon]
    : Layers;

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-zinc-200 bg-zinc-50/50 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950/50',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Workspace Header & Vertical Switcher */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 px-3 dark:border-zinc-800">
        {!collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-semibold hover:bg-zinc-200/60 focus:outline-none dark:hover:bg-zinc-800/60">
              <div className="flex items-center space-x-2.5 truncate">
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white shadow-xs"
                  style={{ backgroundColor: selectedVertical?.color || '#3b82f6' }}
                >
                  <CurrentVerticalIcon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex flex-col truncate leading-tight">
                  <span className="truncate text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedVertical ? selectedVertical.name : 'All Verticals'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-normal">
                    {selectedVertical ? 'Vertical Workspace' : 'Global Workspace'}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-zinc-400">
                Switch Vertical
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setSelectedVerticalId('all')}
                className={cn(
                  'flex items-center space-x-2 cursor-pointer',
                  selectedVerticalId === 'all' && 'bg-zinc-100 font-semibold dark:bg-zinc-800'
                )}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-zinc-800 text-white">
                  <Layers className="h-3 w-3" />
                </div>
                <span className="flex-1 text-xs">All Verticals</span>
                {selectedVerticalId === 'all' && <Badge variant="outline" className="text-[10px] h-4">Active</Badge>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {activeVerticals.map((vert) => {
                const VertIcon = (vert.icon && ICON_MAP[vert.icon]) || Briefcase;
                const isSelected = selectedVerticalId === vert.id;
                return (
                  <DropdownMenuItem
                    key={vert.id}
                    onClick={() => setSelectedVerticalId(vert.id)}
                    className={cn(
                      'flex items-center space-x-2 cursor-pointer',
                      isSelected && 'bg-zinc-100 font-semibold dark:bg-zinc-800'
                    )}
                  >
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-sm text-white"
                      style={{ backgroundColor: vert.color }}
                    >
                      <VertIcon className="h-3 w-3" />
                    </div>
                    <span className="flex-1 text-xs truncate">{vert.name}</span>
                    {isSelected && <Badge variant="outline" className="text-[10px] h-4">Active</Badge>}
                  </DropdownMenuItem>
                );
              })}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings/verticals" className="flex items-center space-x-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs">
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Manage Verticals...</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div
            className="flex h-8 w-8 mx-auto items-center justify-center rounded-md text-white shadow-xs"
            style={{ backgroundColor: selectedVertical?.color || '#3b82f6' }}
            title={selectedVertical ? selectedVertical.name : 'All Verticals'}
          >
            <CurrentVerticalIcon className="h-4 w-4 text-white" />
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          const isTasksItem = item.href === '/tasks';
          const showOverdueBadge = isTasksItem && mounted && overdueCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? `${item.label}${showOverdueBadge ? ` (${overdueCount} overdue)` : ''}` : undefined}
              className={cn(
                'group flex items-center rounded-md px-2.5 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-zinc-200/80 text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50',
                collapsed && 'justify-center px-0'
              )}
            >
              {collapsed ? (
                <div className="relative flex items-center justify-center">
                  <Icon className={cn('h-4 w-4 shrink-0', isActive && 'text-zinc-900 dark:text-zinc-100')} />
                  {showOverdueBadge && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white dark:ring-zinc-950" />
                  )}
                </div>
              ) : (
                <>
                  <Icon className={cn('h-4 w-4 shrink-0 mr-2.5', isActive && 'text-zinc-900 dark:text-zinc-100')} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {showOverdueBadge && (
                    <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
                      {overdueCount}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle & User Profile Card */}
      <div className="border-t border-zinc-200 p-2 dark:border-zinc-800">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'flex w-full items-center rounded-md p-1.5 text-xs text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 mb-2',
            collapsed ? 'justify-center' : 'justify-between px-2'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {!collapsed && <span>Collapse Sidebar</span>}
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>

        {!collapsed && user && (
          <div className="flex items-center space-x-2.5 rounded-md bg-zinc-100/70 p-2 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              {user.full_name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col truncate leading-none">
              <span className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {user.full_name}
              </span>
              <div className="mt-1 flex items-center space-x-1.5">
                <Badge
                  variant={role === 'owner' || role === 'admin' ? 'default' : 'secondary'}
                  className="text-[9px] uppercase tracking-wide px-1.5 py-0 h-4"
                >
                  {role}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
