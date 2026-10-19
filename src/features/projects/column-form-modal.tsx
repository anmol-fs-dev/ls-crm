'use client';

import * as React from 'react';
import { BoardColumn } from '@/types/custom.types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColumnFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; color: string }) => Promise<void>;
  columnToEdit?: BoardColumn | null;
}

const PRESET_COLORS = [
  '#64748b', // Slate
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#ef4444', // Red
];

export function ColumnFormModal({
  isOpen,
  onClose,
  onSubmit,
  columnToEdit,
}: ColumnFormModalProps) {
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (columnToEdit) {
      setName(columnToEdit.name);
      setColor(columnToEdit.color || PRESET_COLORS[0]);
    } else {
      setName('');
      setColor(PRESET_COLORS[1]);
    }
  }, [columnToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), color });
      onClose();
    } catch (err) {
      console.error('Failed to save column:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            {columnToEdit ? 'Rename Column' : 'Add Board Column'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Column Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. In Security Review"
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Column Accent Color</Label>
            <div className="flex items-center gap-2 pt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? 'Saving...' : columnToEdit ? 'Save Changes' : 'Add Column'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
