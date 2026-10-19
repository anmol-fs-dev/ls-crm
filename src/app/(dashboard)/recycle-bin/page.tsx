'use client';

import * as React from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  Building2,
  Users2,
  CheckSquare,
  Kanban,
  ShieldAlert,
  DollarSign,
  Layers,
  Info,
  Calendar,
  RefreshCw,
  ExternalLink,
  Tag,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useCrmData } from '@/context/crm-data-context';
import { useProject } from '@/context/project-context';
import { useVertical } from '@/context/vertical-context';
import { useAuth } from '@/context/auth-context';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';

type TabType = 'leads' | 'customers' | 'tasks' | 'cards';

export default function RecycleBinPage() {
  const { user } = useAuth();
  const { verticals, selectedVerticalId, setSelectedVerticalId } = useVertical();
  const {
    leads,
    customers,
    tasks,
    stages,
    restoreLead,
    purgeLead,
    restoreCustomer,
    purgeCustomer,
    restoreTask,
    purgeTask,
    restoreAll,
    emptyRecycleBin,
    refreshCrmData,
  } = useCrmData();

  const {
    cards,
    boards,
    columns,
    restoreCard,
    purgeCard,
    restoreAllCards,
    emptyRecycleBinCards,
    refreshProjects,
  } = useProject();

  const [activeTab, setActiveTab] = React.useState<TabType>('leads');
  const [search, setSearch] = React.useState('');
  const [localVerticalFilter, setLocalVerticalFilter] = React.useState<string>('all');
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Confirmation Modals
  const [purgeTarget, setPurgeTarget] = React.useState<{
    type: TabType;
    id: string;
    title: string;
  } | null>(null);

  const [isRestoreAllModalOpen, setIsRestoreAllModalOpen] = React.useState(false);
  const [isEmptyBinModalOpen, setIsEmptyBinModalOpen] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshCrmData(), refreshProjects()]);
    setIsRefreshing(false);
    showToast('Recycle bin synchronized with live database.');
  };

  // Filter soft-deleted items
  const deletedLeads = React.useMemo(() => {
    return leads.filter((l) => Boolean(l.deleted_at));
  }, [leads]);

  const deletedCustomers = React.useMemo(() => {
    return customers.filter((c) => Boolean(c.deleted_at));
  }, [customers]);

  const deletedTasks = React.useMemo(() => {
    return tasks.filter((t) => Boolean(t.deleted_at));
  }, [tasks]);

  const deletedCards = React.useMemo(() => {
    return cards.filter((c) => Boolean(c.deleted_at));
  }, [cards]);

  // Total metrics
  const totalDeletedCount =
    deletedLeads.length + deletedCustomers.length + deletedTasks.length + deletedCards.length;
  const totalDeletedLeadsValue = deletedLeads.reduce(
    (acc, l) => acc + (l.estimated_value || 0),
    0
  );

  // Tab-filtered lists with search & vertical filters
  const filteredLeads = React.useMemo(() => {
    return deletedLeads.filter((l) => {
      const matchVertical =
        localVerticalFilter === 'all' || l.vertical_id === localVerticalFilter;
      const query = search.toLowerCase();
      const matchSearch =
        !query ||
        l.name.toLowerCase().includes(query) ||
        (l.company && l.company.toLowerCase().includes(query)) ||
        (l.email && l.email.toLowerCase().includes(query));
      return matchVertical && matchSearch;
    });
  }, [deletedLeads, localVerticalFilter, search]);

  const filteredCustomers = React.useMemo(() => {
    return deletedCustomers.filter((c) => {
      const query = search.toLowerCase();
      const matchSearch =
        !query ||
        c.name.toLowerCase().includes(query) ||
        (c.company && c.company.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query));
      return matchSearch;
    });
  }, [deletedCustomers, search]);

  const filteredTasks = React.useMemo(() => {
    return deletedTasks.filter((t) => {
      const matchVertical =
        localVerticalFilter === 'all' || !t.vertical_id || t.vertical_id === localVerticalFilter;
      const query = search.toLowerCase();
      const matchSearch =
        !query ||
        t.title.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query));
      return matchVertical && matchSearch;
    });
  }, [deletedTasks, localVerticalFilter, search]);

  const filteredCards = React.useMemo(() => {
    return deletedCards.filter((c) => {
      const query = search.toLowerCase();
      const matchSearch =
        !query ||
        c.title.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query));
      return matchSearch;
    });
  }, [deletedCards, search]);

  // Restore handlers
  const handleRestoreItem = async (type: TabType, id: string, title: string) => {
    if (type === 'leads') {
      await restoreLead(id);
      showToast(`Lead "${title}" successfully restored to active pipeline.`);
    } else if (type === 'customers') {
      await restoreCustomer(id);
      showToast(`Customer account "${title}" successfully restored.`);
    } else if (type === 'tasks') {
      await restoreTask(id);
      showToast(`Task "${title}" successfully restored.`);
    } else if (type === 'cards') {
      await restoreCard(id);
      showToast(`Kanban card "${title}" successfully restored.`);
    }
  };

  // Purge handlers
  const handleConfirmPurge = async () => {
    if (!purgeTarget) return;
    const { type, id, title } = purgeTarget;
    if (type === 'leads') {
      await purgeLead(id);
      showToast(`Lead "${title}" permanently purged.`);
    } else if (type === 'customers') {
      await purgeCustomer(id);
      showToast(`Customer account "${title}" permanently purged.`);
    } else if (type === 'tasks') {
      await purgeTask(id);
      showToast(`Task "${title}" permanently purged.`);
    } else if (type === 'cards') {
      await purgeCard(id);
      showToast(`Kanban card "${title}" permanently purged.`);
    }
    setPurgeTarget(null);
  };

  // Bulk actions
  const handleConfirmRestoreAll = async () => {
    if (activeTab === 'leads') {
      await restoreAll('leads');
      showToast('All soft-deleted leads have been restored.');
    } else if (activeTab === 'customers') {
      await restoreAll('customers');
      showToast('All soft-deleted customer accounts have been restored.');
    } else if (activeTab === 'tasks') {
      await restoreAll('tasks');
      showToast('All soft-deleted tasks have been restored.');
    } else if (activeTab === 'cards') {
      await restoreAllCards();
      showToast('All soft-deleted project cards have been restored.');
    }
    setIsRestoreAllModalOpen(false);
  };

  const handleConfirmEmptyBin = async () => {
    if (activeTab === 'leads') {
      await emptyRecycleBin('leads');
      showToast('All soft-deleted leads have been permanently destroyed.');
    } else if (activeTab === 'customers') {
      await emptyRecycleBin('customers');
      showToast('All soft-deleted customers have been permanently destroyed.');
    } else if (activeTab === 'tasks') {
      await emptyRecycleBin('tasks');
      showToast('All soft-deleted tasks have been permanently destroyed.');
    } else if (activeTab === 'cards') {
      await emptyRecycleBinCards();
      showToast('All soft-deleted cards have been permanently destroyed.');
    }
    setIsEmptyBinModalOpen(false);
  };

  const getVerticalBadge = (vId?: string | null) => {
    if (!vId) return null;
    const vert = verticals.find((v) => v.id === vId);
    if (!vert) return null;
    return (
      <Badge
        variant="outline"
        className="text-[10px] font-medium gap-1 px-1.5 py-0.5 border-zinc-200 dark:border-zinc-800"
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: vert.color }} />
        {vert.name}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-xs text-zinc-50 shadow-xl dark:bg-zinc-50 dark:text-zinc-900 border border-zinc-700 dark:border-zinc-300 animate-in fade-in slide-in-from-bottom-2">
          <CheckSquare className="h-4 w-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Recycle Bin & Data Recovery
            </h1>
            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300 font-mono text-xs">
              {totalDeletedCount} Records
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Enterprise recovery console. Restore soft-deleted leads, customers, operational tasks, and project cards or permanently purge them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs border-zinc-200 dark:border-zinc-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync DB</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRestoreAllModalOpen(true)}
            disabled={
              (activeTab === 'leads' && filteredLeads.length === 0) ||
              (activeTab === 'customers' && filteredCustomers.length === 0) ||
              (activeTab === 'tasks' && filteredTasks.length === 0) ||
              (activeTab === 'cards' && filteredCards.length === 0)
            }
            className="h-8 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restore All {activeTab.toUpperCase()}</span>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsEmptyBinModalOpen(true)}
            disabled={
              (activeTab === 'leads' && filteredLeads.length === 0) ||
              (activeTab === 'customers' && filteredCustomers.length === 0) ||
              (activeTab === 'tasks' && filteredTasks.length === 0) ||
              (activeTab === 'cards' && filteredCards.length === 0)
            }
            className="h-8 gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Empty Tab Bin</span>
          </Button>
        </div>
      </div>

      {/* 30-Day Auto Purge Policy Banner */}
      <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="font-semibold">30-Day Soft-Delete Protection:</span> Records moved to the Recycle Bin are held for 30 days before automated background purging. Restoration restores all historical activities, comments, and vertical associations.
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-amber-700 dark:text-amber-400">
          <Clock className="h-3.5 w-3.5" />
          <span>RLS Active</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all ${
            activeTab === 'leads'
              ? 'border-zinc-900 bg-zinc-50/50 shadow-sm dark:border-zinc-100 dark:bg-zinc-900/50'
              : 'hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
          onClick={() => setActiveTab('leads')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Deleted Leads
              </span>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {deletedLeads.length}
              </div>
              <p className="text-[11px] text-rose-500 font-medium">
                {formatCurrency(totalDeletedLeadsValue)} at risk
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            activeTab === 'customers'
              ? 'border-zinc-900 bg-zinc-50/50 shadow-sm dark:border-zinc-100 dark:bg-zinc-900/50'
              : 'hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
          onClick={() => setActiveTab('customers')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Deleted Accounts
              </span>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {deletedCustomers.length}
              </div>
              <p className="text-[11px] text-zinc-400">Customers & Orgs</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Building2 className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            activeTab === 'tasks'
              ? 'border-zinc-900 bg-zinc-50/50 shadow-sm dark:border-zinc-100 dark:bg-zinc-900/50'
              : 'hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
          onClick={() => setActiveTab('tasks')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Deleted Tasks
              </span>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {deletedTasks.length}
              </div>
              <p className="text-[11px] text-zinc-400">Reminders & To-Dos</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all ${
            activeTab === 'cards'
              ? 'border-zinc-900 bg-zinc-50/50 shadow-sm dark:border-zinc-100 dark:bg-zinc-900/50'
              : 'hover:border-zinc-300 dark:hover:border-zinc-700'
          }`}
          onClick={() => setActiveTab('cards')}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Deleted Cards
              </span>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {deletedCards.length}
              </div>
              <p className="text-[11px] text-zinc-400">Kanban Board Cards</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Kanban className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900/50">
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'leads'
                ? 'bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Users2 className="h-3.5 w-3.5" />
            <span>Leads</span>
            <span className="ml-1 rounded-full bg-zinc-200/70 px-1.5 py-0.2 text-[10px] dark:bg-zinc-700">
              {deletedLeads.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'customers'
                ? 'bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Customers</span>
            <span className="ml-1 rounded-full bg-zinc-200/70 px-1.5 py-0.2 text-[10px] dark:bg-zinc-700">
              {deletedCustomers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Tasks</span>
            <span className="ml-1 rounded-full bg-zinc-200/70 px-1.5 py-0.2 text-[10px] dark:bg-zinc-700">
              {deletedTasks.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'cards'
                ? 'bg-white text-zinc-900 shadow-2xs dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Kanban className="h-3.5 w-3.5" />
            <span>Cards</span>
            <span className="ml-1 rounded-full bg-zinc-200/70 px-1.5 py-0.2 text-[10px] dark:bg-zinc-700">
              {deletedCards.length}
            </span>
          </button>
        </div>

        {/* Search & Vertical Filters */}
        <div className="flex items-center gap-2">
          {activeTab !== 'customers' && (
            <select
              value={localVerticalFilter}
              onChange={(e) => setLocalVerticalFilter(e.target.value)}
              className="h-8 rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="all">All Verticals</option>
              {verticals.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder={`Search deleted ${activeTab}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
            />
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <Card className="border-zinc-200 shadow-2xs dark:border-zinc-800">
        <CardContent className="p-0">
          {/* LEADS TAB */}
          {activeTab === 'leads' && (
            <div>
              {filteredLeads.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={Trash2}
                    title="No deleted leads found"
                    description={
                      search
                        ? 'No deleted leads match your search query.'
                        : 'The leads recycle bin is clean. Deleted leads will be safely held here.'
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-200 bg-zinc-50/50 font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                      <tr>
                        <th className="py-3 pl-4 pr-3">Lead & Contact</th>
                        <th className="px-3 py-3">Vertical</th>
                        <th className="px-3 py-3">Estimated Value</th>
                        <th className="px-3 py-3">Deleted Date</th>
                        <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                          <td className="py-3 pl-4 pr-3">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                              {lead.name}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {lead.company ? `${lead.company} • ` : ''}
                              {lead.email || 'No email provided'}
                            </div>
                          </td>
                          <td className="px-3 py-3">{getVerticalBadge(lead.vertical_id)}</td>
                          <td className="px-3 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                            {formatCurrency(lead.estimated_value || 0)}
                          </td>
                          <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-zinc-400" />
                              <span>{lead.deleted_at ? formatRelativeTime(lead.deleted_at) : 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="py-3 pl-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreItem('leads', lead.id, lead.name)}
                                className="h-7 gap-1 text-[11px] text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Restore</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setPurgeTarget({ type: 'leads', id: lead.id, title: lead.name })
                                }
                                className="h-7 gap-1 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Purge</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CUSTOMERS TAB */}
          {activeTab === 'customers' && (
            <div>
              {filteredCustomers.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={Building2}
                    title="No deleted customer accounts"
                    description="All customer records are active. Deleted accounts will appear here for 30-day recovery."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-200 bg-zinc-50/50 font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                      <tr>
                        <th className="py-3 pl-4 pr-3">Account Name</th>
                        <th className="px-3 py-3">Account Type</th>
                        <th className="px-3 py-3">Lifecycle Status</th>
                        <th className="px-3 py-3">Deleted Date</th>
                        <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {filteredCustomers.map((cust) => (
                        <tr key={cust.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                          <td className="py-3 pl-4 pr-3">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                              {cust.name}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {cust.company ? `${cust.company} • ` : ''}
                              {cust.email || 'No email provided'}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {cust.type}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant="secondary" className="text-[10px] capitalize font-mono">
                              {cust.lifecycle_status.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-zinc-400" />
                              <span>{cust.deleted_at ? formatRelativeTime(cust.deleted_at) : 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="py-3 pl-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreItem('customers', cust.id, cust.name)}
                                className="h-7 gap-1 text-[11px] text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Restore</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setPurgeTarget({ type: 'customers', id: cust.id, title: cust.name })
                                }
                                className="h-7 gap-1 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Purge</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div>
              {filteredTasks.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={CheckSquare}
                    title="No deleted tasks found"
                    description="Operational tasks recycle bin is clean. No tasks pending recovery."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-200 bg-zinc-50/50 font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                      <tr>
                        <th className="py-3 pl-4 pr-3">Task Title</th>
                        <th className="px-3 py-3">Vertical</th>
                        <th className="px-3 py-3">Priority</th>
                        <th className="px-3 py-3">Due Date</th>
                        <th className="px-3 py-3">Deleted Date</th>
                        <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {filteredTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                          <td className="py-3 pl-4 pr-3">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-[11px] text-zinc-400 truncate max-w-xs">
                                {task.description}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3">{getVerticalBadge(task.vertical_id)}</td>
                          <td className="px-3 py-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize ${
                                task.priority === 'urgent'
                                  ? 'border-rose-300 text-rose-600 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30'
                                  : task.priority === 'high'
                                  ? 'border-amber-300 text-amber-600 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30'
                                  : 'border-zinc-200 text-zinc-600'
                              }`}
                            >
                              {task.priority}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400">
                            {task.due_date ? formatDate(task.due_date) : 'No due date'}
                          </td>
                          <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-zinc-400" />
                              <span>{task.deleted_at ? formatRelativeTime(task.deleted_at) : 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="py-3 pl-3 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreItem('tasks', task.id, task.title)}
                                className="h-7 gap-1 text-[11px] text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Restore</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setPurgeTarget({ type: 'tasks', id: task.id, title: task.title })
                                }
                                className="h-7 gap-1 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Purge</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* CARDS TAB */}
          {activeTab === 'cards' && (
            <div>
              {filteredCards.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={Kanban}
                    title="No deleted cards found"
                    description="Kanban project cards recycle bin is clean. Deleted cards will be available for restoration here."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-zinc-200 bg-zinc-50/50 font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                      <tr>
                        <th className="py-3 pl-4 pr-3">Card Title</th>
                        <th className="px-3 py-3">Board & Column</th>
                        <th className="px-3 py-3">Priority</th>
                        <th className="px-3 py-3">Deleted Date</th>
                        <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {filteredCards.map((card) => {
                        const board = boards.find((b) => b.id === card.board_id);
                        const col = columns.find((c) => c.id === card.column_id);
                        return (
                          <tr key={card.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40">
                            <td className="py-3 pl-4 pr-3">
                              <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                                {card.title}
                              </div>
                              {card.description && (
                                <div className="text-[11px] text-zinc-400 truncate max-w-xs">
                                  {card.description}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400">
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                {board?.name || 'Project Board'}
                              </span>
                              {col && <span className="text-zinc-400"> → {col.name}</span>}
                            </td>
                            <td className="px-3 py-3">
                              <Badge
                                variant="outline"
                                className={`text-[10px] capitalize ${
                                  card.priority === 'urgent'
                                    ? 'border-rose-300 text-rose-600 bg-rose-50 dark:border-rose-900/50 dark:bg-rose-950/30'
                                    : card.priority === 'high'
                                    ? 'border-amber-300 text-amber-600 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30'
                                    : 'border-zinc-200 text-zinc-600'
                                }`}
                              >
                                {card.priority}
                              </Badge>
                            </td>
                            <td className="px-3 py-3 text-zinc-500 dark:text-zinc-400">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                <span>{card.deleted_at ? formatRelativeTime(card.deleted_at) : 'Unknown'}</span>
                              </div>
                            </td>
                            <td className="py-3 pl-3 pr-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRestoreItem('cards', card.id, card.title)}
                                  className="h-7 gap-1 text-[11px] text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Restore</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setPurgeTarget({ type: 'cards', id: card.id, title: card.title })
                                  }
                                  className="h-7 gap-1 text-[11px] text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Purge</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      {/* 1. Single Item Permanent Purge */}
      <ConfirmDialog
        open={Boolean(purgeTarget)}
        onOpenChange={(open) => !open && setPurgeTarget(null)}
        title="Permanently Purge Record?"
        description={`You are about to permanently delete "${purgeTarget?.title}" from the Supabase PostgreSQL database. This action CANNOT be undone and data will be destroyed.`}
        confirmLabel="Purge Permanently"
        variant="destructive"
        onConfirm={handleConfirmPurge}
      />

      {/* 2. Bulk Restore All */}
      <ConfirmDialog
        open={isRestoreAllModalOpen}
        onOpenChange={setIsRestoreAllModalOpen}
        title={`Restore All Deleted ${activeTab.toUpperCase()}?`}
        description={`This will restore all ${activeTab} currently in the recycle bin back to their active stages and directories.`}
        confirmLabel={`Restore All ${activeTab}`}
        variant="default"
        onConfirm={handleConfirmRestoreAll}
      />

      {/* 3. Empty Recycle Bin */}
      <ConfirmDialog
        open={isEmptyBinModalOpen}
        onOpenChange={setIsEmptyBinModalOpen}
        title={`Empty Recycle Bin for ${activeTab.toUpperCase()}?`}
        description={`WARNING: All soft-deleted ${activeTab} will be permanently destroyed from the PostgreSQL database. This action is irreversible.`}
        confirmLabel="Empty & Destroy Permanently"
        variant="destructive"
        onConfirm={handleConfirmEmptyBin}
      />
    </div>
  );
}
