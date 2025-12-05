/**
 * UX4G Badge Component
 * Compliant with Indian Government UX Guidelines
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const ux4gBadgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900',
        primary:
          'border-transparent bg-government-blue text-white',
        success:
          'border-transparent bg-success text-white',
        warning:
          'border-transparent bg-warning text-neutral-900',
        danger:
          'border-transparent bg-danger text-white',
        info:
          'border-transparent bg-info text-white',
        secondary:
          'border-transparent bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50',
        outline:
          'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface UX4GBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof ux4gBadgeVariants> {}

function UX4GBadge({ className, variant, ...props }: UX4GBadgeProps) {
  return (
    <div className={cn(ux4gBadgeVariants({ variant }), className)} {...props} />
  );
}

export { UX4GBadge, ux4gBadgeVariants };
