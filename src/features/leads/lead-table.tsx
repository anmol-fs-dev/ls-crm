'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Download,
  ArrowUpDown,
  MoreHorizontal,
  UserCheck,
  Edit2,
  Trash2,
  ExternalLink,
  Tag,
  DollarSign,
  BookmarkCheck,
} from 'lucide-react';
import { Lead, Vertical, PipelineStage } from '@/types/custom.types';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency, formatDate, sanitizeCsvCell } from '@/lib/utils';
import { MOCK_PROFILES, MOCK_STAGES } from '@/lib/mock-data';

interface LeadTableProps {
  leads: Lead[];
  onEditLead: (lead: Lead) => void;
  onConvertLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
}

type SortField = 'name' | 'estimated_value' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function LeadTable({
  leads,
  onEditLead,
  onConvertLead,
  onDeleteLead,
}: LeadTableProps) {
  const { verticals, selectedVerticalId } = useVertical();

  // Filter States
  const [search, setSearch] = React.useState('');
  const [selectedStage, setSelectedStage] = React.useState<string>('all');
  const [selectedOwner, setSelectedOwner] = React.useState<string>('all');
  const [selectedSource, setSelectedSource] = React.useState<string>('all');
  const [savedFilter, setSavedFilter] = React.useState<string>('all');

  // Sort & Pagination States
  const [sortField, setSortField] = React.useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  // Handle Quick Saved Filters
  const applySavedFilter = (preset: string) => {
    setSavedFilter(preset);
    setCurrentPage(1);
    if (preset === 'high_value') {
      setSearch('');
      setSelectedStage('all');
      setSelectedOwner('all');
    } else if (preset === 'won') {
      setSelectedStage('won');
    } else {
      setSelectedStage('all');
      setSelectedOwner('all');
      setSelectedSource('all');
      setSearch('');
    }
  };

  // Filter & Sort Logic
  const filteredLeads = React.useMemo(() => {
    return leads.filter((lead) => {
      // Search query filter
      if (search) {
        const query = search.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesCompany = lead.company?.toLowerCase().includes(query);
        const matchesEmail = lead.email?.toLowerCase().includes(query);
        const matchesTags = lead.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchesName && !matchesCompany && !matchesEmail && !matchesTags) {
          return false;
        }
      }

      // Stage filter
      if (selectedStage !== 'all') {
        if (selectedStage === 'won') {
          const stg = MOCK_STAGES.find((s) => s.id === lead.stage_id);
          if (!stg?.is_won) return false;
        } else if (lead.stage_id !== selectedStage) {
          return false;
        }
      }

      // Owner filter
      if (selectedOwner !== 'all' && lead.owner_id !== selectedOwner) {
        return false;
      }

      // Source filter
      if (selectedSource !== 'all' && lead.source !== selectedSource) {
        return false;
      }

      // Saved preset filters
      if (savedFilter === 'high_value' && (lead.estimated_value || 0) < 20000) {
        return false;
      }

      return true;
    });
  }, [leads, search, selectedStage, selectedOwner, selectedSource, savedFilter]);

  const sortedLeads = React.useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'estimated_value') {
        comparison = (a.estimated_value || 0) - (b.estimated_value || 0);
      } else if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredLeads, sortField, sortDirection]);

  // Pagination Slice
  const totalPages = Math.ceil(sortedLeads.length / pageSize) || 1;
  const paginatedLeads = sortedLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // CSV Export with Formula Injection Sanitization
  const handleExportCsv = () => {
    const headers = ['Name', 'Company', 'Email', 'Phone', 'Estimated Value', 'Stage', 'Vertical', 'Owner', 'Source', 'Tags'];
    const rows = sortedLeads.map((l) => {
      const stage = MOCK_STAGES.find((s) => s.id === l.stage_id)?.name || 'Unknown';
      const vert = verticals.find((v) => v.id === l.vertical_id)?.name || 'Unknown';
      const owner = MOCK_PROFILES.find((p) => p.id === l.owner_id)?.full_name || 'Unassigned';

      return [
        sanitizeCsvCell(l.name),
        sanitizeCsvCell(l.company || ''),
        sanitizeCsvCell(l.email || ''),
        sanitizeCsvCell(l.phone || ''),
        sanitizeCsvCell(l.estimated_value),
        sanitizeCsvCell(stage),
        sanitizeCsvCell(vert),
        sanitizeCsvCell(owner),
        sanitizeCsvCell(l.source || ''),
        sanitizeCsvCell(l.tags.join('; ')),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search, Saved Filters & Export Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search leads by name, email, company, tags..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Saved Filter Pills */}
          <div className="hidden lg:flex items-center space-x-1 border-l border-zinc-200 dark:border-zinc-800 pl-2">
            <button
              onClick={() => applySavedFilter('all')}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                savedFilter === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => applySavedFilter('high_value')}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                savedFilter === 'high_value'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              High Value (&gt;$20k)
            </button>
            <button
              onClick={() => applySavedFilter('won')}
              className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                savedFilter === 'won'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              Won Deals
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Owner Filter */}
          <select
            value={selectedOwner}
            onChange={(e) => {
              setSelectedOwner(e.target.value);
              setCurrentPage(1);
            }}
            className="flex h-8 rounded-md border border-zinc-200 bg-transparent px-2 text-xs dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
          >
            <option value="all">All Owners</option>
            {MOCK_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 gap-1 text-xs"
            title="Export filtered records to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <div className="flex items-center space-x-1">
                    <span>Contact / Opportunity</span>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('estimated_value')}>
                  <div className="flex items-center space-x-1">
                    <span>Value</span>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </th>
                <th className="p-3">Stage</th>
                <th className="p-3">Vertical</th>
                <th className="p-3">Owner</th>
                <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                  <div className="flex items-center space-x-1">
                    <span>Created</span>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    No leads found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const stage = MOCK_STAGES.find((s) => s.id === lead.stage_id);
                  const vertical = verticals.find((v) => v.id === lead.vertical_id);
                  const owner = MOCK_PROFILES.find((p) => p.id === lead.owner_id);
                  const isConverted = Boolean(lead.converted_to_customer_id);

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors group"
                    >
                      {/* Name & Contact */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <Link
                            href={`/leads/${lead.id}`}
                            className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1.5"
                          >
                            <span>{lead.name}</span>
                            {isConverted && (
                              <Badge variant="success" className="text-[9px] px-1 py-0 h-4">
                                Converted
                              </Badge>
                            )}
                          </Link>
                          <span className="text-[11px] text-zinc-500 mt-0.5">
                            {lead.company || lead.email || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Estimated Value */}
                      <td className="p-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(lead.estimated_value)}
                      </td>

                      {/* Stage Badge */}
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 py-0"
                          style={{ borderColor: stage?.color || '#64748b', color: stage?.color || 'inherit' }}
                        >
                          {stage?.name || 'In Progress'}
                        </Badge>
                      </td>

                      {/* Vertical Indicator */}
                      <td className="p-3">
                        {vertical ? (
                          <div className="flex items-center space-x-1.5">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: vertical.color }}
                            />
                            <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">
                              {vertical.name}
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Owner */}
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">
                        {owner ? (
                          <span className="truncate max-w-[100px]">{owner.full_name}</span>
                        ) : (
                          <span className="text-zinc-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-3 text-zinc-500 text-[11px]">
                        {formatDate(lead.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {!isConverted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onConvertLead(lead)}
                              className="h-7 px-2 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              title="1-Click Convert to Customer"
                            >
                              <UserCheck className="h-3 w-3 mr-1" />
                              Convert
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem asChild>
                                <Link href={`/leads/${lead.id}`} className="cursor-pointer text-xs">
                                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                  <span>View Timeline</span>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => onEditLead(lead)}
                                className="cursor-pointer text-xs"
                              >
                                <Edit2 className="mr-2 h-3.5 w-3.5" />
                                <span>Edit Lead</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDeleteLead(lead.id)}
                                className="cursor-pointer text-xs text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                <span>Delete Lead</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 p-3 text-xs text-zinc-500">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedLeads.length)} of {sortedLeads.length} leads
          </span>
          <div className="flex items-center space-x-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="h-7 px-2 text-xs"
            >
              Previous
            </Button>
            <span className="px-2 text-zinc-700 dark:text-zinc-300 font-mono">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-7 px-2 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
