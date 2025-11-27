/**
 * UX4G Button Component
 * Compliant with Indian Government UX Guidelines
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const ux4gButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary - Government Blue
        primary:
          'bg-government-blue text-white hover:bg-government-navy shadow-md hover:shadow-lg active:shadow-sm',
        
        // Secondary - Outline style
        secondary:
          'border-2 border-government-blue text-government-blue hover:bg-government-blue hover:text-white',
        
        // Success - Green
        success:
          'bg-success text-white hover:bg-green-600 shadow-md hover:shadow-lg',
        
        // Warning - Orange/Saffron
        warning:
          'bg-warning text-neutral-900 hover:bg-government-saffron shadow-md hover:shadow-lg',
        
        // Danger - Red
        danger:
          'bg-danger text-white hover:bg-red-600 shadow-md hover:shadow-lg',
        
        // Ghost - Minimal style
        ghost:
          'hover:bg-neutral-100 hover:text-government-blue dark:hover:bg-neutral-800',
        
        // Link - Text only
        link:
          'text-government-blue underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface UX4GButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof ux4gButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

const UX4GButton = React.forwardRef<HTMLButtonElement, UX4GButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      loading = false,
      disabled,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    
    if (asChild) {
      return (
        <Comp
          className={cn(ux4gButtonVariants({ variant, size, fullWidth, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }
    
    return (
      <Comp
        className={cn(ux4gButtonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </Comp>
    );
  }
);

UX4GButton.displayName = 'UX4GButton';

export { UX4GButton, ux4gButtonVariants };
