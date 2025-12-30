"use client";

import React, { useEffect, useState } from 'react';
import { UX4GCard, UX4GCardContent, UX4GCardHeader, UX4GCardTitle } from '@/components/ui/ux4g-card';
import { UX4GBadge } from '@/components/ui/ux4g-badge';
import { LayoutDashboard, Users, ServerCog, CircleCheck, AlertTriangle } from 'lucide-react';
import { dashboardApi, usersApi, healthApi } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ doctors: 0, patients: 0, records: 0 });
  const [health, setHealth] = useState({ online: true, blockchainSync: 'Unknown' });
  const [actionItems, setActionItems] = useState({ pendingVerifications: 0, flaggedAccounts: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [dStats, users, h] = await Promise.all([
          dashboardApi.getStats().catch(() => ({ totalRecords: 0, activeRecords: 0 })),
          usersApi.getUsers().catch(() => []),
          healthApi.check().catch(() => ({ status: 'down', blockchainSync: 'Unknown' })),
        ]);

        // Defensive null checks for users array
        const safeUsers = Array.isArray(users) ? users : [];
        const doctors = safeUsers.filter((u: any) => u?.role === 'doctor').length;
        const patients = safeUsers.filter((u: any) => u?.role === 'patient').length;
        const pendingVerifications = safeUsers.filter((u: any) => u?.isVerified === false && u?.role === 'doctor').length;
        const flaggedAccounts = safeUsers.filter((u: any) => u?.flagged === true).length;

        // Defensive null checks for stats
        const totalRecords = dStats?.totalRecords ?? dStats?.activeRecords ?? 0;
        const online = h?.status !== 'down';
        const blockchainSync = h?.blockchainSync ?? 'Unknown';

        setStats({ doctors, patients, records: totalRecords });
        setHealth({ online, blockchainSync });
        setActionItems({ pendingVerifications, flaggedAccounts });
      } catch (e) {
        console.error('Failed to load admin dashboard', e);
        toast({ title: 'Error', description: 'Failed to load admin dashboard data', variant: 'destructive' });

        // Set safe defaults on error
        setStats({ doctors: 0, patients: 0, records: 0 });
        setHealth({ online: false, blockchainSync: 'Unknown' });
        setActionItems({ pendingVerifications: 0, flaggedAccounts: 0 });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-government-navy dark:text-white">Admin Console | {user.name || user.email}</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">System Management Console</p>
        </div>
        <UX4GBadge variant="success" className="hidden md:inline-flex">
          <CircleCheck className="h-3 w-3 mr-1" />
          System Online
        </UX4GBadge>
      </div>

      {/* Platform Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <UX4GCard elevation="medium" hover padding="md">
          <UX4GCardHeader>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Doctors</p>
                <h3 className="text-3xl font-bold text-government-navy dark:text-white">{loading ? '—' : stats.doctors}</h3>
              </div>
              <div className="p-3 rounded-lg bg-government-blue/10">
                <Users className="h-6 w-6 text-government-blue" />
              </div>
            </div>
          </UX4GCardHeader>
          <UX4GCardContent>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Registered and verified doctors</p>
          </UX4GCardContent>
        </UX4GCard>

        <UX4GCard elevation="medium" hover padding="md">
          <UX4GCardHeader>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Patients</p>
                <h3 className="text-3xl font-bold text-government-navy dark:text-white">{loading ? '—' : stats.patients}</h3>
              </div>
              <div className="p-3 rounded-lg bg-success/10">
                <LayoutDashboard className="h-6 w-6 text-success" />
              </div>
            </div>
          </UX4GCardHeader>
          <UX4GCardContent>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Active patient accounts</p>
          </UX4GCardContent>
        </UX4GCard>

        <UX4GCard elevation="medium" hover padding="md">
          <UX4GCardHeader>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Records Stored</p>
                <h3 className="text-3xl font-bold text-government-navy dark:text-white">{loading ? '—' : stats.records}</h3>
              </div>
              <div className="p-3 rounded-lg bg-info/10">
                <ServerCog className="h-6 w-6 text-info" />
              </div>
            </div>
          </UX4GCardHeader>
          <UX4GCardContent>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">Total stored medical records across system</p>
          </UX4GCardContent>
        </UX4GCard>
      </div>

      {/* Health + Action Items */}
      <div className="grid gap-6 lg:grid-cols-3">
        <UX4GCard elevation="medium" padding="none">
          <UX4GCardHeader className="p-6 border-b">
            <UX4GCardTitle>Health Status</UX4GCardTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Overview of platform and integrations</p>
          </UX4GCardHeader>
          <UX4GCardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">System Online</p>
                  <p className="text-xs text-neutral-600">{health.online ? 'Yes' : 'No'}</p>
                </div>
                <UX4GBadge variant={health.online ? 'success' : 'danger'} className="text-xs">
                  {health.online ? 'Online' : 'Offline'}
                </UX4GBadge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Blockchain Sync</p>
                  <p className="text-xs text-neutral-600">{health.blockchainSync}</p>
                </div>
                <UX4GBadge variant="info" className="text-xs">{health.blockchainSync}</UX4GBadge>
              </div>
            </div>
          </UX4GCardContent>
        </UX4GCard>

        <UX4GCard elevation="medium" padding="none">
          <UX4GCardHeader className="p-6 border-b">
            <UX4GCardTitle>Action Items</UX4GCardTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Outstanding tasks requiring admin attention</p>
          </UX4GCardHeader>
          <UX4GCardContent className="p-6">
            <ul className="space-y-4">
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium">Pending Doctor Verifications</p>
                    <p className="text-xs text-neutral-600">Require review and approval</p>
                  </div>
                </div>
                <div className="text-xl font-bold">{loading ? '—' : actionItems.pendingVerifications}</div>
              </li>

              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium">Flagged Accounts</p>
                    <p className="text-xs text-neutral-600">Accounts flagged for review</p>
                  </div>
                </div>
                <div className="text-xl font-bold">{loading ? '—' : actionItems.flaggedAccounts}</div>
              </li>
            </ul>
          </UX4GCardContent>
        </UX4GCard>

        <UX4GCard elevation="medium" padding="none">
          <UX4GCardHeader className="p-6 border-b">
            <UX4GCardTitle>User Directory</UX4GCardTitle>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">Quick access to user management</p>
          </UX4GCardHeader>
          <UX4GCardContent className="p-6">
            <p className="text-sm text-neutral-600">Use the User Management section to view and manage doctors, patients, and pending verifications.</p>
          </UX4GCardContent>
        </UX4GCard>
      </div>
    </div>
  );
}
