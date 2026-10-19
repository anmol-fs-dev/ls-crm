'use client';

import * as React from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Clock,
  User,
  Layers,
  ArrowRight,
  Database,
  FileCode,
} from 'lucide-react';
import { AuditLog } from '@/types/custom.types';
import { useVertical } from '@/context/vertical-context';
import { useAuth } from '@/context/auth-context';
import { MOCK_PROFILES } from '@/lib/mock-data';
import { formatDate, formatRelativeTime, downloadCsv, sanitizeCsvCell } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    vertical_id: 'vert-3',
    user_id: '9b06dc03-ac1a-4f05-8cc6-59a66911d4ac',
    action: 'UPDATE',
    entity_type: 'lead',
    entity_id: 'lead-1',
    old_data: { stage_id: 'stg-10', estimated_value: 30000 },
    new_data: { stage_id: 'stg-11', estimated_value: 36000 },
    ip_address: '192.168.1.104',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'log-2',
    vertical_id: 'vert-3',
    user_id: '9b06dc03-ac1a-4f05-8cc6-59a66911d4ac',
    action: 'CONVERT',
    entity_type: 'customer',
    entity_id: 'cust-1',
    old_data: { status: 'lead', lead_id: 'lead-5' },
    new_data: { status: 'customer', customer_id: 'cust-1', lifecycle_status: 'active' },
    ip_address: '192.168.1.88',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'log-3',
    vertical_id: 'vert-1',
    user_id: '9b06dc03-ac1a-4f05-8cc6-59a66911d4ac',
    action: 'CREATE',
    entity_type: 'vertical',
    entity_id: 'vert-1',
    old_data: null,
    new_data: { name: 'Mentorship', slug: 'mentorship', color: '#6366f1' },
    ip_address: '127.0.0.1',
    user_agent: 'System Seeder',
    created_at: '2026-10-19T12:10:58.729054+00:00',
  },
  {
    id: 'log-4',
    vertical_id: 'vert-3',
    user_id: '9b06dc03-ac1a-4f05-8cc6-59a66911d4ac',
    action: 'CREATE',
    entity_type: 'vertical',
    entity_id: 'vert-3',
    old_data: null,
    new_data: { name: 'SaaS Solutions', slug: 'saas', color: '#3b82f6' },
    ip_address: '127.0.0.1',
    user_agent: 'System Seeder',
    created_at: '2026-10-19T12:10:58.729054+00:00',
  },
];

export default function AuditLogsPage() {
  const { user } = useAuth();
  const { verticals } = useVertical();

  const [logs, setLogs] = React.useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [actionFilter, setActionFilter] = React.useState('all');
  const [entityFilter, setEntityFilter] = React.useState('all');
  const [selectedLog, setSelectedLog] = React.useState<AuditLog | null>(null);
  const [isDiffModalOpen, setIsDiffModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  // Fetch live logs from /api/crm
  const fetchAuditLogs = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/crm');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.auditLogs) && json.auditLogs.length > 0) {
          setLogs(json.auditLogs);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs, using initial dataset', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Filter logs
  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'all' && log.action.toUpperCase() !== actionFilter.toUpperCase()) {
        return false;
      }
      if (entityFilter !== 'all' && log.entity_type.toLowerCase() !== entityFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesEntity = log.entity_type.toLowerCase().includes(q);
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesId = (log.entity_id || '').toLowerCase().includes(q);
        const matchesIp = (log.ip_address || '').toLowerCase().includes(q);
        const matchesUser = MOCK_PROFILES.some(
          (p) => p.id === log.user_id && p.full_name.toLowerCase().includes(q)
        );
        if (!matchesEntity && !matchesAction && !matchesId && !matchesIp && !matchesUser) {
          return false;
        }
      }
      return true;
    });
  }, [logs, actionFilter, entityFilter, searchQuery]);

  // Action badge styling
  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act === 'CREATE') {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-[10px]">
          CREATE
        </Badge>
      );
    }
    if (act === 'UPDATE') {
      return (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 text-[10px]">
          UPDATE
        </Badge>
      );
    }
    if (act === 'DELETE') {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800 text-[10px]">
          DELETE
        </Badge>
      );
    }
    if (act === 'CONVERT') {
      return (
        <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800 text-[10px]">
          CONVERT
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px]">
        {action}
      </Badge>
    );
  };

  // Export to CSV
  const handleExportCsv = () => {
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `audit-logs-export-${timestamp}.csv`;

    let csvContent = 'AUDIT & SECURITY LOG TRAIL\n';
    csvContent += 'Timestamp,Action,Entity Type,Entity ID,Actor,IP Address,Old Data,New Data\n';

    for (const log of filteredLogs) {
      const actor = MOCK_PROFILES.find((p) => p.id === log.user_id)?.full_name || 'System / Admin';
      const oldStr = log.old_data ? JSON.stringify(log.old_data).replace(/"/g, '""') : '';
      const newStr = log.new_data ? JSON.stringify(log.new_data).replace(/"/g, '""') : '';

      csvContent += `${sanitizeCsvCell(log.created_at)},${sanitizeCsvCell(log.action)},${sanitizeCsvCell(log.entity_type)},${sanitizeCsvCell(log.entity_id)},${sanitizeCsvCell(actor)},${sanitizeCsvCell(log.ip_address || '—')},"${oldStr}","${newStr}"\n`;
    }

    downloadCsv(filename, csvContent);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Security & Audit Logs
            </h1>
            <Badge variant="outline" className="text-xs bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Immutable Ledger
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Tamper-evident trail of CRM entity mutations, conversions, role modifications, and system events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchAuditLogs}
            disabled={isLoading}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200/80 shadow-sm dark:bg-zinc-900/60 dark:border-zinc-800/80">
        <div className="flex flex-1 items-center gap-2 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actor, entity ID, action..."
              className="h-8 pl-8 text-xs bg-zinc-50/50 dark:bg-zinc-800/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Action Filter */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span>Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="all">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="CONVERT">CONVERT</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span>Entity:</span>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="all">All Entities</option>
              <option value="vertical">Vertical</option>
              <option value="lead">Lead</option>
              <option value="customer">Customer</option>
              <option value="card">Card</option>
              <option value="task">Task</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <Card className="border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/75 border-b border-zinc-200/80 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider dark:bg-zinc-900 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 italic text-xs">
                    No audit records matching selected filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const actor = MOCK_PROFILES.find((p) => p.id === log.user_id);
                  const vert = verticals.find((v) => v.id === log.vertical_id);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          <span>{formatRelativeTime(log.created_at)}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Entity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 uppercase text-[11px]">
                            {log.entity_type}
                          </span>
                          {log.entity_id && (
                            <span className="font-mono text-[10px] text-zinc-400 truncate max-w-[100px]">
                              {log.entity_id.slice(0, 8)}...
                            </span>
                          )}
                          {vert && (
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: vert.color }}
                              title={vert.name}
                            />
                          )}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[9px] font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                            {actor ? actor.full_name.slice(0, 2).toUpperCase() : 'SYS'}
                          </div>
                          <span className="text-zinc-800 dark:text-zinc-200">
                            {actor ? actor.full_name : 'System Admin'}
                          </span>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {log.ip_address || '127.0.0.1'}
                      </td>

                      {/* Details button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedLog(log);
                            setIsDiffModalOpen(true);
                          }}
                          className="h-7 text-xs gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                          <Eye className="h-3 w-3" />
                          <span>Inspect Diff</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* JSON Delta Diff Modal */}
      <Dialog open={isDiffModalOpen} onOpenChange={setIsDiffModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 sm:rounded-xl">
          <DialogHeader className="border-b border-zinc-200 pb-3 dark:border-zinc-800">
            <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <FileCode className="h-4 w-4 text-indigo-500" />
              Audit Delta Diff Inspection
            </DialogTitle>
            <DialogDescription className="text-xs">
              Side-by-side snapshot of record state before and after mutation.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2 text-xs">
              {/* Metadata strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  {getActionBadge(selectedLog.action)}
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 uppercase">
                    {selectedLog.entity_type}
                  </span>
                  <span className="font-mono text-zinc-400">{selectedLog.entity_id}</span>
                </div>
                <span className="text-zinc-500 font-medium">
                  {formatDate(selectedLog.created_at)} ({formatRelativeTime(selectedLog.created_at)})
                </span>
              </div>

              {/* Diff comparison containers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Old Data */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <span>State Before (Old Data)</span>
                    <Badge variant="outline" className="text-[10px] text-red-600 border-red-200">
                      PRE
                    </Badge>
                  </div>
                  <pre className="rounded-lg bg-zinc-900 p-3 text-[11px] font-mono text-zinc-200 overflow-x-auto max-h-64">
                    {selectedLog.old_data
                      ? JSON.stringify(selectedLog.old_data, null, 2)
                      : '// No previous state (Record created)'}
                  </pre>
                </div>

                {/* New Data */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    <span>State After (New Data)</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                      POST
                    </Badge>
                  </div>
                  <pre className="rounded-lg bg-zinc-900 p-3 text-[11px] font-mono text-zinc-200 overflow-x-auto max-h-64">
                    {selectedLog.new_data
                      ? JSON.stringify(selectedLog.new_data, null, 2)
                      : '// No state (Record purged)'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
