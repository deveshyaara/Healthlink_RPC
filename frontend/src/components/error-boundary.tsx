'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { UX4GCard, UX4GCardContent } from '@/components/ui/ux4g-card';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <UX4GCard elevation="medium" padding="lg" className="max-w-md w-full">
            <UX4GCardContent className="text-center">
              <div className="text-red-500 mb-4">
                <AlertTriangle className="h-16 w-16 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
                Something went wrong
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-4 text-left">
                  <summary className="cursor-pointer text-sm font-medium mb-2">
                    Error Details (Development)
                  </summary>
                  <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-auto max-h-32">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex gap-2 justify-center">
                <Button onClick={this.resetError} variant="outline">
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </div>
            </UX4GCardContent>
          </UX4GCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
