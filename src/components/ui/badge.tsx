import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-zinc-900 text-zinc-50 shadow hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900',
        secondary: 'border-transparent bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100',
        destructive: 'border-transparent bg-red-500 text-white shadow hover:bg-red-600',
        outline: 'text-zinc-950 dark:text-zinc-50 border-zinc-200 dark:border-zinc-800',
        success: 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/20 border-emerald-500/20',
        warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:bg-amber-500/20 border-amber-500/20',
        info: 'border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-300 dark:bg-blue-500/20 border-blue-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
