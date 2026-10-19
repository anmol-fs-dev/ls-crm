'use client';

import * as React from 'react';
import {
  UserPlus,
  Shield,
  ShieldAlert,
  Users,
  Copy,
  Check,
  Mail,
  UserCheck,
  CheckCircle2,
  Trash2,
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
import { MOCK_PROFILES } from '@/lib/mock-data';

export default function TeamSettingsPage() {
  const { user, isAdmin } = useAuth();
  const { verticals } = useVertical();

  const [members, setMembers] = React.useState<Profile[]>(MOCK_PROFILES);
  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);

  // Invite Form
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteName, setInviteName] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<UserRole>('member');
  const [selectedVerticals, setSelectedVerticals] = React.useState<string[]>([]);
  const [generatedInviteLink, setGeneratedInviteLink] = React.useState<string | null>(null);

  const toggleVertical = (id: string) => {
    setSelectedVerticals((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    const newMember: Profile = {
      id: `usr-${Date.now()}`,
      email: inviteEmail.trim().toLowerCase(),
      full_name: inviteName.trim(),
      avatar_url: null,
      role: inviteRole,
      is_active: true,
      mfa_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    setMembers((prev) => [...prev, newMember]);

    // Generate direct invite token link to bypass free SMTP limits
    const token = Math.random().toString(36).substring(2, 12);
    const link = `${window.location.origin}/accept-invite?token=${token}&email=${encodeURIComponent(inviteEmail)}`;
    setGeneratedInviteLink(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(text);
    setTimeout(() => setCopiedLink(null), 2500);
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
            Invite-only team membership with role-based permissions and per-vertical scoping.
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setInviteEmail('');
              setInviteName('');
              setInviteRole('member');
              setSelectedVerticals(verticals.map((v) => v.id));
              setGeneratedInviteLink(null);
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

      {/* Role Matrix Explanation Card */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 space-y-1 shadow-2xs">
          <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-100">
            <ShieldAlert className="h-4 w-4 text-purple-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Owner / Admin</h3>
          </div>
          <p className="text-[11px] text-zinc-500">
            Unrestricted access to all verticals, billing, vertical creation, team management, and audit logs.
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
                Members with system access and their assigned governance roles
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition-colors gap-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {member.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {member.full_name}
                      </span>
                      {member.id === user?.id && (
                        <Badge variant="outline" className="text-[9px] h-4">You</Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500">{member.email}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-auto">
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

                  <Badge
                    variant={member.is_active ? 'success' : 'outline'}
                    className="text-[10px] h-5"
                  >
                    {member.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                  Direct invitation link ready. You can share this link directly with {inviteName} to bypass SMTP email quotas.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                <span className="text-[11px] font-medium text-zinc-500">Invitation Link</span>
                <div className="flex items-center space-x-2">
                  <input
                    readOnly
                    value={generatedInviteLink}
                    className="flex-1 bg-transparent text-xs font-mono text-zinc-700 dark:text-zinc-300 outline-none truncate"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 shrink-0"
                    onClick={() => copyToClipboard(generatedInviteLink)}
                  >
                    {copiedLink === generatedInviteLink ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button size="sm" onClick={() => setIsInviteOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSendInvite}>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription className="text-xs">
                  New users will be provisioned access to specific verticals based on their assigned role.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-name" className="text-xs">Full Name</Label>
                  <Input
                    id="inv-name"
                    placeholder="e.g. Jordan Miller"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inv-email" className="text-xs">Email Address</Label>
                  <Input
                    id="inv-email"
                    type="email"
                    placeholder="colleague@company.com"
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
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Generate Invitation
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
