/**
 * UX4G Card Component
 * Compliant with Indian Government UX Guidelines
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const ux4gCardVariants = cva(
  'rounded-lg bg-white dark:bg-neutral-900 transition-all',
  {
    variants: {
      elevation: {
        none: 'shadow-none border border-neutral-200 dark:border-neutral-800',
        low: 'shadow-sm border border-neutral-200 dark:border-neutral-800',
        medium: 'shadow-md',
        high: 'shadow-lg',
      },
      hover: {
        true: 'hover:shadow-xl hover:-translate-y-0.5 cursor-pointer',
        false: '',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      elevation: 'medium',
      hover: false,
      padding: 'md',
    },
  }
);

export interface UX4GCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof ux4gCardVariants> {}

const UX4GCard = React.forwardRef<HTMLDivElement, UX4GCardProps>(
  ({ className, elevation, hover, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(ux4gCardVariants({ elevation, hover, padding, className }))}
      {...props}
    />
  )
);
UX4GCard.displayName = 'UX4GCard';

const UX4GCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  />
));
UX4GCardHeader.displayName = 'UX4GCardHeader';

const UX4GCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-none tracking-tight text-government-navy dark:text-white',
      className
    )}
    {...props}
  />
));
UX4GCardTitle.displayName = 'UX4GCardTitle';

const UX4GCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-neutral-600 dark:text-neutral-400', className)}
    {...props}
  />
));
UX4GCardDescription.displayName = 'UX4GCardDescription';

const UX4GCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-0', className)} {...props} />
));
UX4GCardContent.displayName = 'UX4GCardContent';

const UX4GCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4 border-t border-neutral-200 dark:border-neutral-800', className)}
    {...props}
  />
));
UX4GCardFooter.displayName = 'UX4GCardFooter';

export {
  UX4GCard,
  UX4GCardHeader,
  UX4GCardFooter,
  UX4GCardTitle,
  UX4GCardDescription,
  UX4GCardContent,
};
