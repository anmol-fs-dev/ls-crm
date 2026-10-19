'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  DollarSign,
  User,
  Calendar,
  Tag,
  Clock,
  UserCheck,
  Edit2,
  Trash2,
  Plus,
  MessageSquare,
  PhoneCall,
  CalendarCheck,
  Send,
  Layers,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { Activity, Lead, Task } from '@/types/custom.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LeadFormModal } from '@/features/leads/lead-form-modal';
import { LeadConvertModal } from '@/features/leads/lead-convert-modal';
import { TaskFormModal } from '@/features/tasks/task-form-modal';
import { TaskItem } from '@/features/tasks/task-item';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import { MOCK_PROFILES, MOCK_STAGES } from '@/lib/mock-data';

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  note: MessageSquare,
  call: PhoneCall,
  meeting: CalendarCheck,
  email: Send,
  stage_change: Clock,
  converted: UserCheck,
  system: CheckCircle2,
};

export default function LeadDetailPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-xs text-zinc-500">Loading opportunity...</div>}>
      <LeadDetailContent />
    </React.Suspense>
  );
}

function LeadDetailContent() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const { leads, tasks, deleteTask, updateLeadStage, deleteLead, addActivity, getEntityActivities, getCustomFieldsForVertical } = useCrmData();
  const { verticals } = useVertical();

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isConvertOpen, setIsConvertOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);

  // Activity Log State
  const [activityType, setActivityType] = React.useState<Activity['activity_type']>('note');
  const [activityTitle, setActivityTitle] = React.useState('');
  const [activityDesc, setActivityDesc] = React.useState('');
  const [isLogging, setIsLogging] = React.useState(false);
  const [deletingTaskId, setDeletingTaskId] = React.useState<string | null>(null);

  const lead = leads.find((l) => l.id === leadId);

  // Linked Tasks
  const linkedTasks = React.useMemo(() => {
    if (!lead) return [];
    return tasks.filter((t) => t.lead_id === lead.id && !t.deleted_at);
  }, [lead, tasks]);

  const stage = MOCK_STAGES.find((s) => s.id === lead?.stage_id);
  const vertical = verticals.find((v) => v.id === lead?.vertical_id);
  const owner = MOCK_PROFILES.find((p) => p.id === lead?.owner_id);
  const availableStages = MOCK_STAGES.filter((s) => s.vertical_id === lead?.vertical_id && !s.deleted_at);
  const customFieldDefs = lead ? getCustomFieldsForVertical(lead.vertical_id, 'lead') : [];

  const timelineActivities = lead ? getEntityActivities('lead', lead.id) : [];

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-base font-semibold">Lead Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-4">This opportunity might have been removed or deleted.</p>
        <Button size="sm" asChild>
          <Link href="/leads">Return to Pipeline</Link>
        </Button>
      </div>
    );
  }

  const isConverted = Boolean(lead.converted_to_customer_id);

  const handleStageChange = async (newStageId: string) => {
    const stg = availableStages.find((s) => s.id === newStageId);
    await updateLeadStage(lead.id, newStageId, 1000, stg?.name);
  };

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim()) return;

    setIsLogging(true);
    await addActivity({
      entity_type: 'lead',
      entity_id: lead.id,
      vertical_id: lead.vertical_id,
      activity_type: activityType,
      title: activityTitle.trim(),
      description: activityDesc.trim() || null,
    });
    setActivityTitle('');
    setActivityDesc('');
    setIsLogging(false);
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/leads" title="Back to pipeline">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {lead.name}
              </h1>
              {isConverted ? (
                <Badge variant="success" className="text-xs">
                  Converted to Customer
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  Active Opportunity
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center space-x-2">
              <span>{lead.company || 'Individual Prospect'}</span>
              {vertical && (
                <>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: vertical.color }} />
                    <span>{vertical.name}</span>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!isConverted && (
            <Button
              size="sm"
              onClick={() => setIsConvertOpen(true)}
              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Convert to Customer</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Edit2 className="h-3 w-3" />
            <span>Edit</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Grid: Details (Left 1 col) + Timeline (Right 2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Deal & Profile Overview */}
        <div className="space-y-6">
          {/* Stage Progression Selector */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Current Pipeline Stage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1 space-y-3">
              <select
                value={lead.stage_id}
                onChange={(e) => handleStageChange(e.target.value)}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-xs font-medium shadow-xs dark:border-zinc-800"
              >
                {availableStages.map((stg) => (
                  <option key={stg.id} value={stg.id}>
                    {stg.name} {stg.is_won ? '✓ (Won)' : stg.is_lost ? '✗ (Lost)' : ''}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-zinc-500">Estimated Value:</span>
                <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(lead.estimated_value)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email
                </span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 truncate max-w-[160px]">
                  {lead.email || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {lead.phone || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" /> Company
                </span>
                <span className="text-zinc-800 dark:text-zinc-200">{lead.company || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Deal Owner
                </span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {owner?.full_name || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Source</span>
                <span className="text-zinc-800 dark:text-zinc-200">{lead.source || 'Direct'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Vertical Dynamic Custom Fields */}
          {customFieldDefs.length > 0 && (
            <Card className="shadow-2xs">
              <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    {vertical?.name} Attributes
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs">
                {customFieldDefs.map((def) => {
                  const val = lead.custom_fields[def.key];
                  return (
                    <div key={def.id} className="flex items-center justify-between">
                      <span className="text-zinc-500">{def.name}</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {val === undefined || val === null || val === ''
                          ? '—'
                          : typeof val === 'boolean'
                          ? val
                            ? 'Yes'
                            : 'No'
                          : String(val)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Tags & Notes */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Tags & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lead.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-100 dark:border-zinc-800">
                {lead.notes || 'No notes added yet.'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (2 cols): Activity Timeline & Logger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Activity Logger */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Log New Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleLogActivity} className="space-y-3">
                {/* Activity Type Selector Buttons */}
                <div className="flex items-center space-x-1.5 pb-1">
                  {[
                    { type: 'note' as const, label: 'Note', icon: MessageSquare },
                    { type: 'call' as const, label: 'Phone Call', icon: PhoneCall },
                    { type: 'meeting' as const, label: 'Meeting', icon: CalendarCheck },
                    { type: 'email' as const, label: 'Email Sent', icon: Send },
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActivityType(type)}
                      className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                        activityType === type
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                <Input
                  placeholder="Activity title (e.g. Discussed pricing proposal, Intro meeting)..."
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  className="h-8 text-xs"
                  required
                />

                <textarea
                  placeholder="Key notes, outcomes, follow-up commitments..."
                  rows={2}
                  value={activityDesc}
                  onChange={(e) => setActivityDesc(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-transparent p-2.5 text-xs shadow-xs outline-none dark:border-zinc-800 placeholder:text-zinc-400"
                />

                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" disabled={isLogging || !activityTitle.trim()} className="text-xs h-8">
                    {isLogging ? 'Logging...' : 'Save Activity'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Linked Tasks & Action Items */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Action Items & Follow-ups ({linkedTasks.length})
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-400">
                  Tasks linked to this opportunity
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add Task</span>
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {linkedTasks.length === 0 ? (
                <p className="text-xs text-zinc-400 py-3 text-center">
                  No active tasks linked to this opportunity.
                </p>
              ) : (
                linkedTasks.map((t) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setIsTaskModalOpen(true);
                    }}
                    onDelete={(id) => setDeletingTaskId(id)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Unified Activity Timeline Feed */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Opportunity Timeline ({timelineActivities.length})
                </CardTitle>
                <span className="text-[10px] text-zinc-400">Chronological activity stream</span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {timelineActivities.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-4 text-center">No activity logged yet.</p>
                ) : (
                  timelineActivities.map((act) => {
                    const Icon = ACTIVITY_ICONS[act.activity_type] || MessageSquare;

                    return (
                      <div key={act.id} className="flex items-start space-x-3 text-xs group">
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
                            act.activity_type === 'stage_change'
                              ? 'bg-blue-600'
                              : act.activity_type === 'converted'
                              ? 'bg-emerald-600'
                              : act.activity_type === 'meeting'
                              ? 'bg-amber-600'
                              : act.activity_type === 'call'
                              ? 'bg-purple-600'
                              : 'bg-zinc-700'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 space-y-1 rounded-md bg-zinc-50/70 p-3 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {act.title}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono" title={formatDate(act.created_at)}>
                              {formatRelativeTime(act.created_at)}
                            </span>
                          </div>
                          {act.description && (
                            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[11px] whitespace-pre-wrap">
                              {act.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Lead Modal */}
      <LeadFormModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialLead={lead}
      />

      {/* Convert to Customer Modal */}
      <LeadConvertModal
        open={isConvertOpen}
        onOpenChange={setIsConvertOpen}
        lead={lead}
        onSuccess={(custId) => router.push(`/customers/${custId}`)}
      />

      {/* Delete Opportunity Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Opportunity?"
        description="This lead will be moved to the Recycle Bin. You can restore it later from Admin settings."
        confirmLabel="Delete Lead"
        onConfirm={() => {
          deleteLead(lead.id);
          setIsDeleteOpen(false);
          router.push('/leads');
        }}
      />

      {/* Delete Task Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingTaskId}
        onOpenChange={(open) => !open && setDeletingTaskId(null)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deletingTaskId) {
            await deleteTask(deletingTaskId);
            setDeletingTaskId(null);
          }
        }}
      />

      {/* Create / Edit Task Modal */}
      <TaskFormModal
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        taskToEdit={editingTask}
        defaultLeadId={lead.id}
        defaultVerticalId={lead.vertical_id}
      />
    </div>
  );
}
