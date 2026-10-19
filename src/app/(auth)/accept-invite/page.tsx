'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';

export default function AcceptInvitePage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center text-xs">Loading invitation...</div>}>
      <AcceptInviteContent />
    </React.Suspense>
  );
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || 'new.member@company.com';
  const { login } = useAuth();

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await login(emailParam);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to activate invitation. Please contact your organization owner.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
            <UserCheck className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Accept Your Invitation
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            You have been invited to join the internal company CRM.
          </p>
        </div>

        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-semibold">Set Up Your Account</CardTitle>
            <CardDescription className="text-xs">
              Complete your profile and choose a secure password to access your assigned verticals.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleAccept}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Invited Email</Label>
                <Input
                  value={emailParam}
                  disabled
                  className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pass" className="text-xs">Create Password</Label>
                <Input
                  id="pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pass" className="text-xs">Confirm Password</Label>
                <Input
                  id="confirm-pass"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                />
              </div>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              <Button type="submit" className="w-full text-xs" disabled={isSubmitting}>
                {isSubmitting ? 'Activating Account...' : 'Activate & Enter Workspace'}
              </Button>
            </CardContent>
          </form>

          <CardFooter className="justify-center border-t border-zinc-100 p-3 dark:border-zinc-800">
            <Link href="/login" className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Already have an account? Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
