'use client';

import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserCheck, AlertCircle } from 'lucide-react';

/**
 * Example 1: Role-based Dashboard Rendering
 *
 * This component demonstrates how to conditionally render different
 * dashboards based on user role from the smart contract
 */
export function RoleBasedDashboard() {
  const { isDoctor, isPatient, isAdmin, loading, error, refetch } = useUserRole();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking your role on blockchain...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Role Check Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin Dashboard
  if (isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Admin Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You have administrator privileges on the blockchain.
            </p>
            <div className="space-y-4">
              <Button variant="default" className="w-full">
                Manage Users
              </Button>
              <Button variant="outline" className="w-full">
                View Audit Logs
              </Button>
              <Button variant="outline" className="w-full">
                System Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Doctor Dashboard
  if (isDoctor) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Doctor Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Welcome, Doctor! Manage your patients and medical records.
            </p>
            <div className="space-y-4">
              <Button variant="default" className="w-full">
                My Patients
              </Button>
              <Button variant="outline" className="w-full">
                Pending Appointments
              </Button>
              <Button variant="outline" className="w-full">
                Create Prescription
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Patient Dashboard (default)
  if (isPatient) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Patient Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Welcome! View your medical records and appointments.
            </p>
            <div className="space-y-4">
              <Button variant="default" className="w-full">
                My Health Records
              </Button>
              <Button variant="outline" className="w-full">
                My Appointments
              </Button>
              <Button variant="outline" className="w-full">
                Find a Doctor
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No role assigned
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>No Role Assigned</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Your wallet address has not been assigned a role on the blockchain.
            Please contact an administrator.
          </p>
          <Button onClick={refetch} variant="outline" className="w-full">
            Check Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Example 2: Simple Conditional Rendering
 */
export function SimpleRoleCheck() {
  const { isDoctor, isPatient, loading } = useUserRole();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {isDoctor && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold">Doctor View</h3>
          <p>Content only visible to doctors</p>
        </div>
      )}

      {isPatient && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold">Patient View</h3>
          <p>Content only visible to patients</p>
        </div>
      )}
    </div>
  );
}

/**
 * Example 3: Role Guard Component
 *
 * Wrap content that should only be visible to specific roles
 */
interface RoleGuardProps {
  allowedRoles: ('doctor' | 'patient' | 'admin')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { isDoctor, isPatient, isAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const hasAccess = allowedRoles.some(role => {
    switch (role) {
      case 'doctor': return isDoctor;
      case 'patient': return isPatient;
      case 'admin': return isAdmin;
      default: return false;
    }
  });

  if (!hasAccess) {
    return fallback || (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            You don&apos;t have permission to view this content.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}

/**
 * Example 4: Using Role Guard
 */
export function ProtectedContent() {
  return (
    <div className="space-y-6">
      {/* Only doctors can see this */}
      <RoleGuard allowedRoles={['doctor']}>
        <Card>
          <CardHeader>
            <CardTitle>Doctor-Only Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is only visible to doctors</p>
          </CardContent>
        </Card>
      </RoleGuard>

      {/* Both doctors and admins can see this */}
      <RoleGuard allowedRoles={['doctor', 'admin']}>
        <Card>
          <CardHeader>
            <CardTitle>Staff Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is visible to doctors and admins</p>
          </CardContent>
        </Card>
      </RoleGuard>

      {/* Everyone can see this */}
      <Card>
        <CardHeader>
          <CardTitle>Public Content</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is visible to everyone</p>
        </CardContent>
      </Card>
    </div>
  );
}
