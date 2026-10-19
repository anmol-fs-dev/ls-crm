'use client';

import * as React from 'react';
import {
  UserPlus,
  Shield,
  ShieldAlert,
  Users,
  Copy,
  Check,
  UserCheck,
  CheckCircle2,
  Trash2,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useVertical } from '@/context/vertical-context';
import { Profile, UserRole } from '@/types/custom.types';
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

export default function TeamSettingsPage() {
  const { user, isAdmin, refreshProfiles } = useAuth();
  const { verticals } = useVertical();

  const [members, setMembers] = React.useState<Profile[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(true);
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);

  // Remove member state
  const [memberToRemove, setMemberToRemove] = React.useState<Profile | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Invite Form
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteName, setInviteName] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<UserRole>('member');
  const [selectedVerticals, setSelectedVerticals] = React.useState<string[]>([]);
  const [generatedInviteLink, setGeneratedInviteLink] = React.useState<string | null>(null);

  // Fetch real team members from Supabase backend
  const fetchMembers = React.useCallback(async () => {
    try {
      setLoadingMembers(true);
      const res = await fetch('/api/crm?table=profiles');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Strictly exclude soft-deleted users
          const activeList = json.data.filter((p: Profile) => !p.deleted_at);
          setMembers(activeList);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to load team members from database', e);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const toggleVertical = (id: string) => {
    setSelectedVerticals((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_user',
          data: {
            email: inviteEmail.trim().toLowerCase(),
            full_name: inviteName.trim(),
            role: inviteRole,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create user in database');
      }

      // Generate direct invite token link to complete registration
      const token = Math.random().toString(36).substring(2, 12);
      const link = `${window.location.origin}/accept-invite?token=${token}&email=${encodeURIComponent(inviteEmail.trim().toLowerCase())}`;
      setGeneratedInviteLink(link);

      // Synchronize database across all views
      await fetchMembers();
      await refreshProfiles();

      setSuccessMessage(`Invitation link created for ${inviteName.trim()}.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error generating user invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Remove member handler (persists to Supabase and removes auth account)
  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    const removedName = memberToRemove.full_name;
    const targetId = memberToRemove.id;
    setMemberToRemove(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'profiles',
          action: 'delete',
          id: targetId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to remove user from database');
      }

      // Refresh database records
      await fetchMembers();
      await refreshProfiles();

      setSuccessMessage(`Team member "${removedName}" has been successfully removed.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove member');
    }
  };

  // Toggle member active status in Supabase
  const handleToggleStatus = async (member: Profile) => {
    try {
      const newStatus = !member.is_active;
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'profiles',
          action: 'update',
          id: member.id,
          data: { is_active: newStatus },
        }),
      });
      await fetchMembers();
      await refreshProfiles();
    } catch (e) {
      console.warn('Failed to update member status', e);
    }
  };

  // Update member role in Supabase
  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    try {
      await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'profiles',
          action: 'update',
          id: memberId,
          data: { role: newRole },
        }),
      });
      await fetchMembers();
      await refreshProfiles();
      setSuccessMessage('Member permissions updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      console.warn('Failed to update member role', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Team & Access Control
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Invite-only team membership with role-based permissions, per-vertical scoping, and user management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              onClick={() => {
                setInviteEmail('');
                setInviteName('');
                setInviteRole('member');
                setSelectedVerticals(verticals.map((v) => v.id));
                setGeneratedInviteLink(null);
                setErrorMessage(null);
                setIsInviteOpen(true);
              }}
              size="sm"
              className="h-8 gap-1.5 text-xs bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Invite Team Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Role Matrix Explanation Card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 space-y-1 shadow-2xs">
          <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-100">
            <ShieldAlert className="h-4 w-4 text-purple-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Owner / Admin</h3>
          </div>
          <p className="text-[11px] text-zinc-500">
            Unrestricted access to all verticals, billing, team management, user removal, and audit logs.
          </p>
        </Card>
        <Card className="p-4 space-y-1 shadow-2xs">
          <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-100">
            <Shield className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Manager</h3>
          </div>
          <p className="text-[11px] text-zinc-500">
            Full manage and soft-delete capabilities within assigned verticals, pipeline stage management.
          </p>
        </Card>
        <Card className="p-4 space-y-1 shadow-2xs">
          <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-100">
            <Users className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Member</h3>
          </div>
          <p className="text-[11px] text-zinc-500">
            Can create, view, and edit own records within assigned verticals. Cannot delete others' data.
          </p>
        </Card>
        <Card className="p-4 space-y-1 shadow-2xs">
          <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-100">
            <UserCheck className="h-4 w-4 text-zinc-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Viewer</h3>
          </div>
          <p className="text-[11px] text-zinc-500">
            Read-only visibility strictly restricted to assigned vertical records and boards.
          </p>
        </Card>
      </div>

      {/* Team Member Table */}
      <Card className="shadow-2xs">
        <CardHeader className="p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Active Members ({members.length})</CardTitle>
              <CardDescription className="text-xs">
                Members with system access, assigned roles, and permission controls (Supabase synced)
              </CardDescription>
            </div>
            {isAdmin && (
              <Badge variant="outline" className="text-[11px] font-normal text-zinc-500">
                Admin controls active
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingMembers ? (
            <div className="flex items-center justify-center p-8 text-xs text-zinc-500 gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading synchronized team members...</span>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {members.map((member) => {
                const isCurrentUser = member.id === user?.id;

                return (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors gap-3"
                  >
                    {/* Left: User Info */}
                    <div className="flex items-center space-x-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                        {member.full_name?.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                            {member.full_name}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[9px] h-4 border-indigo-300 text-indigo-600 dark:text-indigo-400">
                              You
                            </Badge>
                          )}
                          {!member.is_active && (
                            <Badge variant="outline" className="text-[9px] h-4 text-red-500 border-red-200">
                              Suspended
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-500">{member.email}</span>
                      </div>
                    </div>

                    {/* Right: Role, Status, and Admin Actions */}
                    <div className="flex items-center space-x-2 sm:space-x-3 self-end sm:self-auto">
                      {/* Role selector for admin */}
                      {isAdmin && !isCurrentUser ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value as UserRole)}
                          className="h-6 rounded border border-zinc-200 bg-white px-2 py-0 text-[10px] font-medium uppercase font-mono tracking-wider dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 cursor-pointer"
                          title="Change role"
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <Badge
                          variant={
                            member.role === 'owner' || member.role === 'admin'
                              ? 'default'
                              : member.role === 'manager'
                              ? 'info'
                              : 'secondary'
                          }
                          className="text-[10px] uppercase tracking-wider h-5 font-mono"
                        >
                          {member.role}
                        </Badge>
                      )}

                      {/* Status badge / toggle */}
                      {isAdmin && !isCurrentUser ? (
                        <button
                          onClick={() => handleToggleStatus(member)}
                          title={`Click to ${member.is_active ? 'suspend' : 'activate'} user`}
                          className="cursor-pointer"
                        >
                          <Badge
                            variant={member.is_active ? 'success' : 'outline'}
                            className="text-[10px] h-5 hover:opacity-80 transition-opacity"
                          >
                            {member.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      ) : (
                        <Badge
                          variant={member.is_active ? 'success' : 'outline'}
                          className="text-[10px] h-5"
                        >
                          {member.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}

                      {/* Admin Action: Remove User */}
                      {isAdmin && (
                        <div className="flex items-center pl-1">
                          {isCurrentUser ? (
                            <span
                              title="Cannot remove currently logged-in account"
                              className="inline-flex h-8 w-8 items-center justify-center text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                            >
                              <Lock className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              onClick={() => setMemberToRemove(member)}
                              title={`Remove ${member.full_name} from organization`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Remove {member.full_name}</span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog for User Removal */}
      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Remove Team Member"
        description={`Are you sure you want to remove "${memberToRemove?.full_name}" (${memberToRemove?.email}) from the organization? They will immediately lose access to all vertical workspaces, tasks, and CRM data.`}
        confirmLabel="Remove User"
        cancelLabel="Keep Member"
        variant="destructive"
        onConfirm={confirmRemoveMember}
      />

      {/* Invite Member Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-md">
          {generatedInviteLink ? (
            <div className="space-y-4 py-2">
              <DialogHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <DialogTitle>Invitation Generated Successfully</DialogTitle>
                <DialogDescription className="text-xs">
                  Share this onboarding link directly with your new team member to complete registration.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label className="text-xs">Invite Activation Link</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    readOnly
                    value={generatedInviteLink}
                    className="font-mono text-xs bg-zinc-50 dark:bg-zinc-900 select-all"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedInviteLink)}
                    className="shrink-0"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => {
                    setIsInviteOpen(false);
                    setGeneratedInviteLink(null);
                  }}
                  className="w-full text-xs"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSendInvite}>
              <DialogHeader>
                <DialogTitle>Invite New Member</DialogTitle>
                <DialogDescription className="text-xs">
                  Grant team access with scoped business verticals and governance role permissions.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-name" className="text-xs">Full Name</Label>
                  <Input
                    id="inv-name"
                    placeholder="e.g. Rachel Green"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inv-email" className="text-xs">Corporate Email</Label>
                  <Input
                    id="inv-email"
                    type="email"
                    placeholder="rachel@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Assigned Governance Role</Label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-xs shadow-xs dark:border-zinc-800"
                  >
                    <option value="member">Member (Create & edit records in assigned verticals)</option>
                    <option value="manager">Manager (Manage records, stages & team members)</option>
                    <option value="viewer">Viewer (Read-only access)</option>
                    <option value="admin">Admin (Full administrative authority)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Permitted Verticals</Label>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {verticals.map((vert) => {
                      const isChecked = selectedVerticals.includes(vert.id);
                      return (
                        <button
                          key={vert.id}
                          type="button"
                          onClick={() => toggleVertical(vert.id)}
                          className={`flex items-center space-x-2 rounded-md border p-2 text-xs transition-colors cursor-pointer text-left ${
                            isChecked
                              ? 'border-zinc-900 bg-zinc-100/80 dark:border-zinc-100 dark:bg-zinc-800'
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
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviteOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Generate Invitation'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
