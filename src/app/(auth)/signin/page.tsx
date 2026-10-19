'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function SignInRedirectPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-500">
      Redirecting to Sign In...
    </div>
  );
}
