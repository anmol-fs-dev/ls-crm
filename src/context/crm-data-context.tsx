'use client';

import * as React from 'react';
import {
  Lead,
  Customer,
  CustomerVertical,
  Activity,
  CustomFieldDefinition,
  Task,
  PipelineStage,
} from '@/types/custom.types';
import {
  MOCK_LEADS,
  MOCK_CUSTOMERS,
  MOCK_CUSTOM_FIELDS,
  MOCK_TASKS,
  MOCK_STAGES,
} from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  field?: 'email' | 'phone';
  existingLead?: Lead;
  existingCustomer?: Customer;
}

interface CrmDataContextType {
  leads: Lead[];
  customers: Customer[];
  customerVerticals: CustomerVertical[];
  activities: Activity[];
  customFieldDefs: CustomFieldDefinition[];
  stages: PipelineStage[];

  // Lead Actions
  createLead: (leadData: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'converted_to_customer_id'>) => Promise<Lead>;
  updateLead: (id: string, updates: Partial<Lead>) => Promise<Lead>;
  updateLeadStage: (leadId: string, newStageId: string, newPosition: number, stageName?: string) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  restoreLead: (id: string) => Promise<void>;
  purgeLead: (id: string) => Promise<void>;
  checkDuplicate: (email?: string | null, phone?: string | null, excludeLeadId?: string) => DuplicateCheckResult;

  // Lead -> Customer Conversion
  convertLeadToCustomer: (
    leadId: string,
    customerData?: {
      type?: 'individual' | 'company';
      lifecycle_status?: Customer['lifecycle_status'];
      additionalVerticalIds?: string[];
    }
  ) => Promise<{ customer: Customer; lead: Lead }>;

  // Customer Actions
  createCustomer: (
    customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'converted_from_lead_id'>,
    verticalIds: string[]
  ) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>, verticalIds?: string[]) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  restoreCustomer: (id: string) => Promise<void>;
  purgeCustomer: (id: string) => Promise<void>;

  // Activity Actions
  addActivity: (activity: {
    entity_type: 'lead' | 'customer' | 'card' | 'task';
    entity_id: string;
    vertical_id?: string | null;
    activity_type: Activity['activity_type'];
    title: string;
    description?: string | null;
    metadata?: Record<string, any>;
  }) => Promise<Activity>;
  getEntityActivities: (entityType: 'lead' | 'customer', entityId: string) => Activity[];

  // Custom Fields
  getCustomFieldsForVertical: (verticalId: string, entityType: 'lead' | 'customer') => CustomFieldDefinition[];
  addCustomFieldDef: (def: Omit<CustomFieldDefinition, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<CustomFieldDefinition>;

  // Batch CSV Import
  importLeads: (leadsToImport: Array<Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'converted_to_customer_id'>>) => Promise<{ importedCount: number }>;

  // Task Actions
  tasks: Task[];
  createTask: (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  toggleTaskComplete: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
  purgeTask: (id: string) => Promise<void>;

  // Recycle Bin Bulk Actions
  restoreAll: (type: 'leads' | 'customers' | 'tasks') => Promise<void>;
  emptyRecycleBin: (type: 'leads' | 'customers' | 'tasks') => Promise<void>;

  refreshCrmData: () => Promise<void>;
  seedDemoData: () => Promise<void>;
}

const CrmDataContext = React.createContext<CrmDataContextType | undefined>(undefined);

const LEADS_STORAGE_KEY = 'crm_leads_data_v1';
const CUSTOMERS_STORAGE_KEY = 'crm_customers_data_v1';
const ACTIVITIES_STORAGE_KEY = 'crm_activities_data_v1';
const CUSTOM_FIELDS_STORAGE_KEY = 'crm_custom_fields_v1';
const TASKS_STORAGE_KEY = 'crm_tasks_data_v1';

const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    vertical_id: 'vert-3',
    entity_type: 'lead',
    entity_id: 'lead-1',
    activity_type: 'meeting',
    title: 'Demo Call with Procurement',
    description: 'Walked through enterprise features, SSO security requirements, and SLA guarantees.',
    metadata: { durationMinutes: 45 },
    created_by: 'usr-2',
    created_at: '2026-02-12T10:00:00Z',
  },
  {
    id: 'act-2',
    vertical_id: 'vert-3',
    entity_type: 'lead',
    entity_id: 'lead-1',
    activity_type: 'stage_change',
    title: 'Moved to Demo Completed',
    description: 'Stage changed from Demo Request to Demo Completed.',
    metadata: { fromStage: 'Demo Request', toStage: 'Demo Completed' },
    created_by: 'usr-2',
    created_at: '2026-02-12T10:45:00Z',
  },
  {
    id: 'act-3',
    vertical_id: 'vert-1',
    entity_type: 'lead',
    entity_id: 'lead-2',
    activity_type: 'note',
    title: 'Candidate Profile Assessment',
    description: 'Strong technical background in distributed Go services. Prefers weekend session slots.',
    metadata: {},
    created_by: 'usr-3',
    created_at: '2026-02-14T09:30:00Z',
  },
  {
    id: 'act-4',
    vertical_id: 'vert-3',
    entity_type: 'customer',
    entity_id: 'cust-1',
    activity_type: 'converted',
    title: 'Converted from Lead',
    description: 'Deal closed won and converted into active customer.',
    metadata: { leadId: 'lead-5' },
    created_by: 'usr-2',
    created_at: '2026-02-01T12:00:00Z',
  },
];

export function CrmDataProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = React.useState<Lead[]>(MOCK_LEADS);
  const [customers, setCustomers] = React.useState<Customer[]>(MOCK_CUSTOMERS);
  const [customerVerticals, setCustomerVerticals] = React.useState<CustomerVertical[]>([
    { id: 'cv-1', customer_id: 'cust-1', vertical_id: 'vert-3', custom_fields: {}, status: 'active', created_at: '2026-02-01T12:00:00Z' },
    { id: 'cv-2', customer_id: 'cust-1', vertical_id: 'vert-4', custom_fields: {}, status: 'active', created_at: '2026-02-05T10:00:00Z' },
    { id: 'cv-3', customer_id: 'cust-2', vertical_id: 'vert-1', custom_fields: {}, status: 'active', created_at: '2026-01-10T14:00:00Z' },
    { id: 'cv-4', customer_id: 'cust-2', vertical_id: 'vert-3', custom_fields: {}, status: 'active', created_at: '2026-02-05T11:00:00Z' },
  ]);
  const [activities, setActivities] = React.useState<Activity[]>(INITIAL_ACTIVITIES);
  const [customFieldDefs, setCustomFieldDefs] = React.useState<CustomFieldDefinition[]>(MOCK_CUSTOM_FIELDS);
  const [tasks, setTasks] = React.useState<Task[]>(MOCK_TASKS);
  const [stages, setStages] = React.useState<PipelineStage[]>(MOCK_STAGES);

  // Initialize from Supabase API or localStorage
  const refreshCrmData = React.useCallback(async () => {
    try {
      const res = await fetch('/api/crm');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (Array.isArray(json.stages) && json.stages.length > 0) {
            setStages(json.stages as PipelineStage[]);
          }
          if (Array.isArray(json.leads)) {
            const combinedLeads = [...json.leads, ...(Array.isArray(json.deletedLeads) ? json.deletedLeads : [])];
            setLeads(combinedLeads as Lead[]);
            localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(combinedLeads));
          }
          if (Array.isArray(json.customers)) {
            const combinedCusts = [...json.customers, ...(Array.isArray(json.deletedCustomers) ? json.deletedCustomers : [])];
            setCustomers(combinedCusts as Customer[]);
            localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(combinedCusts));
          }
          if (Array.isArray(json.customerVerticals) && json.customerVerticals.length > 0) {
            setCustomerVerticals(json.customerVerticals as CustomerVertical[]);
          }
          if (Array.isArray(json.tasks)) {
            const combinedTasks = [...json.tasks, ...(Array.isArray(json.deletedTasks) ? json.deletedTasks : [])];
            setTasks(combinedTasks as Task[]);
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(combinedTasks));
          }
          if (Array.isArray(json.activities) && json.activities.length > 0) {
            setActivities(json.activities as Activity[]);
            localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(json.activities));
          }
          return;
        }
      }
    } catch (e) {
      console.warn('API /api/crm fetch failed, falling back to localStorage / mock data', e);
    }

    try {
      const storedLeads = localStorage.getItem(LEADS_STORAGE_KEY);
      if (storedLeads) setLeads(JSON.parse(storedLeads));

      const storedCusts = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
      if (storedCusts) setCustomers(JSON.parse(storedCusts));

      const storedActs = localStorage.getItem(ACTIVITIES_STORAGE_KEY);
      if (storedActs) setActivities(JSON.parse(storedActs));

      const storedFields = localStorage.getItem(CUSTOM_FIELDS_STORAGE_KEY);
      if (storedFields) setCustomFieldDefs(JSON.parse(storedFields));

      const storedTasks = localStorage.getItem(TASKS_STORAGE_KEY);
      if (storedTasks) setTasks(JSON.parse(storedTasks));
    } catch (e) {
      console.warn('Failed to parse CRM state from localStorage', e);
    }
  }, []);

  React.useEffect(() => {
    refreshCrmData();
  }, [refreshCrmData]);

  const saveTasks = (updated: Task[]) => {
    setTasks(updated);
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist tasks', e);
    }
  };

  const saveLeads = (updated: Lead[]) => {
    setLeads(updated);
    try {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist leads', e);
    }
  };

  const saveCustomers = (updated: Customer[]) => {
    setCustomers(updated);
    try {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist customers', e);
    }
  };

  const saveActivities = (updated: Activity[]) => {
    setActivities(updated);
    try {
      localStorage.setItem(ACTIVITIES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist activities', e);
    }
  };

  // Duplicate Detection
  const checkDuplicate = (email?: string | null, phone?: string | null, excludeLeadId?: string): DuplicateCheckResult => {
    const cleanEmail = email?.trim().toLowerCase();
    const cleanPhone = phone?.trim().replace(/\D/g, '');

    if (cleanEmail) {
      const dupLead = leads.find(
        (l) => l.id !== excludeLeadId && !l.deleted_at && l.email?.trim().toLowerCase() === cleanEmail
      );
      if (dupLead) return { hasDuplicate: true, field: 'email', existingLead: dupLead };

      const dupCust = customers.find(
        (c) => !c.deleted_at && c.email?.trim().toLowerCase() === cleanEmail
      );
      if (dupCust) return { hasDuplicate: true, field: 'email', existingCustomer: dupCust };
    }

    if (cleanPhone && cleanPhone.length >= 7) {
      const dupLead = leads.find((l) => {
        if (l.id === excludeLeadId || l.deleted_at || !l.phone) return false;
        return l.phone.replace(/\D/g, '') === cleanPhone;
      });
      if (dupLead) return { hasDuplicate: true, field: 'phone', existingLead: dupLead };

      const dupCust = customers.find((c) => {
        if (c.deleted_at || !c.phone) return false;
        return c.phone.replace(/\D/g, '') === cleanPhone;
      });
      if (dupCust) return { hasDuplicate: true, field: 'phone', existingCustomer: dupCust };
    }

    return { hasDuplicate: false };
  };

  // Create Lead
  const createLead = async (
    data: Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'converted_to_customer_id'>
  ): Promise<Lead> => {
    const newLead: Lead = {
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : `lead-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      converted_to_customer_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'leads', action: 'insert', data: newLead }),
      });
    } catch (err) {
      console.warn('API lead insert error:', err);
    }

    const updated = [newLead, ...leads];
    saveLeads(updated);

    // Auto-log creation activity
    await addActivity({
      entity_type: 'lead',
      entity_id: newLead.id,
      vertical_id: newLead.vertical_id,
      activity_type: 'system',
      title: 'Lead Created',
      description: `Opportunity added with estimated value of $${newLead.estimated_value?.toLocaleString() || 0}.`,
    });

    return newLead;
  };

  // Update Lead
  const updateLead = async (id: string, updates: Partial<Lead>): Promise<Lead> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'leads', action: 'update', id, data: updates }),
      });
    } catch (err) {
      console.warn('API lead update error:', err);
    }

    let updatedLead: Lead | null = null;
    const updated = leads.map((l) => {
      if (l.id === id) {
        updatedLead = { ...l, ...updates, updated_at: new Date().toISOString() };
        return updatedLead;
      }
      return l;
    });

    if (!updatedLead) throw new Error('Lead not found');
    saveLeads(updated);

    return updatedLead;
  };

  // Update Lead Stage (for Kanban drag & drop and detail dropdown)
  const updateLeadStage = async (
    leadId: string,
    newStageId: string,
    newPosition: number,
    stageName?: string
  ): Promise<void> => {
    const current = leads.find((l) => l.id === leadId);
    if (!current) return;

    const prevStageId = current.stage_id;

    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'leads',
          action: 'update',
          id: leadId,
          data: { stage_id: newStageId, position: newPosition },
        }),
      });
    } catch (err) {
      console.warn('API update stage error:', err);
    }

    const updated = leads.map((l) => {
      if (l.id === leadId) {
        return {
          ...l,
          stage_id: newStageId,
          position: newPosition,
          updated_at: new Date().toISOString(),
        };
      }
      return l;
    });

    saveLeads(updated);

    if (prevStageId !== newStageId) {
      await addActivity({
        entity_type: 'lead',
        entity_id: leadId,
        vertical_id: current.vertical_id,
        activity_type: 'stage_change',
        title: 'Stage Changed',
        description: stageName ? `Moved to stage: ${stageName}` : 'Pipeline stage updated',
        metadata: { fromStageId: prevStageId, toStageId: newStageId },
      });
    }
  };

  // Soft delete lead (Recycle Bin)
  const deleteLead = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'leads', action: 'delete', id }),
      });
    } catch (err) {
      console.warn('API lead delete error:', err);
    }

    const updated = leads.map((l) =>
      l.id === id ? { ...l, deleted_at: new Date().toISOString() } : l
    );
    saveLeads(updated);
  };

  // Restore lead from Recycle Bin
  const restoreLead = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'leads', action: 'update', id, data: { deleted_at: null } }),
      });
    } catch (err) {
      console.warn('API lead restore error:', err);
    }

    const updated = leads.map((l) =>
      l.id === id ? { ...l, deleted_at: null, updated_at: new Date().toISOString() } : l
    );
    saveLeads(updated);
  };

  // Permanently purge lead from database
  const purgeLead = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'leads', action: 'purge', id }),
      });
    } catch (err) {
      console.warn('API lead purge error:', err);
    }

    const updated = leads.filter((l) => l.id !== id);
    saveLeads(updated);
  };

  // 1-Click Lead -> Customer Conversion
  const convertLeadToCustomer = async (
    leadId: string,
    customerData?: {
      type?: 'individual' | 'company';
      lifecycle_status?: Customer['lifecycle_status'];
      additionalVerticalIds?: string[];
    }
  ): Promise<{ customer: Customer; lead: Lead }> => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) throw new Error('Lead not found');

    const customerId = crypto.randomUUID ? crypto.randomUUID() : `cust-${Date.now()}`;
    const newCustomer: Customer = {
      id: customerId,
      name: lead.name,
      type: customerData?.type || (lead.company ? 'company' : 'individual'),
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      lifecycle_status: customerData?.lifecycle_status || 'lead_converted',
      owner_id: lead.owner_id,
      tags: [...lead.tags, 'Lead Converted'],
      notes: lead.notes,
      custom_fields: { ...lead.custom_fields },
      converted_from_lead_id: lead.id,
      created_by: lead.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    // Link customer to the lead's vertical + any additional selected verticals
    const linkedVerticalIds = Array.from(
      new Set([lead.vertical_id, ...(customerData?.additionalVerticalIds || [])])
    );

    const newCustomerVerticals: CustomerVertical[] = linkedVerticalIds.map((vId) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `cv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customer_id: customerId,
      vertical_id: vId,
      custom_fields: {},
      status: 'active',
      created_at: new Date().toISOString(),
    }));

    setCustomerVerticals((prev) => [...prev, ...newCustomerVerticals]);

    const updatedCustomers = [newCustomer, ...customers];
    saveCustomers(updatedCustomers);

    // Update lead with pointer to customer
    let updatedLeadRecord: Lead = {
      ...lead,
      converted_to_customer_id: customerId,
      updated_at: new Date().toISOString(),
    };

    const updatedLeads = leads.map((l) => (l.id === leadId ? updatedLeadRecord : l));
    saveLeads(updatedLeads);

    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'customers', action: 'insert', data: newCustomer }),
      });
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'leads',
          action: 'update',
          id: leadId,
          data: { converted_to_customer_id: customerId },
        }),
      });
      for (const cv of newCustomerVerticals) {
        await fetch('/api/crm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: 'customer_verticals', action: 'insert', data: cv }),
        }).catch(() => null);
      }
    } catch (err) {
      console.warn('API conversion sync error:', err);
    }

    // Log activities on both lead and customer
    await addActivity({
      entity_type: 'lead',
      entity_id: lead.id,
      vertical_id: lead.vertical_id,
      activity_type: 'converted',
      title: 'Converted to Customer',
      description: `Lead converted to customer "${newCustomer.name}". Contact history preserved.`,
      metadata: { customerId: newCustomer.id },
    });

    await addActivity({
      entity_type: 'customer',
      entity_id: newCustomer.id,
      vertical_id: lead.vertical_id,
      activity_type: 'converted',
      title: 'Created from Converted Lead',
      description: `Customer account established from lead "${lead.name}".`,
      metadata: { leadId: lead.id },
    });

    return { customer: newCustomer, lead: updatedLeadRecord };
  };

  // Customer Management
  const createCustomer = async (
    data: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'converted_from_lead_id'>,
    verticalIds: string[]
  ): Promise<Customer> => {
    const customerId = crypto.randomUUID ? crypto.randomUUID() : `cust-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newCustomer: Customer = {
      ...data,
      id: customerId,
      converted_from_lead_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'customers', action: 'insert', data: newCustomer }),
      });
    } catch (err) {
      console.warn('API customer insert error:', err);
    }

    const updatedCusts = [newCustomer, ...customers];
    saveCustomers(updatedCusts);

    const newLinks: CustomerVertical[] = verticalIds.map((vId) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : `cv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customer_id: customerId,
      vertical_id: vId,
      custom_fields: {},
      status: 'active',
      created_at: new Date().toISOString(),
    }));

    setCustomerVerticals((prev) => [...prev, ...newLinks]);

    for (const cv of newLinks) {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'customer_verticals', action: 'insert', data: cv }),
      }).catch(() => null);
    }

    await addActivity({
      entity_type: 'customer',
      entity_id: customerId,
      vertical_id: verticalIds[0] || null,
      activity_type: 'system',
      title: 'Customer Created',
      description: `Account created for ${newCustomer.name} across ${verticalIds.length} vertical(s).`,
    });

    return newCustomer;
  };

  const updateCustomer = async (
    id: string,
    updates: Partial<Customer>,
    verticalIds?: string[]
  ): Promise<Customer> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'customers', action: 'update', id, data: updates }),
      });
    } catch (err) {
      console.warn('API customer update error:', err);
    }

    let updatedCust: Customer | null = null;
    const updated = customers.map((c) => {
      if (c.id === id) {
        updatedCust = { ...c, ...updates, updated_at: new Date().toISOString() };
        return updatedCust;
      }
      return c;
    });

    if (!updatedCust) throw new Error('Customer not found');
    saveCustomers(updated);

    if (verticalIds) {
      setCustomerVerticals((prev) => {
        const filtered = prev.filter((cv) => cv.customer_id !== id);
        const newLinks: CustomerVertical[] = verticalIds.map((vId) => ({
          id: crypto.randomUUID ? crypto.randomUUID() : `cv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          customer_id: id,
          vertical_id: vId,
          custom_fields: {},
          status: 'active',
          created_at: new Date().toISOString(),
        }));
        return [...filtered, ...newLinks];
      });
    }

    return updatedCust;
  };

  const deleteCustomer = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'customers', action: 'delete', id }),
      });
    } catch (err) {
      console.warn('API customer delete error:', err);
    }

    const updated = customers.map((c) =>
      c.id === id ? { ...c, deleted_at: new Date().toISOString() } : c
    );
    saveCustomers(updated);
  };

  const restoreCustomer = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'customers', action: 'restore', id }),
      });
    } catch (err) {
      console.warn('API customer restore error:', err);
    }

    const updated = customers.map((c) =>
      c.id === id ? { ...c, deleted_at: null, updated_at: new Date().toISOString() } : c
    );
    saveCustomers(updated);
  };

  const purgeCustomer = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'customers', action: 'purge', id }),
      });
    } catch (err) {
      console.warn('API customer purge error:', err);
    }

    const updated = customers.filter((c) => c.id !== id);
    saveCustomers(updated);
  };

  // Activity Timeline
  const addActivity = async (activity: {
    entity_type: 'lead' | 'customer' | 'card' | 'task';
    entity_id: string;
    vertical_id?: string | null;
    activity_type: Activity['activity_type'];
    title: string;
    description?: string | null;
    metadata?: Record<string, any>;
  }): Promise<Activity> => {
    const newAct: Activity = {
      ...activity,
      vertical_id: activity.vertical_id || null,
      id: crypto.randomUUID ? crypto.randomUUID() : `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: activity.description || null,
      metadata: activity.metadata || {},
      created_by: 'usr-1',
      created_at: new Date().toISOString(),
    };

    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'activities',
          action: 'insert',
          data: {
            ...newAct,
            created_by: null,
          },
        }),
      });
    } catch (err) {
      console.warn('API activity insert error:', err);
    }

    const updated = [newAct, ...activities];
    saveActivities(updated);
    return newAct;
  };

  const seedDemoData = async (): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      await refreshCrmData();
    } catch (err) {
      console.warn('API seed demo data error:', err);
    }
  };

  const getEntityActivities = (entityType: 'lead' | 'customer', entityId: string): Activity[] => {
    return activities
      .filter((a) => a.entity_type === entityType && a.entity_id === entityId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  // Custom Fields
  const getCustomFieldsForVertical = (verticalId: string, entityType: 'lead' | 'customer') => {
    return customFieldDefs.filter(
      (cf) => cf.vertical_id === verticalId && cf.entity_type === entityType && !cf.deleted_at
    );
  };

  const addCustomFieldDef = async (
    def: Omit<CustomFieldDefinition, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ): Promise<CustomFieldDefinition> => {
    const newDef: CustomFieldDefinition = {
      ...def,
      id: `cf-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    const updated = [...customFieldDefs, newDef];
    setCustomFieldDefs(updated);
    try {
      localStorage.setItem(CUSTOM_FIELDS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist custom field', e);
    }
    return newDef;
  };

  // Batch CSV Import
  const importLeads = async (
    leadsToImport: Array<Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'converted_to_customer_id'>>
  ): Promise<{ importedCount: number }> => {
    const newLeadRecords: Lead[] = leadsToImport.map((data, idx) => ({
      ...data,
      id: `lead-imp-${Date.now()}-${idx}`,
      converted_to_customer_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }));

    const updated = [...newLeadRecords, ...leads];
    saveLeads(updated);
    return { importedCount: newLeadRecords.length };
  };

  // Task Actions
  const createTask = async (
    data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>
  ): Promise<Task> => {
    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'tasks',
          action: 'insert',
          data: {
            ...data,
            completed_at: data.status === 'completed' ? new Date().toISOString() : null,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const updated = [json.data as Task, ...tasks];
          saveTasks(updated);
          return json.data as Task;
        }
      }
    } catch (err) {
      console.warn('API task insert error, saving to local store:', err);
    }

    const newTask: Task = {
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : `tsk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      completed_at: data.status === 'completed' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    const updated = [newTask, ...tasks];
    saveTasks(updated);
    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'tasks', action: 'update', id, data: updates }),
      });
    } catch (err) {
      console.warn('API task update error:', err);
    }

    let updatedTaskRecord: Task | null = null;
    const updated = tasks.map((t) => {
      if (t.id === id) {
        updatedTaskRecord = {
          ...t,
          ...updates,
          completed_at: updates.status === 'completed' ? new Date().toISOString() : updates.status === 'pending' ? null : t.completed_at,
          updated_at: new Date().toISOString(),
        };
        return updatedTaskRecord;
      }
      return t;
    });
    if (!updatedTaskRecord) throw new Error('Task not found');
    saveTasks(updated);
    return updatedTaskRecord;
  };

  const toggleTaskComplete = async (id: string): Promise<void> => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    const isNowComplete = current.status !== 'completed';

    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'tasks',
          action: 'update',
          id,
          data: {
            status: isNowComplete ? 'completed' : 'pending',
            completed_at: isNowComplete ? new Date().toISOString() : null,
          },
        }),
      });
    } catch (err) {
      console.warn('API toggle complete error:', err);
    }

    const updated = tasks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          status: (isNowComplete ? 'completed' : 'pending') as Task['status'],
          completed_at: isNowComplete ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        };
      }
      return t;
    });
    saveTasks(updated);
  };

  const deleteTask = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'tasks', action: 'delete', id }),
      });
    } catch (err) {
      console.warn('API task delete error:', err);
    }

    const updated = tasks.map((t) =>
      t.id === id ? { ...t, deleted_at: new Date().toISOString() } : t
    );
    saveTasks(updated);
  };

  const restoreTask = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'tasks', action: 'restore', id }),
      });
    } catch (err) {
      console.warn('API task restore error:', err);
    }

    const updated = tasks.map((t) =>
      t.id === id ? { ...t, deleted_at: null, updated_at: new Date().toISOString() } : t
    );
    saveTasks(updated);
  };

  const purgeTask = async (id: string): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'tasks', action: 'purge', id }),
      });
    } catch (err) {
      console.warn('API task purge error:', err);
    }

    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);
  };

  // Bulk actions for Recycle Bin
  const restoreAll = async (type: 'leads' | 'customers' | 'tasks'): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: type, action: 'restore_all' }),
      });
    } catch (err) {
      console.warn(`API restore all ${type} error:`, err);
    }

    if (type === 'leads') {
      const updated = leads.map((l) => ({ ...l, deleted_at: null }));
      saveLeads(updated);
    } else if (type === 'customers') {
      const updated = customers.map((c) => ({ ...c, deleted_at: null }));
      saveCustomers(updated);
    } else if (type === 'tasks') {
      const updated = tasks.map((t) => ({ ...t, deleted_at: null }));
      saveTasks(updated);
    }
  };

  const emptyRecycleBin = async (type: 'leads' | 'customers' | 'tasks'): Promise<void> => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: type, action: 'purge_all' }),
      });
    } catch (err) {
      console.warn(`API purge all ${type} error:`, err);
    }

    if (type === 'leads') {
      const updated = leads.filter((l) => !l.deleted_at);
      saveLeads(updated);
    } else if (type === 'customers') {
      const updated = customers.filter((c) => !c.deleted_at);
      saveCustomers(updated);
    } else if (type === 'tasks') {
      const updated = tasks.filter((t) => !t.deleted_at);
      saveTasks(updated);
    }
  };

  return (
    <CrmDataContext.Provider
      value={{
        leads,
        customers,
        customerVerticals,
        activities,
        customFieldDefs,
        tasks,
        stages,
        createLead,
        updateLead,
        updateLeadStage,
        deleteLead,
        restoreLead,
        purgeLead,
        checkDuplicate,
        convertLeadToCustomer,
        createCustomer,
        updateCustomer,
        deleteCustomer,
        restoreCustomer,
        purgeCustomer,
        addActivity,
        getEntityActivities,
        getCustomFieldsForVertical,
        addCustomFieldDef,
        importLeads,
        createTask,
        updateTask,
        toggleTaskComplete,
        deleteTask,
        restoreTask,
        purgeTask,
        restoreAll,
        emptyRecycleBin,
        refreshCrmData,
        seedDemoData,
      }}
    >
      {children}
    </CrmDataContext.Provider>
  );
}

export function useCrmData() {
  const context = React.useContext(CrmDataContext);
  if (!context) {
    throw new Error('useCrmData must be used within a CrmDataProvider');
  }
  return context;
}
