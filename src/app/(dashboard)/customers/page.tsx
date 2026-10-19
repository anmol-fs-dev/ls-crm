'use client';

import * as React from 'react';
import { Building2, Plus, Users, Layers, ShieldCheck } from 'lucide-react';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { Customer } from '@/types/custom.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CustomerTable } from '@/features/customers/customer-table';
import { CustomerFormModal } from '@/features/customers/customer-form-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function CustomersPage() {
  const { customers, customerVerticals, deleteCustomer } = useCrmData();
  const { selectedVertical, selectedVerticalId } = useVertical();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [editingVerticalIds, setEditingVerticalIds] = React.useState<string[]>([]);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  // Compute metrics
  const activeCustomers = customers.filter((c) => !c.deleted_at && c.lifecycle_status === 'active');
  const multiVerticalCount = customers.filter((c) => {
    const links = customerVerticals.filter((cv) => cv.customer_id === c.id);
    return links.length > 1;
  }).length;

  const handleEdit = (customer: Customer, verticalIds: string[]) => {
    setEditingCustomer(customer);
    setEditingVerticalIds(verticalIds);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingCustomer(null);
    setEditingVerticalIds(selectedVerticalId !== 'all' ? [selectedVerticalId] : []);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Customer Directory
            </h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {customers.filter((c) => !c.deleted_at).length} Accounts
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Unified multi-vertical customer 360 directory, cross-vertical engagements, and lifecycle accounts.
          </p>
        </div>

        <Button
          onClick={handleCreate}
          size="sm"
          className="h-8 gap-1.5 text-xs bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Customer</span>
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Total Accounts
              </p>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                {customers.filter((c) => !c.deleted_at).length}
              </h3>
            </div>
            <Building2 className="h-6 w-6 text-zinc-400" />
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Active Customers
              </p>
              <h3 className="text-xl font-bold text-emerald-600 mt-1">
                {activeCustomers.length}
              </h3>
            </div>
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Multi-Vertical Clients
              </p>
              <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {multiVerticalCount}
              </h3>
            </div>
            <Layers className="h-6 w-6 text-indigo-500" />
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <CustomerTable
        customers={customers.filter((c) => !c.deleted_at)}
        onEditCustomer={handleEdit}
        onDeleteCustomer={(id) => setDeleteTargetId(id)}
      />

      {/* Create / Edit Modal */}
      <CustomerFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialCustomer={editingCustomer}
        initialVerticalIds={editingVerticalIds}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Customer Account?"
        description="This customer will be soft-deleted and moved to the Recycle Bin. Admins can restore it at any time."
        confirmLabel="Delete Customer"
        onConfirm={() => {
          if (deleteTargetId) {
            deleteCustomer(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
      />
    </div>
  );
}
