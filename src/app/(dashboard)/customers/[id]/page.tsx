'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Layers,
  Edit2,
  Trash2,
  Plus,
  MessageSquare,
  PhoneCall,
  CalendarCheck,
  Send,
  DollarSign,
  Briefcase,
  CheckCircle2,
  Kanban,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { Activity, Customer, Task } from '@/types/custom.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomerFormModal } from '@/features/customers/customer-form-modal';
import { TaskFormModal } from '@/features/tasks/task-form-modal';
import { TaskItem } from '@/features/tasks/task-item';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDate, formatRelativeTime, formatCurrency } from '@/lib/utils';
import { MOCK_PROFILES, MOCK_CARDS } from '@/lib/mock-data';

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  note: MessageSquare,
  call: PhoneCall,
  meeting: CalendarCheck,
  email: Send,
  converted: CheckCircle2,
  system: Briefcase,
};

export default function CustomerDetailPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-xs text-zinc-500">Loading customer profile...</div>}>
      <CustomerDetailContent />
    </React.Suspense>
  );
}

function CustomerDetailContent() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const { customers, customerVerticals, leads, tasks, deleteTask, deleteCustomer, addActivity, getEntityActivities, getCustomFieldsForVertical } = useCrmData();
  const { verticals } = useVertical();

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);

  // Activity Log Form State
  const [actType, setActType] = React.useState<Activity['activity_type']>('note');
  const [actTitle, setActTitle] = React.useState('');
  const [actDesc, setActDesc] = React.useState('');
  const [isLogging, setIsLogging] = React.useState(false);
  const [deletingTaskId, setDeletingTaskId] = React.useState<string | null>(null);

  const customer = customers.find((c) => c.id === customerId);

  // Linked Verticals
  const linkedVerticals = React.useMemo(() => {
    if (!customer) return [];
    const links = customerVerticals.filter((cv) => cv.customer_id === customer.id);
    return links
      .map((l) => verticals.find((v) => v.id === l.vertical_id))
      .filter(Boolean) as typeof verticals;
  }, [customer, customerVerticals, verticals]);

  // Linked Deals / Converted Leads
  const linkedLeads = React.useMemo(() => {
    if (!customer) return [];
    return leads.filter(
      (l) => l.converted_to_customer_id === customer.id || l.id === customer.converted_from_lead_id
    );
  }, [customer, leads]);

  // Linked Tasks
  const linkedTasks = React.useMemo(() => {
    if (!customer) return [];
    return tasks.filter((t) => t.customer_id === customer.id && !t.deleted_at);
  }, [customer, tasks]);

  // Linked Project Cards
  const linkedCards = React.useMemo(() => {
    if (!customer) return [];
    return MOCK_CARDS.filter((c) => c.customer_id === customer.id);
  }, [customer]);

  const owner = MOCK_PROFILES.find((p) => p.id === customer?.owner_id);
  const activities = customer ? getEntityActivities('customer', customer.id) : [];

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-base font-semibold">Customer Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-4">This account may have been deleted.</p>
        <Button size="sm" asChild>
          <Link href="/customers">Return to Directory</Link>
        </Button>
      </div>
    );
  }

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim()) return;

    setIsLogging(true);
    await addActivity({
      entity_type: 'customer',
      entity_id: customer.id,
      vertical_id: linkedVerticals[0]?.id || null,
      activity_type: actType,
      title: actTitle.trim(),
      description: actDesc.trim() || null,
    });
    setActTitle('');
    setActDesc('');
    setIsLogging(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/customers" title="Back to directory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {customer.name}
              </h1>
              <Badge
                variant={
                  customer.lifecycle_status === 'vip'
                    ? 'default'
                    : customer.lifecycle_status === 'active'
                    ? 'success'
                    : 'secondary'
                }
                className="text-[10px] uppercase tracking-wider h-5"
              >
                {customer.lifecycle_status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center space-x-2">
              <span>{customer.type === 'company' ? 'Corporate Account' : 'Individual Client'}</span>
              <span>•</span>
              <span>{linkedVerticals.length} Linked Verticals</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Edit2 className="h-3 w-3" />
            <span>Edit Profile</span>
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

      {/* Grid: 360 Details (Left 1 col) + Timeline & Engagements (Right 2 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Profile & Linked Verticals */}
        <div className="space-y-6">
          {/* Multi-Vertical Association Card */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center space-x-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-500" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Linked Verticals ({linkedVerticals.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {linkedVerticals.map((vert) => (
                <div
                  key={vert.id}
                  className="flex items-center justify-between p-2 rounded-md border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50"
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: vert.color }}
                    />
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {vert.name}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono h-4">
                    Active
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Contact & Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> Email
                </span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {customer.email || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">
                  {customer.phone || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Account Manager
                </span>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {owner?.full_name || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Member Since</span>
                <span className="text-zinc-800 dark:text-zinc-200">
                  {formatDate(customer.created_at)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields */}
          {Object.keys(customer.custom_fields).length > 0 && (
            <Card className="shadow-2xs">
              <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Attributes & Revenue
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                {Object.entries(customer.custom_fields).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-zinc-500 capitalize">{key.replace('_', ' ')}</span>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {key.includes('mrr') || key.includes('revenue') ? formatCurrency(Number(val)) : String(val)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Tags & Notes */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Tags & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {customer.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-100 dark:border-zinc-800">
                {customer.notes || 'No overview notes added.'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (2 cols): Deals, Projects, Tasks & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Engagements & Linked Deals */}
          {linkedLeads.length > 0 && (
            <Card className="shadow-2xs">
              <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Deal & Conversion History ({linkedLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {linkedLeads.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-2.5 rounded-md border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs"
                  >
                    <div>
                      <Link href={`/leads/${l.id}`} className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline">
                        {l.name}
                      </Link>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Converted on {formatDate(l.updated_at)} • Source: {l.source || 'Direct'}
                      </p>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(l.estimated_value)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Quick Activity Logger */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Log Account Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleLogActivity} className="space-y-3">
                <div className="flex items-center space-x-1.5 pb-1">
                  {[
                    { type: 'note' as const, label: 'Note', icon: MessageSquare },
                    { type: 'call' as const, label: 'Call', icon: PhoneCall },
                    { type: 'meeting' as const, label: 'Meeting', icon: CalendarCheck },
                    { type: 'email' as const, label: 'Email', icon: Send },
                  ].map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActType(type)}
                      className={`flex items-center space-x-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                        actType === type
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
                  placeholder="Activity title (e.g. Executive check-in call, Q3 contract review)..."
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  className="h-8 text-xs"
                  required
                />

                <textarea
                  placeholder="Key discussion points, customer feedback, deliverables..."
                  rows={2}
                  value={actDesc}
                  onChange={(e) => setActDesc(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-transparent p-2.5 text-xs shadow-xs outline-none dark:border-zinc-800 placeholder:text-zinc-400"
                />

                <div className="flex justify-end pt-1">
                  <Button type="submit" size="sm" disabled={isLogging || !actTitle.trim()} className="text-xs h-8">
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
                  Tasks linked to this customer account
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
                  No active tasks linked to this customer.
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

          {/* Unified Customer Activity Timeline */}
          <Card className="shadow-2xs">
            <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Account Activity Stream ({activities.length})
                </CardTitle>
                <span className="text-[10px] text-zinc-400">Interaction & engagement history</span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-4 text-center">No activity recorded yet.</p>
                ) : (
                  activities.map((act) => {
                    const Icon = ACTIVITY_ICONS[act.activity_type] || MessageSquare;

                    return (
                      <div key={act.id} className="flex items-start space-x-3 text-xs group">
                        <div
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${
                            act.activity_type === 'converted'
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

      {/* Edit Customer Modal */}
      <CustomerFormModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialCustomer={customer}
        initialVerticalIds={linkedVerticals.map((v) => v.id)}
      />

      {/* Delete Customer Confirmation */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete Customer Account?"
        description="This customer account will be moved to the Recycle Bin. You can restore it at any time."
        confirmLabel="Delete Customer"
        onConfirm={() => {
          deleteCustomer(customer.id);
          setIsDeleteOpen(false);
          router.push('/customers');
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
        defaultCustomerId={customer.id}
        defaultVerticalId={linkedVerticals[0]?.id}
      />
    </div>
  );
}
