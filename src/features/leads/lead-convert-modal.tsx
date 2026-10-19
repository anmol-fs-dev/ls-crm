'use client';

import * as React from 'react';
import { UserCheck, Building, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Lead, Customer } from '@/types/custom.types';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

interface LeadConvertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  onSuccess?: (customerId: string) => void;
}

export function LeadConvertModal({
  open,
  onOpenChange,
  lead,
  onSuccess,
}: LeadConvertModalProps) {
  const { convertLeadToCustomer } = useCrmData();
  const { verticals } = useVertical();

  const [customerType, setCustomerType] = React.useState<'individual' | 'company'>('company');
  const [lifecycleStatus, setLifecycleStatus] = React.useState<Customer['lifecycle_status']>('active');
  const [selectedVerticalIds, setSelectedVerticalIds] = React.useState<string[]>([]);
  const [isConverting, setIsConverting] = React.useState(false);

  React.useEffect(() => {
    if (lead) {
      setCustomerType(lead.company ? 'company' : 'individual');
      setSelectedVerticalIds([lead.vertical_id]);
    }
  }, [lead]);

  if (!lead) return null;

  const toggleVertical = (id: string) => {
    if (id === lead.vertical_id) return; // Lead's primary vertical is always required
    setSelectedVerticalIds((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const { customer } = await convertLeadToCustomer(lead.id, {
        type: customerType,
        lifecycle_status: lifecycleStatus,
        additionalVerticalIds: selectedVerticalIds.filter((id) => id !== lead.vertical_id),
      });
      onOpenChange(false);
      if (onSuccess) onSuccess(customer.id);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-2">
            <UserCheck className="h-5 w-5" />
          </div>
          <DialogTitle>Convert Opportunity to Customer</DialogTitle>
          <DialogDescription className="text-xs">
            Convert <strong>{lead.name}</strong> into an active customer account. All deal history, timeline notes, and contact details are automatically preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Opportunity Summary Card */}
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{lead.name}</span>
              <span className="font-bold text-emerald-600">
                {formatCurrency(lead.estimated_value)}
              </span>
            </div>
            <div className="text-zinc-500 flex items-center space-x-2">
              <span>{lead.company || 'Individual Client'}</span>
              <span>•</span>
              <span>{lead.email || 'No email'}</span>
            </div>
          </div>

          {/* Account Classification */}
          <div className="space-y-1.5">
            <Label className="text-xs">Customer Classification</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomerType('individual')}
                className={`flex items-center justify-center p-2 rounded-md border text-xs cursor-pointer ${
                  customerType === 'individual'
                    ? 'border-zinc-900 bg-zinc-100 font-semibold dark:border-zinc-100 dark:bg-zinc-800'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                Individual Person
              </button>
              <button
                type="button"
                onClick={() => setCustomerType('company')}
                className={`flex items-center justify-center p-2 rounded-md border text-xs cursor-pointer ${
                  customerType === 'company'
                    ? 'border-zinc-900 bg-zinc-100 font-semibold dark:border-zinc-100 dark:bg-zinc-800'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                Corporate / Company
              </button>
            </div>
          </div>

          {/* Lifecycle Status */}
          <div className="space-y-1.5">
            <Label className="text-xs">Initial Lifecycle Status</Label>
            <select
              value={lifecycleStatus}
              onChange={(e) => setLifecycleStatus(e.target.value as Customer['lifecycle_status'])}
              className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-xs shadow-xs dark:border-zinc-800"
            >
              <option value="active">Active Customer</option>
              <option value="onboarding">Onboarding / Implementation</option>
              <option value="vip">VIP / Strategic Account</option>
              <option value="lead_converted">Lead Converted (Pending Kickoff)</option>
            </select>
          </div>

          {/* Multi-Vertical Association */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Linked Verticals (Multi-Vertical Account)</Label>
              <span className="text-[10px] text-zinc-400">Can belong to multiple verticals</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {verticals.map((vert) => {
                const isSelected = selectedVerticalIds.includes(vert.id);
                const isPrimary = vert.id === lead.vertical_id;

                return (
                  <button
                    key={vert.id}
                    type="button"
                    onClick={() => toggleVertical(vert.id)}
                    className={`flex items-center space-x-2 rounded-md border p-2 text-xs transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-100/80 dark:border-zinc-100 dark:bg-zinc-800'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: vert.color }}
                    />
                    <span className="truncate flex-1">{vert.name}</span>
                    {isPrimary && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                        Origin
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isConverting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConvert}
            disabled={isConverting}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <span>{isConverting ? 'Converting...' : 'Convert to Customer'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
