import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-zinc-100 text-zinc-950 shadow hover:bg-zinc-200 border border-zinc-200/20',
        destructive: 'bg-rose-900 text-rose-100 hover:bg-rose-800 shadow-sm',
        outline: 'border border-zinc-800/90 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100',

        secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 shadow-sm border border-zinc-700/50',
        ghost: 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
        link: 'text-zinc-400 underline-offset-4 hover:underline hover:text-zinc-100',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
