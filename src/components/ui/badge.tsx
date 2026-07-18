import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-zinc-100 text-zinc-900 shadow hover:bg-zinc-200',
        secondary: 'border-transparent bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
        outline: 'text-zinc-300 border-zinc-800 bg-transparent',
        success: 'border-transparent bg-emerald-950/30 text-emerald-400 border border-emerald-800/40',
        warning: 'border-transparent bg-amber-950/30 text-amber-400 border border-amber-800/40',
        destructive: 'border-transparent bg-rose-950/30 text-rose-400 border border-rose-900/40',
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
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
