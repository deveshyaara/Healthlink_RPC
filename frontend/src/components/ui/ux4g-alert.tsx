/**
 * UX4G Alert Component
 * Compliant with Indian Government UX Guidelines
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Info,
  XCircle,
  AlertTriangle,
  X,
} from 'lucide-react';

const ux4gAlertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default:
          'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 border-neutral-200 dark:border-neutral-700',
        info:
          'bg-info/10 text-info-foreground border-info/30 [&>svg]:text-info',
        success:
          'bg-success/10 text-success-foreground border-success/30 [&>svg]:text-success',
        warning:
          'bg-warning/10 text-warning-foreground border-warning/30 [&>svg]:text-warning',
        danger:
          'bg-danger/10 text-danger-foreground border-danger/30 [&>svg]:text-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const variantIcons = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export interface UX4GAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof ux4gAlertVariants> {
  dismissible?: boolean;
  onDismiss?: () => void;
}

const UX4GAlert = React.forwardRef<HTMLDivElement, UX4GAlertProps>(
  ({ className, variant = 'default', dismissible = false, onDismiss, children, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(true);
    const Icon = variantIcons[variant || 'default'];

    if (!isVisible) {return null;}

    const handleDismiss = () => {
      setIsVisible(false);
      onDismiss?.();
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(ux4gAlertVariants({ variant }), className)}
        {...props}
      >
        <Icon className="h-4 w-4" />
        {children}
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
UX4GAlert.displayName = 'UX4GAlert';

const UX4GAlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
UX4GAlertTitle.displayName = 'UX4GAlertTitle';

const UX4GAlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));
UX4GAlertDescription.displayName = 'UX4GAlertDescription';

export { UX4GAlert, UX4GAlertTitle, UX4GAlertDescription };
