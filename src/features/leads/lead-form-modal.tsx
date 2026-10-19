'use client';

import * as React from 'react';
import { AlertCircle, Tag, DollarSign, User, Building, Mail, Phone, Sparkles } from 'lucide-react';
import { Lead, Vertical, PipelineStage, CustomFieldDefinition } from '@/types/custom.types';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { Button } from '@/components/ui/button';
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
import { MOCK_PROFILES, MOCK_STAGES } from '@/lib/mock-data';

interface LeadFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLead?: Lead | null;
  defaultVerticalId?: string;
  defaultStageId?: string;
}

const SOURCES = [
  'Website Demo',
  'Inbound Organic',
  'Outbound Campaign',
  'Referral / Partner',
  'Direct Inquiry',
  'Event / Conference',
];

export function LeadFormModal({
  open,
  onOpenChange,
  initialLead,
  defaultVerticalId,
  defaultStageId,
}: LeadFormModalProps) {
  const { createLead, updateLead, checkDuplicate, getCustomFieldsForVertical } = useCrmData();
  const { verticals, selectedVerticalId } = useVertical();

  // Form states
  const [name, setName] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [source, setSource] = React.useState(SOURCES[0]);
  const [verticalId, setVerticalId] = React.useState('');
  const [stageId, setStageId] = React.useState('');
  const [ownerId, setOwnerId] = React.useState(MOCK_PROFILES[0].id);
  const [estimatedValue, setEstimatedValue] = React.useState<number>(10000);
  const [tagsInput, setTagsInput] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [customFields, setCustomFields] = React.useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Determine effective vertical ID
  const effectiveVerticalId =
    verticalId ||
    defaultVerticalId ||
    (selectedVerticalId !== 'all' ? selectedVerticalId : verticals[0]?.id || '');

  // Reset or initialize form
  React.useEffect(() => {
    if (initialLead) {
      setName(initialLead.name);
      setCompany(initialLead.company || '');
      setEmail(initialLead.email || '');
      setPhone(initialLead.phone || '');
      setSource(initialLead.source || SOURCES[0]);
      setVerticalId(initialLead.vertical_id);
      setStageId(initialLead.stage_id);
      setOwnerId(initialLead.owner_id || MOCK_PROFILES[0].id);
      setEstimatedValue(initialLead.estimated_value || 0);
      setTagsInput(initialLead.tags.join(', '));
      setNotes(initialLead.notes || '');
      setCustomFields(initialLead.custom_fields || {});
    } else {
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setSource(SOURCES[0]);
      const targetVert = defaultVerticalId || (selectedVerticalId !== 'all' ? selectedVerticalId : verticals[0]?.id || '');
      setVerticalId(targetVert);
      const stage = MOCK_STAGES.find((s) => s.vertical_id === targetVert);
      setStageId(defaultStageId || stage?.id || '');
      setOwnerId(MOCK_PROFILES[0].id);
      setEstimatedValue(15000);
      setTagsInput('');
      setNotes('');
      setCustomFields({});
    }
  }, [initialLead, open, defaultVerticalId, defaultStageId, selectedVerticalId, verticals]);

  // Load available stages for selected vertical
  const availableStages = React.useMemo(() => {
    return MOCK_STAGES.filter((s) => s.vertical_id === effectiveVerticalId && !s.deleted_at);
  }, [effectiveVerticalId]);

  // Load custom field definitions for this vertical
  const customFieldDefs = React.useMemo(() => {
    if (!effectiveVerticalId) return [];
    return getCustomFieldsForVertical(effectiveVerticalId, 'lead');
  }, [effectiveVerticalId, getCustomFieldsForVertical]);

  // Real-time duplicate check
  const duplicateCheck = React.useMemo(() => {
    if (!open) return { hasDuplicate: false };
    return checkDuplicate(email, phone, initialLead?.id);
  }, [email, phone, initialLead, checkDuplicate, open]);

  const handleCustomFieldChange = (key: string, value: any) => {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const targetStageId = stageId || availableStages[0]?.id || '';

    try {
      if (initialLead) {
        await updateLead(initialLead.id, {
          name: name.trim(),
          company: company.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          source,
          vertical_id: effectiveVerticalId,
          stage_id: targetStageId,
          owner_id: ownerId || null,
          estimated_value: Number(estimatedValue) || 0,
          tags,
          notes: notes.trim() || null,
          custom_fields: customFields,
        });
      } else {
        await createLead({
          name: name.trim(),
          company: company.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          source,
          vertical_id: effectiveVerticalId,
          stage_id: targetStageId,
          owner_id: ownerId || null,
          estimated_value: Number(estimatedValue) || 0,
          position: 1000,
          tags,
          notes: notes.trim() || null,
          custom_fields: customFields,
          created_by: ownerId,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle>{initialLead ? 'Edit Opportunity' : 'Create New Lead'}</DialogTitle>
            <DialogDescription className="text-xs">
              Fill in prospect details, stage, and vertical-specific attributes.
            </DialogDescription>
          </DialogHeader>

          {/* Duplicate Detection Warning Banner */}
          {duplicateCheck.hasDuplicate && (
            <div className="mt-4 flex items-start space-x-2.5 rounded-md bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 border border-amber-500/20">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <strong>Potential Duplicate Detected:</strong>{' '}
                {duplicateCheck.field === 'email' ? 'Email address' : 'Phone number'} matches an existing{' '}
                {duplicateCheck.existingLead
                  ? `lead "${duplicateCheck.existingLead.name}" (${duplicateCheck.existingLead.company || 'No company'})`
                  : `customer "${duplicateCheck.existingCustomer?.name}"`}
                .
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            {/* Primary Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lead-name" className="text-xs">
                  Lead / Contact Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lead-name"
                  placeholder="e.g. Jordan Mitchell"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-company" className="text-xs">Company / Organization</Label>
                <Input
                  id="lead-company"
                  placeholder="e.g. Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-email" className="text-xs">Email Address</Label>
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="contact@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-phone" className="text-xs">Phone Number</Label>
                <Input
                  id="lead-phone"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Vertical & Stage Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="space-y-1.5">
                <Label className="text-xs">Business Vertical</Label>
                <select
                  value={effectiveVerticalId}
                  onChange={(e) => {
                    const newV = e.target.value;
                    setVerticalId(newV);
                    const defaultStg = MOCK_STAGES.find((s) => s.vertical_id === newV);
                    setStageId(defaultStg?.id || '');
                  }}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-xs shadow-xs dark:border-zinc-800"
                >
                  {verticals
                    .filter((v) => v.status === 'active')
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Pipeline Stage</Label>
                <select
                  value={stageId || (availableStages[0]?.id || '')}
                  onChange={(e) => setStageId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-xs shadow-xs dark:border-zinc-800"
                >
                  {availableStages.map((stg) => (
                    <option key={stg.id} value={stg.id}>
                      {stg.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="est-value" className="text-xs">Estimated Value ($)</Label>
                <Input
                  id="est-value"
                  type="number"
                  min="0"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Owner & Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Deal Owner</Label>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-xs shadow-xs dark:border-zinc-800"
                >
                  {MOCK_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Acquisition Source</Label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-xs shadow-xs dark:border-zinc-800"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Custom Fields Section */}
            {customFieldDefs.length > 0 && (
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Vertical Custom Fields
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customFieldDefs.map((field) => {
                    const fieldValue = customFields[field.key] ?? '';
                    return (
                      <div key={field.id} className="space-y-1.5">
                        <Label className="text-xs">
                          {field.name} {field.is_required && <span className="text-red-500">*</span>}
                        </Label>
                        {field.field_type === 'select' ? (
                          <select
                            value={fieldValue}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                            className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-xs shadow-xs dark:border-zinc-800"
                            required={field.is_required}
                          >
                            <option value="">Select option...</option>
                            {((Array.isArray(field.options) ? field.options : []) as unknown as string[]).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : field.field_type === 'checkbox' ? (
                          <label className="flex items-center space-x-2 text-xs cursor-pointer pt-2">
                            <input
                              type="checkbox"
                              checked={Boolean(fieldValue)}
                              onChange={(e) => handleCustomFieldChange(field.key, e.target.checked)}
                              className="rounded border-zinc-300"
                            />
                            <span>{field.name}</span>
                          </label>
                        ) : (
                          <Input
                            type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                            value={fieldValue}
                            onChange={(e) => handleCustomFieldChange(field.key, e.target.value)}
                            required={field.is_required}
                            className="text-xs"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags & Notes */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="space-y-1.5">
                <Label htmlFor="lead-tags" className="text-xs">Tags (comma-separated)</Label>
                <Input
                  id="lead-tags"
                  placeholder="e.g. Enterprise, High Priority, Q3 Target"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-notes" className="text-xs">Notes & Background</Label>
                <textarea
                  id="lead-notes"
                  rows={3}
                  placeholder="Key background, budget constraints, decision maker info..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex w-full rounded-md border border-zinc-200 bg-transparent p-3 text-xs shadow-xs outline-none dark:border-zinc-800 placeholder:text-zinc-400"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialLead ? 'Save Changes' : 'Create Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
