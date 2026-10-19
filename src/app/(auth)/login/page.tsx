'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Sparkles, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LoginPage() {
  const router = useRouter();
  const { login, switchDemoUser, profiles } = useAuth();
  const [email, setEmail] = React.useState('alex.director@company.com');
  const [password, setPassword] = React.useState('••••••••••••');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = (userId: string) => {
    setErrorMsg(null);
    switchDemoUser(userId);
    router.push('/');
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6">
        {/* App Branding */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Multi-Vertical Company CRM
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Internal Operations & Governance System (Invite-Only)
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="shadow-lg border-zinc-200 dark:border-zinc-800">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-semibold">Sign in to your account</CardTitle>
            <CardDescription className="text-xs">
              Enter your corporate credentials or choose a test account below
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMsg && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Corporate Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <Button type="submit" className="w-full text-xs" disabled={isLoading}>
                {isLoading ? 'Verifying...' : 'Sign In with Email'}
              </Button>
            </CardContent>
          </form>

          {/* Quick Demo Role Switcher */}
          <div className="p-4 pt-0 border-t border-zinc-100 dark:border-zinc-800 mt-2">
            <div className="flex items-center justify-between py-2">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Instant 1-Click Demo Accounts</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {profiles
                .filter((p) => !p.deleted_at && p.is_active)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleQuickDemoLogin(p.id)}
                    className="flex flex-col items-start rounded-md border border-zinc-200 p-2 text-left hover:bg-zinc-100/70 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {p.full_name}
                      </span>
                      <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 h-4">
                        {p.role}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-zinc-400 truncate w-full mt-0.5">
                      {p.email}
                    </span>
                  </button>
                ))}
            </div>
          </div>

          <CardFooter className="justify-center border-t border-zinc-100 p-3 dark:border-zinc-800">
            <p className="text-[11px] text-zinc-500">
              Have an invitation link?{' '}
              <Link href="/accept-invite" className="text-zinc-900 dark:text-zinc-100 font-medium underline">
                Accept invite
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
