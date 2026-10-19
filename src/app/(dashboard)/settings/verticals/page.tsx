'use client';

import * as React from 'react';
import {
  Plus,
  Edit2,
  Archive,
  RotateCcw,
  Layers,
  GraduationCap,
  Users,
  Cloud,
  BookOpen,
  Briefcase,
  Target,
  Sparkles,
  Compass,
  Check,
  ArrowUp,
  ArrowDown,
  Trash2,
  Settings2,
  FolderKanban,
} from 'lucide-react';
import { useVertical } from '@/context/vertical-context';
import { useAuth } from '@/context/auth-context';
import { Vertical, PipelineStage } from '@/types/custom.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MOCK_STAGES } from '@/lib/mock-data';

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#64748b', // Slate
];

const AVAILABLE_ICONS = [
  { key: 'briefcase', label: 'Briefcase', icon: Briefcase },
  { key: 'graduation-cap', label: 'Graduation', icon: GraduationCap },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'cloud', label: 'Cloud', icon: Cloud },
  { key: 'book-open', label: 'Book', icon: BookOpen },
  { key: 'target', label: 'Target', icon: Target },
  { key: 'sparkles', label: 'Sparkles', icon: Sparkles },
  { key: 'compass', label: 'Compass', icon: Compass },
];

const ICON_MAP: Record<string, React.ElementType> = {
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  GraduationCap: GraduationCap,
  users: Users,
  Users: Users,
  cloud: Cloud,
  Cloud: Cloud,
  'book-open': BookOpen,
  BookOpen: BookOpen,
  target: Target,
  sparkles: Sparkles,
  compass: Compass,
};

export default function VerticalsSettingsPage() {
  const { verticals, createVertical, updateVertical, archiveVertical } = useVertical();
  const { isAdmin } = useAuth();

  const [activeTabVerticalId, setActiveTabVerticalId] = React.useState<string>(verticals[0]?.id || '');
  const [stages, setStages] = React.useState<PipelineStage[]>(MOCK_STAGES);

  // Dialog states
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [editingVertical, setEditingVertical] = React.useState<Vertical | null>(null);
  const [archiveTarget, setArchiveTarget] = React.useState<Vertical | null>(null);

  // Stage editing states
  const [newStageName, setNewStageName] = React.useState('');
  const [isWonStage, setIsWonStage] = React.useState(false);
  const [isLostStage, setIsLostStage] = React.useState(false);

  // Form states for create/edit
  const [formName, setFormName] = React.useState('');
  const [formSlug, setFormSlug] = React.useState('');
  const [formColor, setFormColor] = React.useState(COLOR_PRESETS[0]);
  const [formIcon, setFormIcon] = React.useState('briefcase');
  const [formDesc, setFormDesc] = React.useState('');

  const currentTabVertical = verticals.find((v) => v.id === activeTabVerticalId) || verticals[0];

  const currentVerticalStages = stages
    .filter((s) => s.vertical_id === currentTabVertical?.id && !s.deleted_at)
    .sort((a, b) => a.position - b.position);

  const openCreateDialog = () => {
    setFormName('');
    setFormSlug('');
    setFormColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
    setFormIcon('briefcase');
    setFormDesc('');
    setIsCreateModalOpen(true);
  };

  const openEditDialog = (vert: Vertical) => {
    setEditingVertical(vert);
    setFormName(vert.name);
    setFormSlug(vert.slug);
    setFormColor(vert.color);
    setFormIcon(vert.icon);
    setFormDesc(vert.description || '');
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingVertical) {
      setFormSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  };

  const handleSaveVertical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSlug) return;

    if (editingVertical) {
      await updateVertical(editingVertical.id, {
        name: formName,
        slug: formSlug,
        color: formColor,
        icon: formIcon,
        description: formDesc,
      });
      setEditingVertical(null);
    } else {
      const created = await createVertical({
        name: formName,
        slug: formSlug,
        color: formColor,
        icon: formIcon,
        description: formDesc,
        status: 'active',
        created_by: null,
      });

      // Auto-provision default pipeline stages for this new vertical
      const defaultStages: PipelineStage[] = [
        { id: `stg-${Date.now()}-1`, vertical_id: created.id, name: 'New Lead', position: 1000, color: '#3b82f6', is_won: false, is_lost: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
        { id: `stg-${Date.now()}-2`, vertical_id: created.id, name: 'Contacted', position: 2000, color: '#8b5cf6', is_won: false, is_lost: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
        { id: `stg-${Date.now()}-3`, vertical_id: created.id, name: 'Qualified', position: 3000, color: '#f59e0b', is_won: false, is_lost: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
        { id: `stg-${Date.now()}-4`, vertical_id: created.id, name: 'Proposal Sent', position: 4000, color: '#ec4899', is_won: false, is_lost: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
        { id: `stg-${Date.now()}-5`, vertical_id: created.id, name: 'Won Deal', position: 5000, color: '#10b981', is_won: true, is_lost: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
        { id: `stg-${Date.now()}-6`, vertical_id: created.id, name: 'Lost Deal', position: 6000, color: '#ef4444', is_won: false, is_lost: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null },
      ];
      setStages((prev) => [...prev, ...defaultStages]);
      setActiveTabVerticalId(created.id);
      setIsCreateModalOpen(false);
    }
  };

  const handleAddStage = () => {
    if (!newStageName.trim() || !currentTabVertical) return;
    const maxPos = currentVerticalStages.reduce((max, s) => Math.max(max, s.position), 0);
    const newStage: PipelineStage = {
      id: `stg-${Date.now()}`,
      vertical_id: currentTabVertical.id,
      name: newStageName.trim(),
      position: maxPos + 1000,
      color: isWonStage ? '#10b981' : isLostStage ? '#ef4444' : '#64748b',
      is_won: isWonStage,
      is_lost: isLostStage,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    setStages((prev) => [...prev, newStage]);
    setNewStageName('');
    setIsWonStage(false);
    setIsLostStage(false);
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentVerticalStages.length) return;

    const currentItem = currentVerticalStages[index];
    const targetItem = currentVerticalStages[targetIndex];

    const tempPos = currentItem.position;
    currentItem.position = targetItem.position;
    targetItem.position = tempPos;

    setStages([...stages]);
  };

  const handleDeleteStage = (stageId: string) => {
    setStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, deleted_at: new Date().toISOString() } : s))
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Business Verticals Management
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Configure dynamic workspaces, customize pipeline stages, and manage vertical definitions without code changes.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} size="sm" className="h-8 gap-1.5 text-xs bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900">
            <Plus className="h-3.5 w-3.5" />
            <span>Create Vertical</span>
          </Button>
        )}
      </div>

      {/* Verticals Directory Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {verticals.map((vert) => {
          const Icon = (vert.icon && ICON_MAP[vert.icon]) || Briefcase;
          const isSelected = activeTabVerticalId === vert.id;
          const isArchived = vert.status === 'archived';

          return (
            <Card
              key={vert.id}
              className={`relative overflow-hidden cursor-pointer transition-all ${
                isSelected
                  ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 shadow-md'
                  : 'hover:border-zinc-300 dark:hover:border-zinc-700'
              } ${isArchived ? 'opacity-60 bg-zinc-50 dark:bg-zinc-950/40' : ''}`}
              onClick={() => setActiveTabVerticalId(vert.id)}
            >
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: vert.color }}
              />
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md text-white shadow-xs"
                    style={{ backgroundColor: vert.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {isArchived ? (
                      <Badge variant="destructive" className="text-[10px] h-4">Archived</Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px] h-4">Active</Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-sm font-bold mt-2 truncate">
                  {vert.name}
                </CardTitle>
                <CardDescription className="text-[11px] font-mono text-zinc-400">
                  slug: {vert.slug}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-3">
                <p className="text-xs text-zinc-500 line-clamp-2 h-8">
                  {vert.description || 'No description provided.'}
                </p>
                {isAdmin && (
                  <div className="flex items-center justify-end space-x-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(vert);
                      }}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px] text-zinc-500 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isArchived) {
                          updateVertical(vert.id, { status: 'active' });
                        } else {
                          setArchiveTarget(vert);
                        }
                      }}
                    >
                      {isArchived ? (
                        <>
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </>
                      ) : (
                        <>
                          <Archive className="h-3 w-3 mr-1" />
                          Archive
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Vertical Pipeline Stages Configurator */}
      {currentTabVertical && (
        <Card className="shadow-2xs">
          <CardHeader className="border-b border-zinc-100 p-5 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center space-x-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: currentTabVertical.color }}
                />
                <div>
                  <CardTitle className="text-base font-semibold">
                    {currentTabVertical.name} Pipeline Stages
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure the specific deal and qualification stages for this vertical.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs self-start sm:self-auto font-mono">
                {currentVerticalStages.length} Configured Stages
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Stage Order List */}
            <div className="space-y-2">
              {currentVerticalStages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-center space-x-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-mono font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {idx + 1}
                    </span>
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: stage.color || currentTabVertical.color }}
                    />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {stage.name}
                    </span>
                    {stage.is_won && (
                      <Badge variant="success" className="text-[10px] h-4">Won Stage</Badge>
                    )}
                    {stage.is_lost && (
                      <Badge variant="destructive" className="text-[10px] h-4">Lost Stage</Badge>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === 0}
                        onClick={() => handleMoveStage(idx, 'up')}
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        disabled={idx === currentVerticalStages.length - 1}
                        onClick={() => handleMoveStage(idx, 'down')}
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 hover:text-red-600"
                        onClick={() => handleDeleteStage(stage.id)}
                        title="Remove Stage"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Add Stage Form */}
            {isAdmin && (
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Input
                  placeholder="New stage name (e.g. Technical Discovery, Onboarding Call)..."
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="h-9 text-xs"
                />
                <div className="flex items-center space-x-3 shrink-0">
                  <label className="flex items-center space-x-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isWonStage}
                      onChange={(e) => {
                        setIsWonStage(e.target.checked);
                        if (e.target.checked) setIsLostStage(false);
                      }}
                      className="rounded border-zinc-300"
                    />
                    <span>Won</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLostStage}
                      onChange={(e) => {
                        setIsLostStage(e.target.checked);
                        if (e.target.checked) setIsWonStage(false);
                      }}
                      className="rounded border-zinc-300"
                    />
                    <span>Lost</span>
                  </label>
                  <Button
                    onClick={handleAddStage}
                    size="sm"
                    className="h-9 px-3 text-xs gap-1"
                    disabled={!newStageName.trim()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Stage</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Vertical Modal */}
      <Dialog
        open={isCreateModalOpen || editingVertical !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateModalOpen(false);
            setEditingVertical(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveVertical}>
            <DialogHeader>
              <DialogTitle>
                {editingVertical ? 'Edit Vertical' : 'Create New Vertical'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Verticals define separate business lines with independent pipelines, project boards, and member access.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="v-name" className="text-xs">Vertical Name</Label>
                <Input
                  id="v-name"
                  placeholder="e.g. Executive Search, AI Consulting"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="v-slug" className="text-xs">Slug (URL Identifier)</Label>
                <Input
                  id="v-slug"
                  placeholder="e.g. ai-consulting"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Color Theme</Label>
                <div className="flex items-center space-x-2 pt-1">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-6 w-6 rounded-full cursor-pointer transition-transform ${
                        formColor === color ? 'scale-125 ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Icon</Label>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {AVAILABLE_ICONS.map(({ key, label, icon: IconComponent }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormIcon(key)}
                      className={`flex flex-col items-center justify-center p-2 rounded-md border text-xs cursor-pointer transition-colors ${
                        formIcon === key
                          ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800 font-semibold'
                          : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800'
                      }`}
                    >
                      <IconComponent className="h-4 w-4 mb-1" />
                      <span className="text-[10px] truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="v-desc" className="text-xs">Description (Optional)</Label>
                <Input
                  id="v-desc"
                  placeholder="Brief summary of business model or operations"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingVertical(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                {editingVertical ? 'Save Changes' : 'Create Vertical'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={`Archive Vertical "${archiveTarget?.name}"?`}
        description="Archiving will hide this vertical from the global switcher for regular team members. Leads, customers, and data are safely preserved and can be restored at any time by an Admin."
        confirmLabel="Archive Vertical"
        onConfirm={() => {
          if (archiveTarget) {
            archiveVertical(archiveTarget.id);
            setArchiveTarget(null);
          }
        }}
      />
    </div>
  );
}
