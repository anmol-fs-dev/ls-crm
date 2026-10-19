'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Link2,
  Building2,
  Trash2,
  Plus,
  X,
  ExternalLink,
  Clock,
  User,
  Tag,
  AlignLeft,
} from 'lucide-react';
import { Card, BoardColumn, CardChecklistItem } from '@/types/custom.types';
import { useProject } from '@/context/project-context';
import { useCrmData } from '@/context/crm-data-context';
import { MOCK_PROFILES } from '@/lib/mock-data';
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
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface CardModalProps {
  card: Card | null;
  columns: BoardColumn[];
  isOpen: boolean;
  onClose: () => void;
}

export function CardModal({ card, columns, isOpen, onClose }: CardModalProps) {
  const { updateCard, deleteCard, addCardComment, getCardComments } = useProject();
  const { leads, customers } = useCrmData();

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [columnId, setColumnId] = React.useState('');
  const [priority, setPriority] = React.useState<Card['priority']>('medium');
  const [dueDate, setDueDate] = React.useState('');
  const [labels, setLabels] = React.useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = React.useState('');
  const [checklist, setChecklist] = React.useState<CardChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = React.useState('');
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>([]);
  const [leadId, setLeadId] = React.useState<string>('');
  const [customerId, setCustomerId] = React.useState<string>('');
  const [commentInput, setCommentInput] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Sync state when card changes
  React.useEffect(() => {
    if (card) {
      setTitle(card.title || '');
      setDescription(card.description || '');
      setColumnId(card.column_id || (columns[0]?.id || ''));
      setPriority(card.priority || 'medium');
      setDueDate(card.due_date ? card.due_date.slice(0, 10) : '');
      setLabels(card.labels || []);
      setChecklist(
        Array.isArray(card.checklist)
          ? (card.checklist as unknown as CardChecklistItem[])
          : []
      );
      setAssigneeIds(card.assignee_ids || []);
      setLeadId(card.lead_id || '');
      setCustomerId(card.customer_id || '');
      setShowDeleteConfirm(false);
    }
  }, [card, columns]);

  if (!card) return null;

  const comments = getCardComments(card.id);

  // Checklist stats
  const totalChecklist = checklist.length;
  const completedChecklist = checklist.filter((i) => i.is_completed).length;
  const progressPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  // Handlers
  const handleAddLabel = () => {
    const trimmed = newLabelInput.trim();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels([...labels, trimmed]);
      setNewLabelInput('');
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter((l) => l !== labelToRemove));
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === id ? { ...item, is_completed: !item.is_completed } : item
      )
    );
  };

  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    const newItem: CardChecklistItem = {
      id: `chk-${Date.now()}`,
      title: newChecklistText.trim(),
      is_completed: false,
    };
    setChecklist([...checklist, newItem]);
    setNewChecklistText('');
  };

  const handleDeleteChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleToggleAssignee = (profileId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(profileId) ? prev.filter((id) => id !== profileId) : [...prev, profileId]
    );
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    await addCardComment(card.id, commentInput.trim());
    setCommentInput('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCard(card.id, {
        title,
        description,
        column_id: columnId,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        labels,
        checklist: checklist as any,
        assignee_ids: assigneeIds,
        lead_id: leadId || null,
        customer_id: customerId || null,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save card:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCard(card.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  };

  // Find linked entity objects
  const linkedLead = leads.find((l) => l.id === leadId);
  const linkedCustomer = customers.find((c) => c.id === customerId);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:rounded-xl">
        <DialogHeader className="border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-lg font-bold text-zinc-900 dark:text-zinc-50 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1"
                placeholder="Card title..."
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                in column{' '}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {columns.find((c) => c.id === columnId)?.name || 'Unknown'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 text-xs"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          {/* Left Column (2 spans): Description, Checklist, Comments */}
          <div className="md:col-span-2 space-y-6">
            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                <AlignLeft className="h-4 w-4 text-zinc-500" />
                <span>Description & Specs</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Add card details, technical requirements, acceptance criteria..."
                className="w-full text-xs rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:bg-zinc-900 leading-relaxed"
              />
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <CheckSquare className="h-4 w-4 text-zinc-500" />
                  <span>Checklist & Subtasks</span>
                </div>
                {totalChecklist > 0 && (
                  <span className="text-[11px] font-medium text-zinc-500">
                    {completedChecklist}/{totalChecklist} ({progressPercent}%)
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {totalChecklist > 0 && (
                <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}

              {/* Checklist items list */}
              <div className="space-y-1.5">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between gap-2 rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-xs"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() => handleToggleChecklist(item.id)}
                        className="h-3.5 w-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-700"
                      />
                      <span
                        className={
                          item.is_completed
                            ? 'line-through text-zinc-400 dark:text-zinc-500'
                            : 'text-zinc-800 dark:text-zinc-200'
                        }
                      >
                        {item.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity p-0.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add checklist item */}
              <form onSubmit={handleAddChecklist} className="flex gap-2 pt-1">
                <Input
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  placeholder="Add a subtask item..."
                  className="h-8 text-xs flex-1"
                />
                <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </form>
            </div>

            {/* Comments Thread */}
            <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                <MessageSquare className="h-4 w-4 text-zinc-500" />
                <span>Discussion & Activity ({comments.length})</span>
              </div>

              {/* Existing Comments list */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">No comments yet. Start the conversation.</p>
                ) : (
                  comments.map((cmt) => (
                    <div
                      key={cmt.id}
                      className="rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-1">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">Team Member</span>
                        <span>{formatDate(cmt.created_at)}</span>
                      </div>
                      <p className="text-zinc-800 dark:text-zinc-200 leading-relaxed">{cmt.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                <Input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Write a comment or update..."
                  className="h-8 text-xs flex-1"
                />
                <Button type="submit" size="sm" className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                  Post
                </Button>
              </form>
            </div>
          </div>

          {/* Right Column (1 span): Metadata & Entity Linkage */}
          <div className="space-y-5 bg-zinc-50/50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 text-xs">
            {/* Column Selector */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-zinc-500">Board Column</Label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full text-xs h-8 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selector */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-zinc-500">Priority Level</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Card['priority'])}
                className="w-full text-xs h-8 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-zinc-500">Due Date</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-xs bg-white dark:bg-zinc-800"
              />
            </div>

            {/* Labels Manager */}
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-zinc-500 flex items-center justify-between">
                <span>Labels</span>
                <Tag className="h-3 w-3 text-zinc-400" />
              </Label>
              <div className="flex flex-wrap gap-1">
                {labels.map((l) => (
                  <span
                    key={l}
                    className="inline-flex items-center gap-1 rounded bg-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                  >
                    {l}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(l)}
                      className="hover:text-red-500"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={newLabelInput}
                  onChange={(e) => setNewLabelInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                  placeholder="New label..."
                  className="h-7 text-[11px] flex-1 bg-white dark:bg-zinc-800"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLabel}
                  className="h-7 px-2 text-[11px]"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Link to Lead */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                  <Link2 className="h-3 w-3 text-indigo-500" />
                  <span>Linked Lead</span>
                </Label>
                {linkedLead && (
                  <Link
                    href={`/leads/${linkedLead.id}`}
                    target="_blank"
                    className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                  >
                    View <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                )}
              </div>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="w-full text-xs h-8 rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">No linked lead</option>
                {leads
                  .filter((l) => !l.deleted_at)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.company || 'Individual'})
                    </option>
                  ))}
              </select>
            </div>

            {/* Link to Customer */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-emerald-500" />
                  <span>Linked Customer</span>
                </Label>
                {linkedCustomer && (
                  <Link
                    href={`/customers/${linkedCustomer.id}`}
                    target="_blank"
                    className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                  >
                    View <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                )}
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full text-xs h-8 rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">No linked customer</option>
                {customers
                  .filter((c) => !c.deleted_at)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
              </select>
            </div>

            {/* Assignees */}
            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <Label className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                <User className="h-3 w-3 text-zinc-400" />
                <span>Assigned Members</span>
              </Label>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {MOCK_PROFILES.map((profile) => {
                  const isAssigned = assigneeIds.includes(profile.id);
                  return (
                    <button
                      type="button"
                      key={profile.id}
                      onClick={() => handleToggleAssignee(profile.id)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                        isAssigned
                          ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200 font-medium'
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <span className="truncate">{profile.full_name}</span>
                      {isAssigned && <span className="text-indigo-600 font-bold text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-200 pt-4 dark:border-zinc-800 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Card Confirmation Dialog */}
    <ConfirmDialog
      open={showDeleteConfirm}
      onOpenChange={setShowDeleteConfirm}
      title={`Delete Card "${card.title}"?`}
      description="Are you sure you want to delete this project card? This record will be removed from this board."
      confirmLabel="Delete Card"
      onConfirm={handleDelete}
    />
  </>
  );
}
