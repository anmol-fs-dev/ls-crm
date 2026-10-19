'use client';

import * as React from 'react';
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
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  Kanban,
  Plus,
  Search,
  Filter,
  Columns,
  Layers,
  ChevronDown,
  Sparkles,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Board, BoardColumn, Card } from '@/types/custom.types';
import { useProject } from '@/context/project-context';
import { useVertical } from '@/context/vertical-context';
import { ProjectColumn } from './project-column';
import { ProjectCard } from './project-card';
import { CardModal } from './card-modal';
import { BoardFormModal } from './board-form-modal';
import { ColumnFormModal } from './column-form-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function ProjectBoard() {
  const {
    boards,
    columns,
    cards,
    activeBoardId,
    activeBoard,
    setActiveBoardId,
    createBoard,
    updateBoard,
    deleteBoard,
    createColumn,
    updateColumn,
    deleteColumn,
    createCard,
    moveCard,
  } = useProject();

  const { verticals, selectedVerticalId, setSelectedVerticalId } = useVertical();

  // Search and filter states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');

  // Modals state
  const [selectedCard, setSelectedCard] = React.useState<Card | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = React.useState(false);

  const [isBoardModalOpen, setIsBoardModalOpen] = React.useState(false);
  const [boardToEdit, setBoardToEdit] = React.useState<Board | null>(null);

  const [isColumnModalOpen, setIsColumnModalOpen] = React.useState(false);
  const [columnToEdit, setColumnToEdit] = React.useState<BoardColumn | null>(null);

  // Delete confirmation states
  const [isDeleteBoardOpen, setIsDeleteBoardOpen] = React.useState(false);
  const [columnToDelete, setColumnToDelete] = React.useState<BoardColumn | null>(null);

  // Dragging card state for overlay
  const [activeCard, setActiveCard] = React.useState<Card | null>(null);

  // Sensors for drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter cards by search and priority
  const filteredCards = React.useMemo(() => {
    return cards.filter((card) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = card.title.toLowerCase().includes(q);
        const matchesDesc = (card.description || '').toLowerCase().includes(q);
        const matchesLabels = (card.labels || []).some((l) => l.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesLabels) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && card.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [cards, searchQuery, priorityFilter]);

  // Handle Drag Start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    if (card) {
      setActiveCard(card);
    }
  };

  // Handle Drag End with fractional indexing calculation
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeCardId = active.id as string;
    const overId = over.id as string;

    const currentCard = cards.find((c) => c.id === activeCardId);
    if (!currentCard) return;

    // Determine target column and target position
    let targetColumnId = '';
    let targetPosition = 1000;

    // Case 1: Dropped directly onto a column container
    const isColumn = columns.some((c) => c.id === overId);
    if (isColumn) {
      targetColumnId = overId;
      const columnCards = cards
        .filter((c) => c.column_id === targetColumnId && c.id !== activeCardId)
        .sort((a, b) => a.position - b.position);

      if (columnCards.length > 0) {
        targetPosition = columnCards[columnCards.length - 1].position + 1000;
      } else {
        targetPosition = 1000;
      }
    } else {
      // Case 2: Dropped over another card in a column
      const overCard = cards.find((c) => c.id === overId);
      if (!overCard) return;

      targetColumnId = overCard.column_id;
      const columnCards = cards
        .filter((c) => c.column_id === targetColumnId && c.id !== activeCardId)
        .sort((a, b) => a.position - b.position);

      const overIndex = columnCards.findIndex((c) => c.id === overId);

      if (overIndex === 0) {
        // Dropped at the top of the column
        targetPosition = Math.max(10, columnCards[0].position / 2);
      } else if (overIndex === columnCards.length - 1) {
        // Dropped at the bottom
        targetPosition = columnCards[columnCards.length - 1].position + 1000;
      } else {
        // Dropped between two cards -> fractional positioning
        const prevCard = columnCards[overIndex - 1];
        const nextCard = columnCards[overIndex];
        targetPosition = (prevCard.position + nextCard.position) / 2;
      }
    }

    if (currentCard.column_id !== targetColumnId || Math.abs(currentCard.position - targetPosition) > 0.01) {
      await moveCard(activeCardId, targetColumnId, targetPosition);
    }
  };

  // Card clicks
  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    setIsCardModalOpen(true);
  };

  const handleQuickAddCard = async (colId: string) => {
    const colCards = cards.filter((c) => c.column_id === colId);
    const newPosition = colCards.length > 0 ? colCards[colCards.length - 1].position + 1000 : 1000;

    const newCard = await createCard({
      board_id: activeBoardId || '',
      column_id: colId,
      title: 'New Task Card',
      description: '',
      position: newPosition,
      priority: 'medium',
      due_date: null,
      labels: [],
      checklist: [],
      assignee_ids: [],
      lead_id: null,
      customer_id: null,
      created_by: null,
    });

    setSelectedCard(newCard);
    setIsCardModalOpen(true);
  };

  // Board actions
  const handleSaveBoard = async (data: { name: string; description?: string; vertical_id: string }) => {
    if (boardToEdit) {
      await updateBoard(boardToEdit.id, data);
    } else {
      await createBoard({
        name: data.name,
        vertical_id: data.vertical_id,
        description: data.description || null,
        created_by: null,
      });
    }
  };

  const handleDeleteActiveBoard = async () => {
    if (!activeBoardId) return;
    await deleteBoard(activeBoardId);
    setIsDeleteBoardOpen(false);
  };

  // Column actions
  const handleSaveColumn = async (data: { name: string; color: string }) => {
    if (columnToEdit) {
      await updateColumn(columnToEdit.id, data);
    } else {
      const colCount = columns.length;
      await createColumn({
        board_id: activeBoardId || '',
        name: data.name,
        color: data.color,
        position: (colCount + 1) * 1000,
      });
    }
  };

  const handleDeleteColumnConfirm = async () => {
    if (columnToDelete) {
      await deleteColumn(columnToDelete.id);
      setColumnToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Board Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Project Planner Kanban
            </h1>
            <Badge variant="outline" className="text-xs bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200/60">
              Fractional Ordering
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage operations, onboarding sprints, and custom deliverables across business verticals.
          </p>
        </div>

        {/* Board Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Board Selector */}
          {boards.length > 0 && (
            <div className="relative">
              <select
                value={activeBoardId || ''}
                onChange={(e) => setActiveBoardId(e.target.value)}
                className="h-8 rounded-lg border border-zinc-200 bg-white px-3 py-1 pr-8 text-xs font-semibold text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {boards.map((b) => {
                  const vert = verticals.find((v) => v.id === b.vertical_id);
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} {vert ? `(${vert.name})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* New Board Button */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              setBoardToEdit(null);
              setIsBoardModalOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Board
          </Button>

          {/* Add Column Button */}
          {activeBoard && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                setColumnToEdit(null);
                setIsColumnModalOpen(true);
              }}
            >
              <Columns className="h-3.5 w-3.5 mr-1" />
              Add Column
            </Button>
          )}

          {/* Board Settings button */}
          {activeBoard && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              onClick={() => {
                setBoardToEdit(activeBoard);
                setIsBoardModalOpen(true);
              }}
              title="Edit Board Info"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Settings
            </Button>
          )}

          {/* Delete Board button */}
          {activeBoard && boards.length > 1 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
              onClick={() => setIsDeleteBoardOpen(true)}
              title="Delete Active Board"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete Board
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      {activeBoard && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200/80 shadow-sm dark:bg-zinc-900/60 dark:border-zinc-800/80">
          <div className="flex flex-1 items-center gap-2 max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards, labels, specs..."
                className="h-8 pl-8 text-xs bg-zinc-50/50 dark:bg-zinc-800/50"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Priority filter */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Filter className="h-3.5 w-3.5 text-zinc-400" />
              <span>Priority:</span>
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      )}

      {/* Main Kanban Board View */}
      {boards.length === 0 ? (
        <EmptyState
          icon={Kanban}
          title="No Project Boards Created"
          description="Create your first Kanban board to organize client deliverables, onboarding steps, and technical operations."
          actionLabel="Create Board"
          onAction={() => {
            setBoardToEdit(null);
            setIsBoardModalOpen(true);
          }}
        />
      ) : columns.length === 0 ? (
        <EmptyState
          icon={Columns}
          title="No Columns in this Board"
          description="Add customized workflow columns like Backlog, In Progress, Review, and Completed."
          actionLabel="Add Column"
          onAction={() => {
            setColumnToEdit(null);
            setIsColumnModalOpen(true);
          }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-6 items-start">
            {columns.map((column) => {
              const columnCards = filteredCards
                .filter((card) => card.column_id === column.id)
                .sort((a, b) => a.position - b.position);

              return (
                <ProjectColumn
                  key={column.id}
                  column={column}
                  cards={columnCards}
                  onCardClick={handleCardClick}
                  onAddCard={handleQuickAddCard}
                  onEditColumn={(col) => {
                    setColumnToEdit(col);
                    setIsColumnModalOpen(true);
                  }}
                  onDeleteColumn={(colId) => {
                    const col = columns.find((c) => c.id === colId);
                    setColumnToDelete(col || ({ id: colId, name: 'this column' } as BoardColumn));
                  }}
                />
              );
            })}
          </div>

          {/* Floating Drag Overlay */}
          <DragOverlay>
            {activeCard ? <ProjectCard card={activeCard} onClick={() => {}} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modals */}
      <CardModal
        card={selectedCard}
        columns={columns}
        isOpen={isCardModalOpen}
        onClose={() => {
          setIsCardModalOpen(false);
          setSelectedCard(null);
        }}
      />

      <BoardFormModal
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        onSubmit={handleSaveBoard}
        boardToEdit={boardToEdit}
      />

      <ColumnFormModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        onSubmit={handleSaveColumn}
        columnToEdit={columnToEdit}
      />

      {/* Delete Board Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteBoardOpen}
        onOpenChange={setIsDeleteBoardOpen}
        title={`Delete Board "${activeBoard?.name || 'Project Board'}"?`}
        description="Are you sure you want to delete this project board? All columns and cards associated with this board will be permanently removed."
        confirmLabel="Delete Board"
        onConfirm={handleDeleteActiveBoard}
      />

      {/* Delete Column Confirmation Dialog */}
      <ConfirmDialog
        open={columnToDelete !== null}
        onOpenChange={(open) => !open && setColumnToDelete(null)}
        title={`Delete Column "${columnToDelete?.name || ''}"?`}
        description="Are you sure you want to delete this column? All cards inside this column will also be removed."
        confirmLabel="Delete Column"
        onConfirm={handleDeleteColumnConfirm}
      />
    </div>
  );
}
