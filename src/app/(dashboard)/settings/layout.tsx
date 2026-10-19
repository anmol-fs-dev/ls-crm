'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings,
  Layers,
  Users,
  ShieldCheck,
  Trash2,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const navTabs = [
    {
      label: 'All Settings',
      href: '/settings',
      icon: Sliders,
      exact: true,
    },
    {
      label: 'Verticals & Pipelines',
      href: '/settings/verticals',
      icon: Layers,
    },
    {
      label: 'Team & Access',
      href: '/settings/team',
      icon: Users,
    },
    {
      label: 'Account & Security',
      href: '/settings/profile',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Settings Navigation Header */}
      <div className="border-b border-zinc-200 pb-0 dark:border-zinc-800">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Settings className="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
              <span>Workspace Settings</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage multi-vertical business lines, team access, security protocols, and system preferences.
            </p>
          </div>
        </div>

        {/* Horizontal Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-0 -mb-px">
          {navTabs.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400')} />
                <span>{tab.label}</span>
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 self-center mx-1" />
              <Link
                href="/recycle-bin"
                className="flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-xs sm:text-sm font-medium text-zinc-500 hover:text-rose-600 transition-colors whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Recycle Bin</span>
              </Link>
              <Link
                href="/audit-logs"
                className="flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-xs sm:text-sm font-medium text-zinc-500 hover:text-cyan-600 transition-colors whitespace-nowrap"
              >
                <ShieldAlert className="h-3.5 w-3.5 text-cyan-500" />
                <span>Audit Logs</span>
              </Link>
            </>
          )}
        </nav>
      </div>

      {/* Main Content Area */}
      <div>{children}</div>
    </div>
  );
}
