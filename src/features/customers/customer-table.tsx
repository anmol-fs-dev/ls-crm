'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  Download,
  Building2,
  User,
  ArrowUpDown,
  MoreHorizontal,
  Edit2,
  Trash2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Customer } from '@/types/custom.types';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, sanitizeCsvCell } from '@/lib/utils';
import { MOCK_PROFILES } from '@/lib/mock-data';

interface CustomerTableProps {
  customers: Customer[];
  onEditCustomer: (customer: Customer, verticalIds: string[]) => void;
  onDeleteCustomer: (id: string) => void;
}

export function CustomerTable({
  customers,
  onEditCustomer,
  onDeleteCustomer,
}: CustomerTableProps) {
  const { customerVerticals } = useCrmData();
  const { verticals, selectedVerticalId } = useVertical();

  // Filters
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');

  // Sort & Pagination
  const [sortField, setSortField] = React.useState<'name' | 'created_at'>('created_at');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;

  // Helper: Get linked verticals for a customer
  const getCustomerVerticals = React.useCallback(
    (customerId: string) => {
      const links = customerVerticals.filter((cv) => cv.customer_id === customerId);
      return links
        .map((l) => verticals.find((v) => v.id === l.vertical_id))
        .filter(Boolean) as typeof verticals;
    },
    [customerVerticals, verticals]
  );

  // Filtered dataset
  const filteredCustomers = React.useMemo(() => {
    return customers.filter((cust) => {
      // If a specific vertical is selected in the global switcher, only include customers linked to it
      if (selectedVerticalId !== 'all') {
        const isLinked = customerVerticals.some(
          (cv) => cv.customer_id === cust.id && cv.vertical_id === selectedVerticalId
        );
        if (!isLinked) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        const matchesName = cust.name.toLowerCase().includes(q);
        const matchesComp = cust.company?.toLowerCase().includes(q);
        const matchesEmail = cust.email?.toLowerCase().includes(q);
        const matchesTags = cust.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesComp && !matchesEmail && !matchesTags) return false;
      }

      if (statusFilter !== 'all' && cust.lifecycle_status !== statusFilter) {
        return false;
      }

      if (typeFilter !== 'all' && cust.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [customers, selectedVerticalId, customerVerticals, search, statusFilter, typeFilter]);

  const sortedCustomers = React.useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let comp = 0;
      if (sortField === 'name') comp = a.name.localeCompare(b.name);
      else comp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDirection === 'asc' ? comp : -comp;
    });
  }, [filteredCustomers, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedCustomers.length / pageSize) || 1;
  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSort = (field: 'name' | 'created_at') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Name', 'Type', 'Email', 'Phone', 'Company', 'Status', 'Owner', 'Linked Verticals', 'Tags'];
    const rows = sortedCustomers.map((c) => {
      const owner = MOCK_PROFILES.find((p) => p.id === c.owner_id)?.full_name || 'Unassigned';
      const linked = getCustomerVerticals(c.id).map((v) => v.name).join('; ');

      return [
        sanitizeCsvCell(c.name),
        sanitizeCsvCell(c.type),
        sanitizeCsvCell(c.email || ''),
        sanitizeCsvCell(c.phone || ''),
        sanitizeCsvCell(c.company || ''),
        sanitizeCsvCell(c.lifecycle_status),
        sanitizeCsvCell(owner),
        sanitizeCsvCell(linked),
        sanitizeCsvCell(c.tags.join('; ')),
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search customers by name, email, company..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="flex h-8 rounded-md border border-zinc-200 bg-transparent px-2 text-xs dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="vip">VIP</option>
            <option value="onboarding">Onboarding</option>
            <option value="lead_converted">Lead Converted</option>
            <option value="churned">Churned</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="flex h-8 rounded-md border border-zinc-200 bg-transparent px-2 text-xs dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
          >
            <option value="all">All Types</option>
            <option value="company">Corporate</option>
            <option value="individual">Individual</option>
          </select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          className="h-8 gap-1 text-xs shrink-0"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Customers Table */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-600 dark:text-zinc-400">
              <tr>
                <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <div className="flex items-center space-x-1">
                    <span>Customer Account</span>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </th>
                <th className="p-3">Status</th>
                <th className="p-3">Linked Verticals (Multi-Vertical)</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Account Owner</th>
                <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                  <div className="flex items-center space-x-1">
                    <span>Customer Since</span>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </div>
                </th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400">
                    No customers found matching current filters.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust) => {
                  const linkedVerts = getCustomerVerticals(cust.id);
                  const owner = MOCK_PROFILES.find((p) => p.id === cust.owner_id);

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors group"
                    >
                      {/* Name & Type */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <Link
                            href={`/customers/${cust.id}`}
                            className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1.5"
                          >
                            <span>{cust.name}</span>
                          </Link>
                          <span className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                            {cust.type === 'company' ? (
                              <>
                                <Building2 className="h-3 w-3 text-zinc-400" />
                                <span>Corporate Account</span>
                              </>
                            ) : (
                              <>
                                <User className="h-3 w-3 text-zinc-400" />
                                <span>Individual Client</span>
                              </>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <Badge
                          variant={
                            cust.lifecycle_status === 'vip'
                              ? 'default'
                              : cust.lifecycle_status === 'active'
                              ? 'success'
                              : cust.lifecycle_status === 'onboarding'
                              ? 'info'
                              : 'secondary'
                          }
                          className="text-[10px] uppercase tracking-wider h-5"
                        >
                          {cust.lifecycle_status.replace('_', ' ')}
                        </Badge>
                      </td>

                      {/* Linked Verticals Badges */}
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {linkedVerts.map((vert) => (
                            <span
                              key={vert.id}
                              className="inline-flex items-center space-x-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white shadow-2xs"
                              style={{ backgroundColor: vert.color }}
                            >
                              <span>{vert.name}</span>
                            </span>
                          ))}
                          {linkedVerts.length === 0 && (
                            <span className="text-zinc-400 italic">None linked</span>
                          )}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-3">
                        <div className="flex flex-col text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                          <span>{cust.email || '—'}</span>
                          <span className="text-zinc-400">{cust.phone || ''}</span>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="p-3 text-zinc-600 dark:text-zinc-400">
                        {owner?.full_name || 'Unassigned'}
                      </td>

                      {/* Date */}
                      <td className="p-3 text-zinc-500 text-[11px]">
                        {formatDate(cust.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem asChild>
                              <Link href={`/customers/${cust.id}`} className="cursor-pointer text-xs">
                                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                <span>360 Profile</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onEditCustomer(cust, linkedVerts.map((v) => v.id))}
                              className="cursor-pointer text-xs"
                            >
                              <Edit2 className="mr-2 h-3.5 w-3.5" />
                              <span>Edit Customer</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onDeleteCustomer(cust.id)}
                              className="cursor-pointer text-xs text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              <span>Delete Customer</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 p-3 text-xs text-zinc-500">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedCustomers.length)} of {sortedCustomers.length} accounts
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
