'use client';

import { useUserRole } from '@/hooks/useUserRole';
import { Loader2, AlertCircle, UserX } from 'lucide-react';
import { UX4GCard, UX4GCardContent, UX4GCardHeader, UX4GCardTitle } from '@/components/ui/ux4g-card';
import { Button } from '@/components/ui/button';

/**
 * Role-Based Dashboard Wrapper
 *
 * Wraps your existing dashboard and shows different views based on user role.
 * This component handles loading, errors, and role-based routing.
 *
 * Usage:
 * ```tsx
 * <RoleDashboardWrapper>
 *   <YourDashboardContent />
 * </RoleDashboardWrapper>
 * ```
 */

interface RoleDashboardWrapperProps {
  children: React.ReactNode;
}

export function RoleDashboardWrapper({ children }: RoleDashboardWrapperProps) {
  const { isDoctor, isPatient, isAdmin, loading, error, walletAddress, refetch } = useUserRole();

  // Loading state - checking blockchain for user role
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-government-navy dark:text-white">
            Verifying Your Role
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Checking blockchain permissions...
          </p>
          {walletAddress && (
            <p className="text-xs text-neutral-500 dark:text-neutral-500 font-mono">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error state - failed to check role from smart contract
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <UX4GCard elevation="medium" padding="lg">
          <UX4GCardHeader>
            <UX4GCardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Role Verification Failed
            </UX4GCardTitle>
          </UX4GCardHeader>
          <UX4GCardContent>
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-300">
                  <strong>Error:</strong> {error}
                </p>
              </div>

              <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                <p><strong>Possible causes:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>MetaMask is not connected</li>
                  <li>You&apos;re on the wrong network (should be localhost:8545)</li>
                  <li>Smart contract is not deployed</li>
                  <li>Blockchain node is not running</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button onClick={refetch} variant="default">
                  Retry
                </Button>
                <Button
                  onClick={() => window.open('https://metamask.io/', '_blank')}
                  variant="outline"
                >
                  Install MetaMask
                </Button>
              </div>
            </div>
          </UX4GCardContent>
        </UX4GCard>
      </div>
    );
  }

  // No role assigned - user exists but has no role on smart contract
  if (!isDoctor && !isPatient && !isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <UX4GCard elevation="medium" padding="lg">
          <UX4GCardHeader>
            <UX4GCardTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5" />
              No Role Assigned
            </UX4GCardTitle>
          </UX4GCardHeader>
          <UX4GCardContent>
            <div className="space-y-4">
              <p className="text-neutral-600 dark:text-neutral-400">
                Your wallet address has not been assigned a role in the HealthLink system.
              </p>

              <div className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-md">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Your Wallet Address:
                </p>
                <p className="text-xs font-mono text-neutral-600 dark:text-neutral-400 break-all">
                  {walletAddress}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Next Steps:</strong> Contact a system administrator to assign you a role
                  (Patient, Doctor, or Admin) on the blockchain.
                </p>
              </div>

              <Button onClick={refetch} variant="outline" className="w-full">
                Check Again
              </Button>
            </div>
          </UX4GCardContent>
        </UX4GCard>
      </div>
    );
  }

  // Role assigned - render children with role header
  return (
    <div className="space-y-6">
      {/* Role Badge Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-government-navy dark:text-white">
            {isAdmin && 'Admin Dashboard'}
            {isDoctor && 'Doctor Dashboard'}
            {isPatient && 'Patient Dashboard'}
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {isAdmin && 'System administration and management'}
            {isDoctor && 'Manage patients and medical records'}
            {isPatient && 'View your health records and appointments'}
          </p>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-2">
          <div className={`px-4 py-2 rounded-full text-sm font-medium ${
            isAdmin ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
            isDoctor ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          }`}>
            {isAdmin && '👑 Administrator'}
            {isDoctor && '⚕️ Doctor'}
            {isPatient && '🏥 Patient'}
          </div>
        </div>
      </div>

      {/* Original Dashboard Content */}
      {children}
    </div>
  );
}

/**
 * Role-Specific Content Component
 *
 * Shows different content based on user role.
 * Use this to add role-specific sections to your dashboard.
 *
 * Usage:
 * ```tsx
 * <RoleSpecificContent
 *   doctorContent={<DoctorStats />}
 *   patientContent={<PatientStats />}
 *   adminContent={<AdminStats />}
 * />
 * ```
 */

interface RoleSpecificContentProps {
  doctorContent?: React.ReactNode;
  patientContent?: React.ReactNode;
  adminContent?: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleSpecificContent({
  doctorContent,
  patientContent,
  adminContent,
  fallback
}: RoleSpecificContentProps) {
  const { isDoctor, isPatient, isAdmin } = useUserRole();

  if (isAdmin && adminContent) {
    return <>{adminContent}</>;
  }
  if (isDoctor && doctorContent) {
    return <>{doctorContent}</>;
  }
  if (isPatient && patientContent) {
    return <>{patientContent}</>;
  }

  return <>{fallback}</>;
}
