'use client';

import * as React from 'react';
import { Board, BoardColumn, Card, CardComment, CardChecklistItem } from '@/types/custom.types';
import { MOCK_BOARDS, MOCK_BOARD_COLUMNS, MOCK_CARDS } from '@/lib/mock-data';
import { useVertical } from '@/context/vertical-context';

interface ProjectContextType {
  boards: Board[];
  columns: BoardColumn[];
  cards: Card[];
  cardComments: CardComment[];
  activeBoardId: string | null;
  activeBoard: Board | null;
  activeColumns: BoardColumn[];
  activeCards: Card[];
  setActiveBoardId: (id: string) => void;
  createBoard: (board: Omit<Board, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<Board>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<Board>;
  deleteBoard: (id: string) => Promise<void>;
  createColumn: (column: Omit<BoardColumn, 'id' | 'created_at' | 'updated_at'>) => Promise<BoardColumn>;
  updateColumn: (id: string, updates: Partial<BoardColumn>) => Promise<BoardColumn>;
  deleteColumn: (id: string) => Promise<void>;
  createCard: (card: Omit<Card, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<Card>;
  updateCard: (id: string, updates: Partial<Card>) => Promise<Card>;
  moveCard: (cardId: string, targetColumnId: string, targetPosition: number) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  restoreCard: (id: string) => Promise<void>;
  purgeCard: (id: string) => Promise<void>;
  restoreAllCards: () => Promise<void>;
  emptyRecycleBinCards: () => Promise<void>;
  addCardComment: (cardId: string, content: string) => Promise<CardComment>;
  getCardComments: (cardId: string) => CardComment[];
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = React.createContext<ProjectContextType | undefined>(undefined);

const BOARDS_STORAGE_KEY = 'crm_project_boards_v1';
const COLUMNS_STORAGE_KEY = 'crm_project_columns_v1';
const CARDS_STORAGE_KEY = 'crm_project_cards_v1';
const COMMENTS_STORAGE_KEY = 'crm_project_comments_v1';

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { selectedVerticalId } = useVertical();
  const [boards, setBoards] = React.useState<Board[]>(MOCK_BOARDS);
  const [columns, setColumns] = React.useState<BoardColumn[]>(MOCK_BOARD_COLUMNS);
  const [cards, setCards] = React.useState<Card[]>(MOCK_CARDS);
  const [cardComments, setCardComments] = React.useState<CardComment[]>([]);
  const [activeBoardId, setActiveBoardId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Sync with Supabase API
  const refreshProjects = React.useCallback(async () => {
    try {
      const res = await fetch('/api/crm');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (Array.isArray(json.boards) && json.boards.length > 0) {
            setBoards(json.boards);
            localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(json.boards));
          }
          if (Array.isArray(json.boardColumns) && json.boardColumns.length > 0) {
            setColumns(json.boardColumns);
            localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(json.boardColumns));
          }
          if (Array.isArray(json.cards)) {
            const combinedCards = [...json.cards, ...(Array.isArray(json.deletedCards) ? json.deletedCards : [])];
            setCards(combinedCards);
            localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(combinedCards));
          }
          if (Array.isArray(json.cardComments) && json.cardComments.length > 0) {
            setCardComments(json.cardComments);
            localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(json.cardComments));
          }
          return;
        }
      }
    } catch (e) {
      console.warn('API /api/crm fetch for projects failed, using localStorage', e);
    }

    try {
      const storedBoards = localStorage.getItem(BOARDS_STORAGE_KEY);
      if (storedBoards) setBoards(JSON.parse(storedBoards));

      const storedCols = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (storedCols) setColumns(JSON.parse(storedCols));

      const storedCards = localStorage.getItem(CARDS_STORAGE_KEY);
      if (storedCards) setCards(JSON.parse(storedCards));

      const storedComments = localStorage.getItem(COMMENTS_STORAGE_KEY);
      if (storedComments) setCardComments(JSON.parse(storedComments));
    } catch (e) {
      console.warn('Failed to parse projects from localStorage', e);
    }
  }, []);

  React.useEffect(() => {
    refreshProjects().finally(() => setIsLoading(false));
  }, [refreshProjects]);

  // Filter boards according to global vertical selection
  const visibleBoards = React.useMemo(() => {
    const active = boards.filter((b) => !b.deleted_at);
    if (selectedVerticalId === 'all') return active;
    return active.filter((b) => b.vertical_id === selectedVerticalId);
  }, [boards, selectedVerticalId]);

  // Auto-select board when activeBoardId is invalid for current vertical
  React.useEffect(() => {
    if (visibleBoards.length > 0) {
      const currentExists = visibleBoards.some((b) => b.id === activeBoardId);
      if (!currentExists) {
        setActiveBoardId(visibleBoards[0].id);
      }
    } else {
      setActiveBoardId(null);
    }
  }, [visibleBoards, activeBoardId]);

  const activeBoard = React.useMemo(() => {
    return boards.find((b) => b.id === activeBoardId && !b.deleted_at) || null;
  }, [boards, activeBoardId]);

  const activeColumns = React.useMemo(() => {
    if (!activeBoardId) return [];
    return columns
      .filter((c) => c.board_id === activeBoardId)
      .sort((a, b) => a.position - b.position);
  }, [columns, activeBoardId]);

  const activeCards = React.useMemo(() => {
    if (!activeBoardId) return [];
    return cards
      .filter((c) => c.board_id === activeBoardId && !c.deleted_at)
      .sort((a, b) => a.position - b.position);
  }, [cards, activeBoardId]);

  // Persistence helpers
  const saveBoards = (updated: Board[]) => {
    setBoards(updated);
    try {
      localStorage.setItem(BOARDS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist boards', e);
    }
  };

  const saveColumns = (updated: BoardColumn[]) => {
    setColumns(updated);
    try {
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist columns', e);
    }
  };

  const saveCards = (updated: Card[]) => {
    setCards(updated);
    try {
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist cards', e);
    }
  };

  const saveComments = (updated: CardComment[]) => {
    setCardComments(updated);
    try {
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist comments', e);
    }
  };

  // Board CRUD
  const createBoard = async (
    data: Omit<Board, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ): Promise<Board> => {
    const newBoard: Board = {
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : `brd-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'boards', action: 'insert', data: newBoard }),
      });
    } catch (err) {
      console.warn('API board insert error:', err);
    }

    const updated = [...boards, newBoard];
    saveBoards(updated);
    setActiveBoardId(newBoard.id);

    // Auto-create default columns for the new board
    const defaultCols: Array<Omit<BoardColumn, 'id' | 'created_at' | 'updated_at'>> = [
      { board_id: newBoard.id, name: 'Backlog', position: 1000, color: '#64748b' },
      { board_id: newBoard.id, name: 'In Progress', position: 2000, color: '#3b82f6' },
      { board_id: newBoard.id, name: 'In Review', position: 3000, color: '#f59e0b' },
      { board_id: newBoard.id, name: 'Done', position: 4000, color: '#10b981' },
    ];

    for (const c of defaultCols) {
      await createColumn(c);
    }

    return newBoard;
  };

  const updateBoard = async (id: string, updates: Partial<Board>): Promise<Board> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'boards', action: 'update', id, data: updates }),
      });
    } catch (err) {
      console.warn('API board update error:', err);
    }

    let updatedBoard: Board | null = null;
    const updated = boards.map((b) => {
      if (b.id === id) {
        updatedBoard = { ...b, ...updates, updated_at: new Date().toISOString() };
        return updatedBoard;
      }
      return b;
    });

    if (!updatedBoard) throw new Error('Board not found');
    saveBoards(updated);
    return updatedBoard;
  };

  const deleteBoard = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'boards', action: 'delete', id }),
      });
    } catch (err) {
      console.warn('API board delete error:', err);
    }

    const updated = boards.map((b) =>
      b.id === id ? { ...b, deleted_at: new Date().toISOString() } : b
    );
    saveBoards(updated);
  };

  // Column CRUD
  const createColumn = async (
    data: Omit<BoardColumn, 'id' | 'created_at' | 'updated_at'>
  ): Promise<BoardColumn> => {
    const newCol: BoardColumn = {
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'board_columns', action: 'insert', data: newCol }),
      });
    } catch (err) {
      console.warn('API column insert error:', err);
    }

    const updated = [...columns, newCol];
    saveColumns(updated);
    return newCol;
  };

  const updateColumn = async (id: string, updates: Partial<BoardColumn>): Promise<BoardColumn> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'board_columns', action: 'update', id, data: updates }),
      });
    } catch (err) {
      console.warn('API column update error:', err);
    }

    let updatedCol: BoardColumn | null = null;
    const updated = columns.map((c) => {
      if (c.id === id) {
        updatedCol = { ...c, ...updates, updated_at: new Date().toISOString() };
        return updatedCol;
      }
      return c;
    });

    if (!updatedCol) throw new Error('Column not found');
    saveColumns(updated);
    return updatedCol;
  };

  const deleteColumn = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'board_columns', action: 'delete', id }),
      });
    } catch (err) {
      console.warn('API column delete error:', err);
    }

    const updated = columns.filter((c) => c.id !== id);
    saveColumns(updated);
  };

  // Card CRUD
  const createCard = async (
    data: Omit<Card, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ): Promise<Card> => {
    const newCard: Card = {
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : `crd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      labels: data.labels || [],
      checklist: data.checklist || [],
      assignee_ids: data.assignee_ids || [],
      lead_id: data.lead_id || null,
      customer_id: data.customer_id || null,
      created_by: data.created_by || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'cards', action: 'insert', data: newCard }),
      });
    } catch (err) {
      console.warn('API card insert error:', err);
    }

    const updated = [...cards, newCard];
    saveCards(updated);
    return newCard;
  };

  const updateCard = async (id: string, updates: Partial<Card>): Promise<Card> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'cards', action: 'update', id, data: updates }),
      });
    } catch (err) {
      console.warn('API card update error:', err);
    }

    let updatedCard: Card | null = null;
    const updated = cards.map((c) => {
      if (c.id === id) {
        updatedCard = { ...c, ...updates, updated_at: new Date().toISOString() };
        return updatedCard;
      }
      return c;
    });

    if (!updatedCard) throw new Error('Card not found');
    saveCards(updated);
    return updatedCard;
  };

  // Fractional indexing drag & drop card move
  const moveCard = async (
    cardId: string,
    targetColumnId: string,
    targetPosition: number
  ): Promise<void> => {
    // Optimistic local update
    const updated = cards.map((c) => {
      if (c.id === cardId) {
        return {
          ...c,
          column_id: targetColumnId,
          position: targetPosition,
          updated_at: new Date().toISOString(),
        };
      }
      return c;
    });

    saveCards(updated);

    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'cards',
          action: 'update',
          id: cardId,
          data: { column_id: targetColumnId, position: targetPosition },
        }),
      });
    } catch (err) {
      console.warn('API move card error:', err);
    }
  };

  const deleteCard = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'cards', action: 'delete', id }),
      });
    } catch (err) {
      console.warn('API card delete error:', err);
    }

    const updated = cards.map((c) =>
      c.id === id ? { ...c, deleted_at: new Date().toISOString() } : c
    );
    saveCards(updated);
  };

  const restoreCard = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'cards', action: 'restore', id }),
      });
    } catch (err) {
      console.warn('API card restore error:', err);
    }

    const updated = cards.map((c) =>
      c.id === id ? { ...c, deleted_at: null, updated_at: new Date().toISOString() } : c
    );
    saveCards(updated);
  };

  const purgeCard = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'cards', action: 'purge', id }),
      });
    } catch (err) {
      console.warn('API card purge error:', err);
    }

    const updated = cards.filter((c) => c.id !== id);
    saveCards(updated);
  };

  const restoreAllCards = async (): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'cards', action: 'restore_all' }),
      });
    } catch (err) {
      console.warn('API restore all cards error:', err);
    }

    const updated = cards.map((c) => ({ ...c, deleted_at: null }));
    saveCards(updated);
  };

  const emptyRecycleBinCards = async (): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'cards', action: 'purge_all' }),
      });
    } catch (err) {
      console.warn('API empty recycle bin cards error:', err);
    }

    const updated = cards.filter((c) => !c.deleted_at);
    saveCards(updated);
  };

  // Comments
  const addCardComment = async (cardId: string, content: string): Promise<CardComment> => {
    const newComment: CardComment = {
      id: crypto.randomUUID ? crypto.randomUUID() : `cmt-${Date.now()}`,
      card_id: cardId,
      content,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'card_comments', action: 'insert', data: newComment }),
      });
    } catch (err) {
      console.warn('API card comment insert error:', err);
    }

    const updated = [...cardComments, newComment];
    saveComments(updated);
    return newComment;
  };

  const getCardComments = (cardId: string): CardComment[] => {
    return cardComments
      .filter((c) => c.card_id === cardId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  return (
    <ProjectContext.Provider
      value={{
        boards: visibleBoards,
        columns: activeColumns,
        cards: activeCards,
        cardComments,
        activeBoardId,
        activeBoard,
        activeColumns,
        activeCards,
        setActiveBoardId,
        createBoard,
        updateBoard,
        deleteBoard,
        createColumn,
        updateColumn,
        deleteColumn,
        createCard,
        updateCard,
        moveCard,
        deleteCard,
        restoreCard,
        purgeCard,
        restoreAllCards,
        emptyRecycleBinCards,
        addCardComment,
        getCardComments,
        isLoading,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = React.useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
