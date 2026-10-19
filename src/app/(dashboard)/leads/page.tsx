'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users2,
  Table as TableIcon,
  Kanban as KanbanIcon,
  Plus,
  Upload,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { Lead } from '@/types/custom.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LeadTable } from '@/features/leads/lead-table';
import { LeadKanban } from '@/features/leads/lead-kanban';
import { LeadFormModal } from '@/features/leads/lead-form-modal';
import { LeadConvertModal } from '@/features/leads/lead-convert-modal';
import { LeadCsvImportModal } from '@/features/leads/lead-csv-import-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCurrency } from '@/lib/utils';

export default function LeadsPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-xs text-zinc-500">Loading leads pipeline...</div>}>
      <LeadsContent />
    </React.Suspense>
  );
}

function LeadsContent() {
  const searchParams = useSearchParams();
  const { leads, deleteLead } = useCrmData();
  const { verticals, selectedVertical, selectedVerticalId } = useVertical();

  // View state: 'table' vs 'kanban'
  const [viewMode, setViewMode] = React.useState<'table' | 'kanban'>('table');

  // Modal states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingLead, setEditingLead] = React.useState<Lead | null>(null);
  const [convertTargetLead, setConvertTargetLead] = React.useState<Lead | null>(null);
  const [isCsvImportOpen, setIsCsvImportOpen] = React.useState(false);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const [quickAddStageId, setQuickAddStageId] = React.useState<string | undefined>(undefined);

  // Check URL action
  React.useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setEditingLead(null);
      setIsFormOpen(true);
    }
  }, [searchParams]);

  // Filter leads based on selected vertical context
  const activeVerticalId =
    selectedVerticalId !== 'all' ? selectedVerticalId : verticals[0]?.id || '';

  const displayedLeads = React.useMemo(() => {
    if (selectedVerticalId === 'all') {
      return leads.filter((l) => !l.deleted_at);
    }
    return leads.filter((l) => l.vertical_id === selectedVerticalId && !l.deleted_at);
  }, [leads, selectedVerticalId]);

  const totalValue = displayedLeads.reduce((acc, l) => acc + (l.estimated_value || 0), 0);

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  };

  const handleConvert = (lead: Lead) => {
    setConvertTargetLead(lead);
  };

  const handleQuickAdd = (stageId: string) => {
    setEditingLead(null);
    setQuickAddStageId(stageId);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Leads & Opportunity Pipeline
            </h1>
            <Badge variant="secondary" className="font-mono text-xs">
              {displayedLeads.length} Deals
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Total active pipeline value:{' '}
            <strong className="text-zinc-900 dark:text-zinc-100">{formatCurrency(totalValue)}</strong> across{' '}
            {selectedVertical ? selectedVertical.name : 'all business verticals'}.
          </p>
        </div>

        {/* View Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Table / Kanban Toggle */}
          <div className="flex items-center rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white shadow-xs text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white shadow-xs text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <KanbanIcon className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          {/* Import CSV */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCsvImportOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import CSV</span>
          </Button>

          {/* Create Lead */}
          <Button
            size="sm"
            onClick={() => {
              setEditingLead(null);
              setQuickAddStageId(undefined);
              setIsFormOpen(true);
            }}
            className="h-8 gap-1.5 text-xs bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Lead</span>
          </Button>
        </div>
      </div>

      {/* Main Content: Table or Kanban */}
      {viewMode === 'table' ? (
        <LeadTable
          leads={displayedLeads}
          onEditLead={handleEdit}
          onConvertLead={handleConvert}
          onDeleteLead={(id) => setDeleteTargetId(id)}
        />
      ) : (
        <LeadKanban
          leads={displayedLeads}
          verticalId={activeVerticalId}
          onEditLead={handleEdit}
          onConvertLead={handleConvert}
          onQuickAdd={handleQuickAdd}
        />
      )}

      {/* Form Modal (Create & Edit) */}
      <LeadFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialLead={editingLead}
        defaultVerticalId={activeVerticalId}
        defaultStageId={quickAddStageId}
      />

      {/* 1-Click Convert Modal */}
      <LeadConvertModal
        open={convertTargetLead !== null}
        onOpenChange={(open) => !open && setConvertTargetLead(null)}
        lead={convertTargetLead}
      />

      {/* CSV Import Modal */}
      <LeadCsvImportModal
        open={isCsvImportOpen}
        onOpenChange={setIsCsvImportOpen}
        defaultVerticalId={activeVerticalId}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Opportunity?"
        description="This lead will be moved to the Recycle Bin. Admins can restore it at any time."
        confirmLabel="Move to Recycle Bin"
        onConfirm={() => {
          if (deleteTargetId) {
            deleteLead(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
      />
    </div>
  );
}
