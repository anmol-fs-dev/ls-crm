'use client';

import * as React from 'react';
import { Building2, User, Mail, Phone, Tag, Sparkles } from 'lucide-react';
import { Customer, CustomerType, LifecycleStatus } from '@/types/custom.types';
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
import { MOCK_PROFILES } from '@/lib/mock-data';

interface CustomerFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomer?: Customer | null;
  initialVerticalIds?: string[];
}

export function CustomerFormModal({
  open,
  onOpenChange,
  initialCustomer,
  initialVerticalIds = [],
}: CustomerFormModalProps) {
  const { createCustomer, updateCustomer } = useCrmData();
  const { verticals, selectedVerticalId } = useVertical();

  const [name, setName] = React.useState('');
  const [type, setType] = React.useState<CustomerType>('company');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [lifecycleStatus, setLifecycleStatus] = React.useState<LifecycleStatus>('active');
  const [ownerId, setOwnerId] = React.useState(MOCK_PROFILES[0].id);
  const [selectedVerticalIds, setSelectedVerticalIds] = React.useState<string[]>([]);
  const [tagsInput, setTagsInput] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (initialCustomer) {
      setName(initialCustomer.name);
      setType(initialCustomer.type);
      setEmail(initialCustomer.email || '');
      setPhone(initialCustomer.phone || '');
      setCompany(initialCustomer.company || '');
      setLifecycleStatus(initialCustomer.lifecycle_status);
      setOwnerId(initialCustomer.owner_id || MOCK_PROFILES[0].id);
      setSelectedVerticalIds(initialVerticalIds);
      setTagsInput(initialCustomer.tags.join(', '));
      setNotes(initialCustomer.notes || '');
    } else {
      setName('');
      setType('company');
      setEmail('');
      setPhone('');
      setCompany('');
      setLifecycleStatus('active');
      setOwnerId(MOCK_PROFILES[0].id);
      const defaultVert = selectedVerticalId !== 'all' ? [selectedVerticalId] : [verticals[0]?.id || ''];
      setSelectedVerticalIds(defaultVert.filter(Boolean));
      setTagsInput('');
      setNotes('');
    }
  }, [initialCustomer, initialVerticalIds, open, selectedVerticalId, verticals]);

  const toggleVertical = (id: string) => {
    setSelectedVerticalIds((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (selectedVerticalIds.length === 0) {
      alert('Please link at least one vertical to this customer.');
      return;
    }

    setIsSubmitting(true);
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (initialCustomer) {
        await updateCustomer(
          initialCustomer.id,
          {
            name: name.trim(),
            type,
            email: email.trim() || null,
            phone: phone.trim() || null,
            company: company.trim() || null,
            lifecycle_status: lifecycleStatus,
            owner_id: ownerId || null,
            tags,
            notes: notes.trim() || null,
          },
          selectedVerticalIds
        );
      } else {
        await createCustomer(
          {
            name: name.trim(),
            type,
            email: email.trim() || null,
            phone: phone.trim() || null,
            company: company.trim() || null,
            lifecycle_status: lifecycleStatus,
            owner_id: ownerId || null,
            tags,
            notes: notes.trim() || null,
            custom_fields: {},
            created_by: ownerId,
          },
          selectedVerticalIds
        );
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle>{initialCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            <DialogDescription className="text-xs">
              Manage accounts, multi-vertical relationships, and lifecycle status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('company')}
                className={`flex items-center justify-center p-2 rounded-md border text-xs cursor-pointer ${
                  type === 'company'
                    ? 'border-zinc-900 bg-zinc-100 font-semibold dark:border-zinc-100 dark:bg-zinc-800'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                Corporate / Organization
              </button>
              <button
                type="button"
                onClick={() => setType('individual')}
                className={`flex items-center justify-center p-2 rounded-md border text-xs cursor-pointer ${
                  type === 'individual'
                    ? 'border-zinc-900 bg-zinc-100 font-semibold dark:border-zinc-100 dark:bg-zinc-800'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                Individual Person
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cust-name" className="text-xs">
                  {type === 'company' ? 'Organization Name' : 'Full Name'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cust-name"
                  placeholder={type === 'company' ? 'e.g. Acme Global' : 'e.g. Sarah Jenkins'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {type === 'individual' && (
                <div className="space-y-1.5">
                  <Label htmlFor="cust-comp" className="text-xs">Associated Company</Label>
                  <Input
                    id="cust-comp"
                    placeholder="e.g. TechCorp"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="cust-email" className="text-xs">Email Address</Label>
                <Input
                  id="cust-email"
                  type="email"
                  placeholder="contact@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-phone" className="text-xs">Phone Number</Label>
                <Input
                  id="cust-phone"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Lifecycle Status & Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="space-y-1.5">
                <Label className="text-xs">Lifecycle Status</Label>
                <select
                  value={lifecycleStatus}
                  onChange={(e) => setLifecycleStatus(e.target.value as LifecycleStatus)}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-xs shadow-xs dark:border-zinc-800"
                >
                  <option value="active">Active Customer</option>
                  <option value="onboarding">Onboarding / Implementation</option>
                  <option value="vip">VIP Strategic Account</option>
                  <option value="lead_converted">Lead Converted</option>
                  <option value="churned">Churned / Inactive</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Account Manager / Owner</Label>
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
            </div>

            {/* Multi-Vertical Association */}
            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs">
                  Linked Business Verticals <span className="text-red-500">*</span>
                </Label>
                <span className="text-[10px] text-zinc-400">Can belong to multiple verticals</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {verticals.map((vert) => {
                  const isChecked = selectedVerticalIds.includes(vert.id);
                  return (
                    <button
                      key={vert.id}
                      type="button"
                      onClick={() => toggleVertical(vert.id)}
                      className={`flex items-center space-x-2 rounded-md border p-2 text-xs transition-colors cursor-pointer text-left ${
                        isChecked
                          ? 'border-zinc-900 bg-zinc-100/80 dark:border-zinc-100 dark:bg-zinc-800 font-semibold'
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: vert.color }}
                      />
                      <span className="truncate">{vert.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags & Notes */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="space-y-1.5">
                <Label htmlFor="cust-tags" className="text-xs">Tags (comma-separated)</Label>
                <Input
                  id="cust-tags"
                  placeholder="e.g. Strategic, Multi-Vertical, Enterprise"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-notes" className="text-xs">Account Notes & Overview</Label>
                <textarea
                  id="cust-notes"
                  rows={2}
                  placeholder="Contract terms, key stakeholders, SLA requirements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex w-full rounded-md border border-zinc-200 bg-transparent p-2.5 text-xs shadow-xs outline-none dark:border-zinc-800 placeholder:text-zinc-400"
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
              {isSubmitting ? 'Saving...' : initialCustomer ? 'Save Changes' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
