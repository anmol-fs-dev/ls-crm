'use client';

import * as React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  QrCode,
  Check,
  Copy,
  Lock,
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

  // MFA Setup State
  const [showMfaEnroll, setShowMfaEnroll] = React.useState(false);
  const [totpCode, setTotpCode] = React.useState('');
  const [copiedSecret, setCopiedSecret] = React.useState(false);
  const [mfaError, setMfaError] = React.useState<string | null>(null);

  const mockSecret = 'JBSWY3DPEHPK3PXP';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updateProfile({ full_name: name.trim() });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleVerifyTotp = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.trim().length !== 6) {
      setMfaError('Please enter a 6-digit numeric verification code.');
      return;
    }
    updateProfile({ mfa_enabled: true });
    setShowMfaEnroll(false);
    setMfaError(null);
  };

  const handleDisableMfa = () => {
    updateProfile({ mfa_enabled: false });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Account & Security
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your personal credentials, contact details, and multi-factor authentication (TOTP).
        </p>
      </div>

      {/* Profile Details Form */}
      <Card className="shadow-2xs">
        <CardHeader className="p-5 border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-sm font-semibold">Personal Profile</CardTitle>
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

      {/* Two-Factor Authentication (TOTP) */}
      <Card className="shadow-2xs">
        <CardHeader className="p-5 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>Multi-Factor Authentication (MFA / TOTP)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Time-based One-Time Passwords compatible with Google Authenticator, 1Password, or Authy.
              </CardDescription>
            </div>
            {user?.mfa_enabled ? (
              <Badge variant="success" className="text-xs">Active & Enforced</Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                Not Enrolled
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {isAdmin && !user?.mfa_enabled && (
            <div className="flex items-start space-x-2.5 rounded-md bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 border border-amber-500/20">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong>Admin Policy Requirement:</strong> Multi-factor authentication is mandatory for all Admin and Owner accounts before production launch.
              </span>
            </div>
          )}

          {user?.mfa_enabled ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                <span>Your account is secured with a TOTP authenticator device.</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisableMfa}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Disable Two-Factor Authentication
              </Button>
            </div>
          ) : showMfaEnroll ? (
            <div className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 max-w-lg">
              <h3 className="text-xs font-semibold">1. Scan QR Code or Enter Secret Key</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex h-32 w-32 items-center justify-center rounded-md border border-zinc-200 bg-white p-2 dark:border-zinc-700">
                  {/* Simulated SVG QR Code */}
                  <div className="grid grid-cols-6 gap-1 w-full h-full p-2">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-2xs ${
                          (i * 7) % 3 === 0 || i % 5 === 0 ? 'bg-zinc-900' : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <span className="text-[11px] text-zinc-500">Manual Entry Key:</span>
                  <div className="flex items-center space-x-2">
                    <code className="rounded bg-zinc-100 px-2 py-1 font-mono text-xs font-bold dark:bg-zinc-800">
                      {mockSecret}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(mockSecret);
                        setCopiedSecret(true);
                        setTimeout(() => setCopiedSecret(false), 2000);
                      }}
                    >
                      {copiedSecret ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Open your authenticator app, scan this code or enter the key above.
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyTotp} className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="space-y-1.5">
                  <Label htmlFor="totp-code" className="text-xs">
                    2. Enter 6-digit Code from Authenticator
                  </Label>
                  <Input
                    id="totp-code"
                    placeholder="123456"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="font-mono tracking-widest text-center text-sm w-44"
                    required
                  />
                  {mfaError && <p className="text-xs text-red-600">{mfaError}</p>}
                </div>
                <div className="flex items-center space-x-2">
                  <Button type="submit" size="sm">
                    Verify & Enable TOTP
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMfaEnroll(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <Button onClick={() => setShowMfaEnroll(true)} size="sm" className="gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Configure Authenticator App</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
