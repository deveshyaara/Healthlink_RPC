'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { canAccessRoute } from '@/config/navigation';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * RouteGuard Component
 *
 * Protects routes based on user roles
 * Redirects unauthorized users to appropriate dashboard
 * Shows 403 Forbidden page for direct access attempts
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const path = pathname ?? '/';

  useEffect(() => {
    // Wait for auth to load
    if (loading) {
      return;
    }

    // If not authenticated, redirect to login
    if (!user) {
      router.push('/signin');
      return;
    }

    // Admin has access to all routes - skip access check
    if (user.role?.toLowerCase() === 'admin') {
      return;
    }

    // Check if user has access to current route
    const hasAccess = canAccessRoute(user.role, path);

    if (!hasAccess) {
      // Don't redirect, show 403 page instead (better UX)
      // User might have bookmarked the URL or clicked a shared link
    }
  }, [user, loading, path, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-government-blue"></div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect in useEffect
  }

  // Admin users bypass all access checks
  if (user.role?.toLowerCase() === 'admin') {
    return <>{children}</>;
  }

  // Check access
  const hasAccess = canAccessRoute(user.role, path);

  // Show 403 Forbidden page
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            You don&apos;t have permission to access this page. This feature is not available for {user.role}s.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full bg-government-blue hover:bg-government-blue/90">
              <Link href={user.role === 'doctor' ? '/dashboard/doctor' : '/dashboard/patient'}>
                Go to My Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                Back to Home
              </Link>
            </Button>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-6">
            Error Code: 403 Forbidden
          </p>
        </div>
      </div>
    );
  }

  // User has access, render children
  return <>{children}</>;
}
