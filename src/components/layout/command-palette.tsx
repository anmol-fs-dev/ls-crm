'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  LayoutDashboard,
  Users2,
  Building2,
  CheckSquare,
  Kanban,
  Settings,
  PlusCircle,
  Briefcase,
  Layers,
  BarChart3,
  Trash2,
  Keyboard,
  ArrowRight,
  Search,
  Sliders,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useVertical } from '@/context/vertical-context';
import { useCrmData } from '@/context/crm-data-context';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { verticals, setSelectedVerticalId } = useVertical();
  const { leads, customers } = useCrmData();
  const [search, setSearch] = React.useState('');
  const [showShortcutsHelp, setShowShortcutsHelp] = React.useState(false);

  const isAdmin = user?.role === 'owner' || user?.role === 'manager';

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Toggle Cmd+K / Ctrl+K
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      // Press ? to open shortcuts helper (when not focused in an input/textarea)
      if (
        e.key === '?' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setShowShortcutsHelp(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    setShowShortcutsHelp(false);
    callback();
  };

  const navActions = [
    { label: 'Go to Dashboard', icon: LayoutDashboard, action: () => router.push('/') },
    { label: 'View Leads Pipeline', icon: Users2, action: () => router.push('/leads') },
    { label: 'View Customers Directory', icon: Building2, action: () => router.push('/customers') },
    { label: 'View Tasks & Reminders', icon: CheckSquare, action: () => router.push('/tasks') },
    { label: 'View Project Boards', icon: Kanban, action: () => router.push('/projects') },
    { label: 'Executive Analytics & Reporting', icon: BarChart3, action: () => router.push('/analytics') },
    ...(isAdmin ? [{ label: 'Recycle Bin & Data Recovery', icon: Trash2, action: () => router.push('/recycle-bin') }] : []),
    { label: 'Workspace Settings Hub', icon: Sliders, action: () => router.push('/settings') },
    { label: 'Manage Verticals & Pipelines', icon: Layers, action: () => router.push('/settings/verticals') },
    { label: 'Team Members & Permissions', icon: Users, action: () => router.push('/settings/team') },
    { label: 'Account & Profile Settings', icon: ShieldCheck, action: () => router.push('/settings/profile') },
  ];

  const filteredNav = navActions.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVerticals = verticals.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  // Live entity matches
  const matchedLeads = React.useMemo(() => {
    if (!search || search.length < 2) return [];
    const query = search.toLowerCase();
    return leads
      .filter((l) => !l.deleted_at && (l.name.toLowerCase().includes(query) || (l.company && l.company.toLowerCase().includes(query))))
      .slice(0, 3);
  }, [leads, search]);

  const matchedCustomers = React.useMemo(() => {
    if (!search || search.length < 2) return [];
    const query = search.toLowerCase();
    return customers
      .filter((c) => !c.deleted_at && (c.name.toLowerCase().includes(query) || (c.company && c.company.toLowerCase().includes(query))))
      .slice(0, 3);
  }, [customers, search]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="overflow-hidden p-0 max-w-lg shadow-2xl border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-3">
            <Search className="h-4 w-4 mr-2 text-zinc-400" />
            <input
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
              placeholder="Search leads, customers, pages, or commands (e.g. 'saas', 'pipeline')..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="rounded p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-3">
            {/* Live Leads Search Results */}
            {matchedLeads.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Matching Leads</span>
                  <Badge variant="outline" className="text-[9px] py-0">Leads</Badge>
                </div>
                <div className="space-y-0.5 mt-1">
                  {matchedLeads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => handleSelect(() => router.push(`/leads/${lead.id}`))}
                      className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center">
                        <Users2 className="h-3.5 w-3.5 mr-2.5 text-blue-500" />
                        <div>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{lead.name}</span>
                          {lead.company && <span className="text-zinc-400 ml-1.5">({lead.company})</span>}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {formatCurrency(lead.estimated_value || 0)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Customers Search Results */}
            {matchedCustomers.length > 0 && (
              <div>
                <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Matching Customers</span>
                  <Badge variant="outline" className="text-[9px] py-0">Customers</Badge>
                </div>
                <div className="space-y-0.5 mt-1">
                  {matchedCustomers.map((cust) => (
                    <button
                      key={cust.id}
                      onClick={() => handleSelect(() => router.push(`/customers/${cust.id}`))}
                      className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center">
                        <Building2 className="h-3.5 w-3.5 mr-2.5 text-purple-500" />
                        <div>
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">{cust.name}</span>
                          {cust.company && <span className="text-zinc-400 ml-1.5">({cust.company})</span>}
                        </div>
                      </div>
                      <span className="text-[11px] capitalize text-zinc-400">{cust.lifecycle_status}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Navigation */}
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Navigation
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleSelect(item.action)}
                      className="flex w-full items-center rounded-md px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                    >
                      <Icon className="h-3.5 w-3.5 mr-2.5 text-zinc-400" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Verticals Switcher */}
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Switch Business Vertical
              </div>
              <div className="space-y-0.5 mt-1">
                <button
                  onClick={() =>
                    handleSelect(() => {
                      setSelectedVerticalId('all');
                      router.push('/');
                    })
                  }
                  className="flex w-full items-center rounded-md px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5 mr-2.5 text-zinc-500" />
                  <span>All Verticals (Global Workspace)</span>
                </button>
                {filteredVerticals.map((vert) => (
                  <button
                    key={vert.id}
                    onClick={() =>
                      handleSelect(() => {
                        setSelectedVerticalId(vert.id);
                        router.push('/');
                      })
                    }
                    className="flex w-full items-center rounded-md px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                  >
                    <div
                      className="h-2.5 w-2.5 rounded-full mr-2.5"
                      style={{ backgroundColor: vert.color }}
                    />
                    <span>{vert.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Quick Actions
              </div>
              <div className="space-y-0.5 mt-1">
                <button
                  onClick={() => handleSelect(() => router.push('/leads?action=new'))}
                  className="flex w-full items-center rounded-md px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-2.5 text-blue-500" />
                  <span>Create New Lead...</span>
                </button>
                <button
                  onClick={() => handleSelect(() => router.push('/tasks?action=new'))}
                  className="flex w-full items-center rounded-md px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-2.5 text-emerald-500" />
                  <span>Create New Task...</span>
                </button>
                <button
                  onClick={() => handleSelect(() => router.push('/projects?action=new_board'))}
                  className="flex w-full items-center rounded-md px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-2.5 text-amber-500" />
                  <span>Create New Project Board...</span>
                </button>
                <button
                  onClick={() => handleSelect(() => router.push('/settings/verticals?action=new'))}
                  className="flex w-full items-center rounded-md px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <Briefcase className="h-3.5 w-3.5 mr-2.5 text-purple-500" />
                  <span>Create New Vertical...</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-200 px-3 py-2 text-[11px] text-zinc-400 dark:border-zinc-800">
            <span>Press <kbd className="rounded border px-1 py-0.5 text-[10px]">Esc</kbd> to close</span>
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="flex items-center gap-1 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <Keyboard className="h-3 w-3" />
              <span>Press <kbd className="rounded border px-1 py-0.5 text-[10px]">?</kbd> for shortcuts</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Helper Modal */}
      <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
        <DialogContent className="max-w-md p-5 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <Keyboard className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Keyboard Shortcuts Reference
            </h2>
          </div>

          <div className="space-y-4 pt-2 text-xs">
            <div className="space-y-2">
              <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                Global Navigation
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between rounded bg-zinc-100 p-2 dark:bg-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300">Command Palette</span>
                  <kbd className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] font-mono dark:border-zinc-700 dark:bg-zinc-900">
                    ⌘K / Ctrl+K
                  </kbd>
                </div>
                <div className="flex items-center justify-between rounded bg-zinc-100 p-2 dark:bg-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300">Shortcuts Help</span>
                  <kbd className="rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-[10px] font-mono dark:border-zinc-700 dark:bg-zinc-900">
                    ?
                  </kbd>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-zinc-400 uppercase tracking-wider text-[10px]">
                Quick Links
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Jump to Leads</span>
                  <span className="font-mono text-zinc-500 text-[11px]">/leads</span>
                </div>
                <div className="flex items-center justify-between p-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Jump to Projects</span>
                  <span className="font-mono text-zinc-500 text-[11px]">/projects</span>
                </div>
                <div className="flex items-center justify-between p-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Jump to Analytics</span>
                  <span className="font-mono text-zinc-500 text-[11px]">/analytics</span>
                </div>
                <div className="flex items-center justify-between p-1">
                  <span className="text-zinc-600 dark:text-zinc-400">Jump to Recycle Bin</span>
                  <span className="font-mono text-zinc-500 text-[11px]">/recycle-bin</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
