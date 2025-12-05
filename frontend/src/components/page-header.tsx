import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionButton?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
    variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  };
  className?: string;
  children?: React.ReactNode;
}

/**
 * Reusable Page Header Component
 * Ensures consistent page titles across all dashboard pages
 * Sidebar link names will always match page titles
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  actionButton,
  className,
  children,
}: PageHeaderProps) {
  const ActionIcon = actionButton?.icon;

  return (
    <div className={cn('space-y-4 mb-8', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-8 w-8 text-government-blue" />}
            <h1 className="text-3xl font-bold text-government-navy dark:text-white">
              {title}
            </h1>
          </div>
          {description && (
            <p className="text-neutral-600 dark:text-neutral-400 mt-2">
              {description}
            </p>
          )}
        </div>

        {actionButton && (
          <Button
            onClick={actionButton.onClick}
            variant={actionButton.variant || 'default'}
            className="bg-government-blue hover:bg-government-blue/90"
          >
            {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
            {actionButton.label}
          </Button>
        )}
      </div>

      {children}
    </div>
  );
}
