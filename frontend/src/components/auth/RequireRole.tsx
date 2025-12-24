/* eslint-disable no-console */
/**
 * RequireRole Component
 *
 * Route guard wrapper that checks if user has required role before rendering children
 * Redirects to access denied page if user lacks the required role
 *
 * Usage:
 * ```tsx
 * import { RequireRole } from '@/components/auth/RequireRole';
 *
 * // Protect admin routes
 * <RequireRole requiredRole="ADMIN">
 *   <AdminDashboard />
 * </RequireRole>
 *
 * // Protect doctor routes
 * <RequireRole requiredRole="DOCTOR">
 *   <DoctorDashboard />
 * </RequireRole>
 * ```
 */

'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { ROLE_HASHES } from '@/lib/roleHelpers';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, ShieldX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface RequireRoleProps {
  requiredRole: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function RequireRole({
  requiredRole,
  children,
  fallback,
  redirectTo = '/access-denied',
}: RequireRoleProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [hasRole, setHasRole] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkRole() {
      // Admin users always have access
      // If auth context is still loading, skip role checks until it finishes
      if (authLoading) {
        return;
      }

      if (user?.role?.toLowerCase() === 'admin') {
        if (mounted) {
          setHasRole(true);
          setLoading(false);
        }
        return;
      }

      if (!user) {
        // No authenticated user after auth finished
        if (mounted) {
          setHasRole(false);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get provider and signer
        if (typeof window === 'undefined' || !window.ethereum) {
          throw new Error('MetaMask not found');
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        // Load contract
        const contractResponse = await fetch('/contracts/HealthLink.json');
        if (!contractResponse.ok) {
          throw new Error('Failed to load contract ABI');
        }
        const contractData = await contractResponse.json();

        const contractAddress = process.env.NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS;
        if (!contractAddress) {
          throw new Error('Contract address not configured');
        }

        const contract = new ethers.Contract(
          contractAddress,
          contractData.abi,
          provider
        );

        // Convert role name to hash using roleHelpers
        const roleHash = ROLE_HASHES[requiredRole];

        console.log('\n🔐 RequireRole Check:');
        console.log(`   Required Role: ${requiredRole}`);
        console.log(`   Role Hash: ${roleHash}`);
        console.log(`   User Address: ${address}`);

        // Check if user has the required role
        const hasRequiredRole = await contract.hasRole(roleHash, address);

        console.log(`   Has Role: ${hasRequiredRole ? '✅ YES' : '❌ NO'}\n`);

        if (!mounted) {
          return;
        }

        setHasRole(Boolean(hasRequiredRole));
      } catch (err) {
        console.error('❌ Role check failed:', err);
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Unknown error');
        setHasRole(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkRole();

    return () => {
      mounted = false;
    };
  }, [user, requiredRole, router, redirectTo]);

  // Show auth loading first to avoid flashing redirects
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-government-blue mb-4" />
            <p className="text-sm text-muted-foreground">Verifying permissions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <ShieldX className="h-5 w-5" />
              Permission Check Failed
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access denied state
  if (hasRole === false) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <ShieldX className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don&apos;t have {requiredRole.toLowerCase()} permissions to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
              <p className="text-sm font-medium mb-1">Need Access?</p>
              <p className="text-xs text-muted-foreground">
                Contact your administrator to request {requiredRole.toLowerCase()} role permissions.
              </p>
            </div>
            <Button onClick={() => router.push('/')} className="w-full" variant="outline">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has required role - render children
  return <>{children}</>;
}

/**
 * RequireAdmin - Shorthand for requiring ADMIN role
 */
export function RequireAdmin({ children, ...props }: Omit<RequireRoleProps, 'requiredRole'>) {
  return (
    <RequireRole requiredRole="ADMIN" {...props}>
      {children}
    </RequireRole>
  );
}

/**
 * RequireDoctor - Shorthand for requiring DOCTOR role
 */
export function RequireDoctor({ children, ...props }: Omit<RequireRoleProps, 'requiredRole'>) {
  return (
    <RequireRole requiredRole="DOCTOR" {...props}>
      {children}
    </RequireRole>
  );
}

/**
 * RequirePatient - Shorthand for requiring PATIENT role
 */
export function RequirePatient({ children, ...props }: Omit<RequireRoleProps, 'requiredRole'>) {
  return (
    <RequireRole requiredRole="PATIENT" {...props}>
      {children}
    </RequireRole>
  );
}
