'use client';

import * as React from 'react';
import { Board } from '@/types/custom.types';
import { useVertical } from '@/context/vertical-context';
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

interface BoardFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; vertical_id: string }) => Promise<void>;
  boardToEdit?: Board | null;
}

export function BoardFormModal({
  isOpen,
  onClose,
  onSubmit,
  boardToEdit,
}: BoardFormModalProps) {
  const { verticals, selectedVerticalId } = useVertical();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [verticalId, setVerticalId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (boardToEdit) {
      setName(boardToEdit.name);
      setDescription(boardToEdit.description || '');
      setVerticalId(boardToEdit.vertical_id);
    } else {
      setName('');
      setDescription('');
      setVerticalId(
        selectedVerticalId !== 'all' ? selectedVerticalId : (verticals[0]?.id || '')
      );
    }
  }, [boardToEdit, selectedVerticalId, verticals, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !verticalId) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        vertical_id: verticalId,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save board:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            {boardToEdit ? 'Edit Project Board' : 'Create New Project Board'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Board Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Client Onboarding"
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Business Vertical</Label>
            <select
              value={verticalId}
              onChange={(e) => setVerticalId(e.target.value)}
              required
              className="w-full text-xs h-9 rounded-md border border-zinc-300 bg-white px-3 py-1 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              {verticals.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description (Optional)</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief summary of projects, deliverables, or team scope..."
              className="w-full text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 p-2.5 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
            />
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
              {isSubmitting ? 'Saving...' : boardToEdit ? 'Save Changes' : 'Create Board'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
