'use client';

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { BoardColumn, Card } from '@/types/custom.types';
import { ProjectCard } from './project-card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectColumnProps {
  column: BoardColumn;
  cards: Card[];
  onCardClick: (card: Card) => void;
  onAddCard: (columnId: string) => void;
  onEditColumn: (column: BoardColumn) => void;
  onDeleteColumn: (columnId: string) => void;
}

export function ProjectColumn({
  column,
  cards,
  onCardClick,
  onAddCard,
  onEditColumn,
  onDeleteColumn,
}: ProjectColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', column },
  });

  const cardIds = React.useMemo(() => cards.map((c) => c.id), [cards]);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 shrink-0 rounded-xl border bg-zinc-50/80 p-3 transition-colors dark:bg-zinc-900/50 ${
        isOver
          ? 'border-indigo-400 bg-indigo-50/30 dark:border-indigo-600 dark:bg-indigo-950/20'
          : 'border-zinc-200/80 dark:border-zinc-800/80'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: column.color || '#64748b' }}
          />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
            {column.name}
          </h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-zinc-200/70 px-1.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {cards.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddCard(column.id)}
            className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            title="Add Card"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => onEditColumn(column)}>
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                Rename Column
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteColumn(column.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Cards List */}
      <div className="flex-1 space-y-2.5 min-h-[150px] overflow-y-auto max-h-[calc(100vh-270px)] pr-0.5">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <ProjectCard key={card.id} card={card} onClick={() => onCardClick(card)} />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-center p-3">
            <span className="text-[11px] text-zinc-400">Drag cards here or click + to add</span>
          </div>
        )}
      </div>

      {/* Bottom Quick Add Trigger */}
      <button
        type="button"
        onClick={() => onAddCard(column.id)}
        className="mt-3 flex items-center justify-center gap-1.5 w-full rounded-lg border border-dashed border-zinc-200/80 py-2 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-100/70 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-200"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Add Card</span>
      </button>
    </div>
  );
}
