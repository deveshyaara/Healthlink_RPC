import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, WifiOff, ServerCrash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: 'default' | 'destructive';
  showIcon?: boolean;
  className?: string;
}

/**
 * Reusable Error Banner Component
 * Displays errors consistently across all dashboard pages
 * Includes retry functionality for transient failures
 */
export function ErrorBanner({
  title = 'Error',
  message,
  onRetry,
  variant = 'destructive',
  showIcon = true,
  className = '',
}: ErrorBannerProps) {
  // Detect specific error types from message
  const isNetworkError = message.toLowerCase().includes('network') ||
                         message.toLowerCase().includes('connection');
  const isDiscoveryError = message.toLowerCase().includes('discoveryservice') ||
                           message.toLowerCase().includes('access denied');
  const is500Error = message.includes('500') || isDiscoveryError;

  const Icon = isNetworkError ? WifiOff : is500Error ? ServerCrash : AlertCircle;

  return (
    <Alert variant={variant} className={`mb-4 ${className}`}>
      {showIcon && <Icon className="h-4 w-4" />}
      <AlertTitle className="font-semibold">{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{message}</p>

        {/* Helpful context based on error type */}
        {isDiscoveryError && (
          <p className="text-sm mb-3 opacity-90">
            <strong>Technical Details:</strong> The Hyperledger Fabric network discovery service cannot be reached.
            This usually means the blockchain network is not running or the middleware API cannot connect to it.
          </p>
        )}

        {isNetworkError && (
          <p className="text-sm mb-3 opacity-90">
            <strong>Suggestion:</strong> Check your internet connection and ensure the backend API is running.
          </p>
        )}

        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Empty State Component (when no error but no data)
 */
interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
        <Icon className="h-full w-full" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
