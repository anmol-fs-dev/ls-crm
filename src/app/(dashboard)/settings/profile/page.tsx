'use client';

import * as React from 'react';
import {
  ShieldCheck,
  Check,
  Lock,
  KeyRound,
  User,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProfileSettingsPage() {
  const { user, role, isAdmin, updateProfile } = useAuth();

  const [name, setName] = React.useState(user?.full_name || '');
  const [isSaved, setIsSaved] = React.useState(false);

  // Security password state
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [passwordSaved, setPasswordSaved] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updateProfile({ full_name: name.trim() });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          data: {
            email: user?.email,
            current_password: currentPassword,
            new_password: newPassword,
          },
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Failed to update password.');
      }

      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Sub-Header */}
      <div className="pb-1">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Account & Profile Settings
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Manage your personal credentials, contact details, and account security.
        </p>
      </div>

      {/* Profile Details Form */}
      <Card className="shadow-2xs">
        <CardHeader className="p-5 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            <span>Personal Profile</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Your display name and assigned system role
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="prof-name" className="text-xs">Full Name</Label>
              <Input
                id="prof-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prof-email" className="text-xs">Email Address</Label>
              <Input
                id="prof-email"
                value={user?.email || ''}
                disabled
                className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Governance Role</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="default" className="text-xs uppercase font-mono tracking-wider">
                  {role}
                </Badge>
                {isAdmin && (
                  <span className="text-[11px] text-zinc-500">
                    (Administrative privileges granted)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Button type="submit" size="sm">
                Save Profile
              </Button>
              {isSaved && (
                <span className="flex items-center text-xs text-emerald-600 font-medium">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Saved
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password & Security */}
      <Card className="shadow-2xs">
        <CardHeader className="p-5 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
            <span>Password & Security</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Update your corporate login password
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="curr-pass" className="text-xs">Current Password</Label>
              <div className="relative">
                <Input
                  id="curr-pass"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-pass" className="text-xs">New Password</Label>
              <div className="relative">
                <Input
                  id="new-pass"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conf-pass" className="text-xs">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="conf-pass"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {passwordError && (
              <p className="text-xs text-red-600 font-medium">{passwordError}</p>
            )}

            <div className="flex items-center space-x-2 pt-2">
              <Button type="submit" size="sm" className="gap-1.5" disabled={isChangingPassword}>
                <KeyRound className="h-3.5 w-3.5" />
                <span>{isChangingPassword ? 'Updating...' : 'Update Password'}</span>
              </Button>
              {passwordSaved && (
                <span className="flex items-center text-xs text-emerald-600 font-medium">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Password Updated
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
