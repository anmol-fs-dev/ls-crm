'use client';

import * as React from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, Table } from 'lucide-react';
import { useCrmData } from '@/context/crm-data-context';
import { useVertical } from '@/context/vertical-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MOCK_STAGES } from '@/lib/mock-data';

interface LeadCsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultVerticalId?: string;
}

const CRM_FIELDS = [
  { key: 'name', label: 'Lead / Contact Name', required: true },
  { key: 'company', label: 'Company / Organization', required: false },
  { key: 'email', label: 'Email Address', required: false },
  { key: 'phone', label: 'Phone Number', required: false },
  { key: 'estimated_value', label: 'Estimated Value ($)', required: false },
  { key: 'source', label: 'Acquisition Source', required: false },
  { key: 'tags', label: 'Tags (comma-separated)', required: false },
];

const SAMPLE_CSV = `Name,Company,Email,Phone,Value,Source,Tags
"Elena Gilbert","Gilbert Media","elena@gilbertmedia.com","+1 (555) 789-0123",24000,"Website Demo","Enterprise, Q3"
"Marcus Aurelius","Stoic Solutions","marcus@stoic.io","+1 (555) 321-4567",48000,"Referral","VIP, Consulting"
"Sophia Loren","CineCorp","sophia@cinecorp.org","+1 (555) 654-9870",15000,"Inbound","Media"`;

export function LeadCsvImportModal({
  open,
  onOpenChange,
  defaultVerticalId,
}: LeadCsvImportModalProps) {
  const { importLeads, checkDuplicate } = useCrmData();
  const { verticals, selectedVerticalId } = useVertical();

  const [step, setStep] = React.useState<'upload' | 'mapping' | 'preview'>('upload');
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [csvRows, setCsvRows] = React.useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<Record<string, string>>({});
  const [targetVerticalId, setTargetVerticalId] = React.useState<string>('');
  const [isImporting, setIsImporting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setStep('upload');
      setCsvHeaders([]);
      setCsvRows([]);
      setColumnMapping({});
      const vert = defaultVerticalId || (selectedVerticalId !== 'all' ? selectedVerticalId : verticals[0]?.id || '');
      setTargetVerticalId(vert);
    }
  }, [open, defaultVerticalId, selectedVerticalId, verticals]);

  const handleParseCsv = (content: string) => {
    Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields && results.meta.fields.length > 0) {
          setCsvHeaders(results.meta.fields);
          setCsvRows(results.data);

          // Auto-guess column mappings based on common field names
          const initialMapping: Record<string, string> = {};
          results.meta.fields.forEach((header) => {
            const h = header.toLowerCase().replace(/[^a-z]/g, '');
            if (h.includes('name')) initialMapping.name = header;
            else if (h.includes('company') || h.includes('org')) initialMapping.company = header;
            else if (h.includes('email') || h.includes('mail')) initialMapping.email = header;
            else if (h.includes('phone') || h.includes('tel')) initialMapping.phone = header;
            else if (h.includes('value') || h.includes('amount') || h.includes('deal')) initialMapping.estimated_value = header;
            else if (h.includes('source')) initialMapping.source = header;
            else if (h.includes('tag')) initialMapping.tags = header;
          });
          setColumnMapping(initialMapping);
          setStep('mapping');
        }
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) handleParseCsv(text);
      };
      reader.readAsText(file);
    }
  };

  const loadSampleCsv = () => {
    handleParseCsv(SAMPLE_CSV);
  };

  // Build validated preview rows
  const previewData = React.useMemo(() => {
    if (!columnMapping.name) return [];
    return csvRows.slice(0, 5).map((row, idx) => {
      const name = row[columnMapping.name] || '';
      const email = columnMapping.email ? row[columnMapping.email] : '';
      const phone = columnMapping.phone ? row[columnMapping.phone] : '';
      const value = columnMapping.estimated_value ? Number(row[columnMapping.estimated_value]) || 0 : 0;
      const dup = checkDuplicate(email, phone);

      return {
        id: idx,
        name,
        company: columnMapping.company ? row[columnMapping.company] : '',
        email,
        phone,
        value,
        isValid: Boolean(name.trim()),
        hasDuplicate: dup.hasDuplicate,
      };
    });
  }, [csvRows, columnMapping, checkDuplicate]);

  const handleCommitImport = async () => {
    if (!columnMapping.name || !targetVerticalId) return;

    setIsImporting(true);
    const firstStage = MOCK_STAGES.find((s) => s.vertical_id === targetVerticalId);

    const mappedLeads = csvRows
      .filter((row) => row[columnMapping.name]?.trim())
      .map((row) => ({
        vertical_id: targetVerticalId,
        stage_id: firstStage?.id || 'stg-1',
        name: row[columnMapping.name].trim(),
        company: columnMapping.company ? row[columnMapping.company]?.trim() || null : null,
        email: columnMapping.email ? row[columnMapping.email]?.trim() || null : null,
        phone: columnMapping.phone ? row[columnMapping.phone]?.trim() || null : null,
        source: columnMapping.source ? row[columnMapping.source]?.trim() || 'CSV Import' : 'CSV Import',
        owner_id: null,
        estimated_value: columnMapping.estimated_value ? Number(row[columnMapping.estimated_value]) || 0 : 0,
        position: 1000,
        tags: columnMapping.tags
          ? row[columnMapping.tags]
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : ['CSV Import'],
        notes: null,
        custom_fields: {},
        created_by: null,
      }));

    try {
      await importLeads(mappedLeads);
      onOpenChange(false);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Import Leads via CSV</DialogTitle>
              <DialogDescription className="text-xs">
                Upload contacts with automatic column mapping, validation preview, and duplicate checking.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4 py-6">
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800 hover:border-zinc-300 transition-colors">
              <FileText className="h-10 w-10 text-zinc-400 mb-3" />
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Choose a CSV file to upload
              </p>
              <p className="text-[11px] text-zinc-500 mt-1 mb-4">
                Supported formats: standard .csv files with headers
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button type="button" size="sm" asChild>
                  <span>Select CSV File</span>
                </Button>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-500">Want to test without a file?</span>
              <Button variant="outline" size="sm" onClick={loadSampleCsv} className="h-7 text-xs">
                Load Sample Demo CSV
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Destination Vertical Workspace</Label>
              <select
                value={targetVerticalId}
                onChange={(e) => setTargetVerticalId(e.target.value)}
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

            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <h4 className="text-xs font-semibold mb-2">Column Mapping ({csvHeaders.length} headers detected)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CRM_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    <select
                      value={columnMapping[field.key] || ''}
                      onChange={(e) =>
                        setColumnMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      className="flex h-8 w-full rounded-md border border-zinc-200 bg-transparent px-2 text-xs dark:border-zinc-800"
                    >
                      <option value="">-- Do not map --</option>
                      {csvHeaders.map((hdr) => (
                        <option key={hdr} value={hdr}>
                          {hdr}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                size="sm"
                onClick={() => setStep('preview')}
                disabled={!columnMapping.name}
              >
                Preview & Validate
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Commit */}
        {step === 'preview' && (
          <div className="space-y-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Previewing First {previewData.length} of {csvRows.length} Rows
              </span>
              <Badge variant="outline" className="text-xs font-mono">
                {csvRows.length} Total Records
              </Badge>
            </div>

            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-600 dark:text-zinc-400">
                  <tr>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Company</th>
                    <th className="p-2.5">Email</th>
                    <th className="p-2.5">Value</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {previewData.map((row) => (
                    <tr key={row.id}>
                      <td className="p-2.5 font-medium text-zinc-900 dark:text-zinc-100">{row.name}</td>
                      <td className="p-2.5 text-zinc-500">{row.company || '—'}</td>
                      <td className="p-2.5 text-zinc-500 font-mono text-[11px]">{row.email || '—'}</td>
                      <td className="p-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                        ${row.value.toLocaleString()}
                      </td>
                      <td className="p-2.5">
                        {row.hasDuplicate ? (
                          <Badge variant="warning" className="text-[10px] h-4">Duplicate</Badge>
                        ) : row.isValid ? (
                          <Badge variant="success" className="text-[10px] h-4">Valid</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] h-4">Missing Name</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('mapping')}>
                Back to Mapping
              </Button>
              <Button
                size="sm"
                onClick={handleCommitImport}
                disabled={isImporting}
                className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                {isImporting ? 'Importing Rows...' : `Import ${csvRows.length} Leads`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
