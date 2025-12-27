// Sentry Error Tracking Configuration
// This file sets up Sentry for production error monitoring

/*
Installation Steps:
1. Install Sentry SDK:
   npm install @sentry/nextjs

2. Initialize Sentry:
   npx @sentry/wizard@latest -i nextjs

3. Set environment variables in .env.local:
   NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
   SENTRY_AUTH_TOKEN=your-auth-token

4. Import this config in your root layout or _app file
*/

// Example Sentry initialization
export function initSentry() {
    if (typeof window === 'undefined') return;

    // Check if Sentry is available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
        const Sentry = (window as any).Sentry;

        Sentry.init({
            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
            environment: process.env.NODE_ENV,
            tracesSampleRate: 1.0,
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,
        });
    }
}

// Error boundary component
export function logError(error: Error, errorInfo?: any) {
    console.error('Error caught:', error, errorInfo);

    // Send to Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
            contexts: {
                react: errorInfo,
            },
        });
    }
}

// Performance monitoring
export function trackPerformance(metricName: string, value: number) {
    if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.metrics.distribution(metricName, value, {
            unit: 'millisecond',
        });
    }
}

// Custom error tracking
export function trackCustomError(message: string, context?: any) {
    if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureMessage(message, {
            level: 'error',
            extra: context,
        });
    } else {
        console.error(message, context);
    }
}

/*
Usage Examples:

1. In components:
   try {
     // your code
   } catch (error) {
     logError(error as Error);
   }

2. For custom tracking:
   trackCustomError('Payment failed', { userId, amount });

3. For performance:
   const start = Date.now();
   // ... operation
   trackPerformance('api_call_duration', Date.now() - start);
*/
