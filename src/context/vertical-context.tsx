'use client';

import * as React from 'react';
import { Vertical } from '@/types/custom.types';
import { MOCK_VERTICALS } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';

interface VerticalContextType {
  verticals: Vertical[];
  selectedVertical: Vertical | null;
  selectedVerticalId: string | 'all';
  setSelectedVerticalId: (id: string | 'all') => void;
  createVertical: (newVertical: Omit<Vertical, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<Vertical>;
  updateVertical: (id: string, updates: Partial<Vertical>) => Promise<Vertical>;
  archiveVertical: (id: string) => Promise<void>;
  isLoading: boolean;
  refreshVerticals: () => Promise<void>;
}

const VerticalContext = React.createContext<VerticalContextType | undefined>(undefined);

const STORAGE_KEY = 'crm_selected_vertical_id';
const VERTICALS_STORAGE_KEY = 'crm_custom_verticals';

export function VerticalProvider({ children }: { children: React.ReactNode }) {
  const [verticals, setVerticals] = React.useState<Vertical[]>(MOCK_VERTICALS);
  const [selectedVerticalId, setSelectedVerticalIdState] = React.useState<string | 'all'>('all');
  const [isLoading, setIsLoading] = React.useState(true);

  // Initialize from Supabase or localStorage
  const refreshVerticals = React.useCallback(async () => {
    try {
      const res = await fetch('/api/crm?table=verticals');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setVerticals(json.data);
          localStorage.setItem(VERTICALS_STORAGE_KEY, JSON.stringify(json.data));
          return;
        }
      }
    } catch (e) {
      console.warn('API fetch failed, falling back to local storage', e);
    }

    try {
      const storedVerticals = localStorage.getItem(VERTICALS_STORAGE_KEY);
      if (storedVerticals) {
        const parsed = JSON.parse(storedVerticals);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVerticals(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse vertical data from localStorage', e);
    }
  }, []);

  React.useEffect(() => {
    refreshVerticals().finally(() => setIsLoading(false));

    try {
      const storedSelection = localStorage.getItem(STORAGE_KEY);
      if (storedSelection) {
        setSelectedVerticalIdState(storedSelection);
      }
    } catch (e) {
      console.warn('Failed to parse selected vertical', e);
    }
  }, [refreshVerticals]);

  const setSelectedVerticalId = (id: string | 'all') => {
    setSelectedVerticalIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
      document.cookie = `crm_selected_vertical=${id}; path=/; max-age=31536000; SameSite=Lax`;
    } catch (e) {
      console.warn('Failed to save selected vertical', e);
    }
  };

  const selectedVertical = React.useMemo(() => {
    if (selectedVerticalId === 'all') return null;
    return verticals.find((v) => v.id === selectedVerticalId) || null;
  }, [selectedVerticalId, verticals]);

  const saveVerticalsToStorage = (updated: Vertical[]) => {
    setVerticals(updated);
    try {
      localStorage.setItem(VERTICALS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist custom verticals', e);
    }
  };

  const createVertical = async (data: Omit<Vertical, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Vertical> => {
    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'verticals', action: 'insert', data }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated = [...verticals, json.data];
          saveVerticalsToStorage(updated);
          return json.data;
        }
      }
    } catch (err) {
      console.warn('API vertical insert error, falling back to local persistence:', err);
    }

    const newVertical: Vertical = {
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : `vert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    const updated = [...verticals, newVertical];
    saveVerticalsToStorage(updated);
    return newVertical;
  };

  const updateVertical = async (id: string, updates: Partial<Vertical>): Promise<Vertical> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'verticals', action: 'update', id, data: updates }),
      });
    } catch (err) {
      console.warn('API vertical update error:', err);
    }

    let updatedRecord: Vertical | null = null;
    const updated = verticals.map((v) => {
      if (v.id === id) {
        updatedRecord = { ...v, ...updates, updated_at: new Date().toISOString() };
        return updatedRecord;
      }
      return v;
    });
    if (!updatedRecord) throw new Error('Vertical not found');
    saveVerticalsToStorage(updated);
    return updatedRecord;
  };

  const archiveVertical = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'verticals', action: 'update', id, data: { status: 'archived' } }),
      });
    } catch (err) {
      console.warn('API vertical archive error:', err);
    }

    const updated = verticals.map((v) =>
      v.id === id ? { ...v, status: 'archived' as const, updated_at: new Date().toISOString() } : v
    );
    saveVerticalsToStorage(updated);
    if (selectedVerticalId === id) {
      setSelectedVerticalId('all');
    }
  };

  return (
    <VerticalContext.Provider
      value={{
        verticals,
        selectedVertical,
        selectedVerticalId,
        setSelectedVerticalId,
        createVertical,
        updateVertical,
        archiveVertical,
        isLoading,
        refreshVerticals,
      }}
    >
      {children}
    </VerticalContext.Provider>
  );
}

export function useVertical() {
  const context = React.useContext(VerticalContext);
  if (!context) {
    throw new Error('useVertical must be used within a VerticalProvider');
  }
  return context;
}
