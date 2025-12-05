/**
 * UX4G Chip Component
 * Compliant with Indian Government UX Guidelines
 * Chips are interactive badges with close/delete functionality
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const ux4gChipVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-all hover:shadow-md',
  {
    variants: {
      variant: {
        default:
          'border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50',
        primary:
          'border-government-blue/20 bg-government-blue/10 text-government-blue hover:bg-government-blue/20',
        success:
          'border-success/20 bg-success/10 text-success hover:bg-success/20',
        warning:
          'border-warning/20 bg-warning/10 text-warning hover:bg-warning/20',
        danger:
          'border-danger/20 bg-danger/10 text-danger hover:bg-danger/20',
        info:
          'border-info/20 bg-info/10 text-info hover:bg-info/20',
      },
      size: {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
);

export interface UX4GChipProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof ux4gChipVariants> {
  onDelete?: () => void;
  icon?: React.ReactNode;
}

const UX4GChip = React.forwardRef<HTMLDivElement, UX4GChipProps>(
  ({ className, variant, size, onDelete, icon, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(ux4gChipVariants({ variant, size, className }))}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Remove"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  },
);

UX4GChip.displayName = 'UX4GChip';

export { UX4GChip, ux4gChipVariants };
