'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MoreHorizontal,
  UserCheck,
  Building,
  DollarSign,
  GripVertical,
  Plus,
} from 'lucide-react';
import { Lead, PipelineStage, Vertical } from '@/types/custom.types';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, calculateFractionalPosition } from '@/lib/utils';
import { MOCK_PROFILES, MOCK_STAGES } from '@/lib/mock-data';

interface LeadKanbanProps {
  leads: Lead[];
  verticalId: string;
  onEditLead: (lead: Lead) => void;
  onConvertLead: (lead: Lead) => void;
  onQuickAdd: (stageId: string) => void;
}

// Single Sortable Lead Card
function KanbanCard({
  lead,
  onConvertLead,
  isOverlay = false,
}: {
  lead: Lead;
  onConvertLead?: (lead: Lead) => void;
  isOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    data: { lead },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const owner = MOCK_PROFILES.find((p) => p.id === lead.owner_id);
  const isConverted = Boolean(lead.converted_to_customer_id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-zinc-200 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900 transition-shadow ${
        isOverlay ? 'shadow-xl ring-2 ring-zinc-900 dark:ring-zinc-100 rotate-1' : 'hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col truncate">
          <Link
            href={`/leads/${lead.id}`}
            className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:underline truncate"
          >
            {lead.name}
          </Link>
          <span className="text-[11px] text-zinc-500 truncate mt-0.5">
            {lead.company || lead.email || 'Direct Opportunity'}
          </span>
        </div>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab text-zinc-400 hover:text-zinc-600 p-0.5 rounded"
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
          {formatCurrency(lead.estimated_value)}
        </span>
        {isConverted ? (
          <Badge variant="success" className="text-[9px] px-1 py-0 h-4">
            Converted
          </Badge>
        ) : onConvertLead ? (
          <button
            onClick={() => onConvertLead(lead)}
            className="flex items-center space-x-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
            title="Convert to Customer"
          >
            <UserCheck className="h-3 w-3" />
            <span>Convert</span>
          </button>
        ) : null}
      </div>

      {lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 2).map((t) => (
            <span
              key={t}
              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {t}
            </span>
          ))}
          {lead.tags.length > 2 && (
            <span className="text-[9px] text-zinc-400">+{lead.tags.length - 2}</span>
          )}
        </div>
      )}

      {owner && (
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400">
          <span>Owner</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{owner.full_name}</span>
        </div>
      )}
    </div>
  );
}

// Droppable Stage Column
function KanbanColumn({
  stage,
  leads,
  onConvertLead,
  onQuickAdd,
}: {
  stage: PipelineStage;
  leads: Lead[];
  onConvertLead: (lead: Lead) => void;
  onQuickAdd: (stageId: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
    data: { stage },
  });

  const totalValue = leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col flex-1 min-w-[270px] max-w-[320px] rounded-xl bg-zinc-100/60 p-3 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center space-x-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stage.color || '#3b82f6' }}
          />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{stage.name}</h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-mono font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {leads.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          onClick={() => onQuickAdd(stage.id)}
          title="Add lead to stage"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Stage Value Metric */}
      <div className="pb-2 text-[11px] font-medium text-zinc-500">
        Total: <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(totalValue)}</span>
      </div>

      {/* Cards Container */}
      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} onConvertLead={onConvertLead} />
          ))}
          {leads.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-zinc-200 text-center text-xs text-zinc-400 dark:border-zinc-800">
              Drop deals here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function LeadKanban({
  leads,
  verticalId,
  onConvertLead,
  onQuickAdd,
}: LeadKanbanProps) {
  const { updateLeadStage } = useCrmData();
  const [activeDragLead, setActiveDragLead] = React.useState<Lead | null>(null);

  const stages = React.useMemo(() => {
    return MOCK_STAGES.filter((s) => s.vertical_id === verticalId && !s.deleted_at).sort(
      (a, b) => a.position - b.position
    );
  }, [verticalId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const found = leads.find((l) => l.id === active.id);
    if (found) setActiveDragLead(found);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragLead(null);
    if (!over) return;

    const leadId = active.id as string;
    const activeLead = leads.find((l) => l.id === leadId);
    if (!activeLead) return;

    // Check if dropped onto a stage column directly or another card
    let targetStageId = '';
    const isOverAStage = stages.some((s) => s.id === over.id);

    if (isOverAStage) {
      targetStageId = over.id as string;
    } else {
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) targetStageId = overLead.stage_id;
    }

    if (!targetStageId) return;

    // Calculate fractional position
    const stageLeads = leads
      .filter((l) => l.stage_id === targetStageId && l.id !== leadId)
      .sort((a, b) => a.position - b.position);

    let newPosition = 1000;
    if (stageLeads.length > 0) {
      const overIndex = stageLeads.findIndex((l) => l.id === over.id);
      if (overIndex === -1) {
        // Dropped at bottom of stage
        const last = stageLeads[stageLeads.length - 1];
        newPosition = calculateFractionalPosition(last.position, null);
      } else {
        const prev = stageLeads[overIndex - 1]?.position ?? null;
        const next = stageLeads[overIndex]?.position ?? null;
        newPosition = calculateFractionalPosition(prev, next);
      }
    }

    const targetStageName = stages.find((s) => s.id === targetStageId)?.name;
    await updateLeadStage(leadId, targetStageId, newPosition, targetStageName);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6">
        {stages.map((stage) => {
          const stageLeads = leads
            .filter((l) => l.stage_id === stage.id)
            .sort((a, b) => a.position - b.position);

          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={stageLeads}
              onConvertLead={onConvertLead}
              onQuickAdd={onQuickAdd}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeDragLead ? <KanbanCard lead={activeDragLead} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
