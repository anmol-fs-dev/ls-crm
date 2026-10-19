'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPalette } from '@/components/layout/command-palette';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Collapsible Left Sidebar */}
      <React.Suspense fallback={<div className="w-64 border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950" />}>
        <Sidebar />
      </React.Suspense>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <React.Suspense fallback={<div className="p-8 text-xs text-zinc-500">Loading workspace...</div>}>
              {children}
            </React.Suspense>
          </div>
        </main>
      </div>

      {/* Global Cmd+K Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </div>
  );
}
