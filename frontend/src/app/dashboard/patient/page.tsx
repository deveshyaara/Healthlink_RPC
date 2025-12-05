'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Heart, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { appointmentsApi, medicalRecordsApi, prescriptionsApi, consentsApi } from '@/lib/api-client';
import { ErrorBanner } from '@/components/ui/error-banner';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    appointments: 0,
    records: 0,
    prescriptions: 0,
    consents: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError(null);
        setLoading(true);

        // Fetch real data from APIs (parallel requests)
        const [appointmentsData, recordsData, prescriptionsData, consentsData] = await Promise.allSettled([
          appointmentsApi.getAllAppointments(),
          medicalRecordsApi.getAllRecords(),
          prescriptionsApi.getAllPrescriptions(),
          consentsApi.getAllConsents(),
        ]);

        setStats({
          appointments: appointmentsData.status === 'fulfilled' && Array.isArray(appointmentsData.value) ? appointmentsData.value.length : 0,
          records: recordsData.status === 'fulfilled' && Array.isArray(recordsData.value) ? recordsData.value.length : 0,
          prescriptions: prescriptionsData.status === 'fulfilled' && Array.isArray(prescriptionsData.value) ? prescriptionsData.value.length : 0,
          consents: consentsData.status === 'fulfilled' && Array.isArray(consentsData.value) ? consentsData.value.length : 0,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard statistics';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const quickStats = [
    { label: 'Upcoming Appointments', value: stats.appointments.toString(), icon: Calendar, href: '/dashboard/appointments' },
    { label: 'Medical Records', value: stats.records.toString(), icon: FileText, href: '/dashboard/records' },
    { label: 'Active Prescriptions', value: stats.prescriptions.toString(), icon: Heart, href: '/dashboard/prescriptions' },
    { label: 'Consents Given', value: stats.consents.toString(), icon: ShieldCheck, href: '/dashboard/consent' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-headline font-bold">Welcome back, {user?.name || 'Patient'}!</h1>
          <p className="text-muted-foreground mt-1">Loading your dashboard...</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-headline font-bold">Welcome back, {user?.name || 'Patient'}!</h1>
        <p className="text-muted-foreground mt-1">Manage your health records and appointments</p>
      </div>

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          title="Unable to Load Dashboard"
          message={error}
          onRetry={() => window.location.reload()}
        />
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Main Content Areas */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Appointments
            </CardTitle>
            <CardDescription>Your scheduled visits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">Dr. Sarah Johnson</p>
                  <p className="text-sm text-muted-foreground">Tomorrow, 10:00 AM - Checkup</p>
                </div>
                <Button variant="outline" size="sm">Details</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dr. Michael Chen</p>
                  <p className="text-sm text-muted-foreground">Dec 15, 2:00 PM - Follow-up</p>
                </div>
                <Button variant="outline" size="sm">Details</Button>
              </div>
            </div>
            <Link href="/dashboard/appointments">
              <Button className="w-full mt-4" variant="secondary">View All Appointments</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest health updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New lab results available</p>
                  <p className="text-xs text-muted-foreground">Blood test - 1 day ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Prescription refilled</p>
                  <p className="text-xs text-muted-foreground">Medication ABC - 3 days ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-purple-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Consent granted</p>
                  <p className="text-xs text-muted-foreground">To Dr. Johnson - 1 week ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Health Summary</CardTitle>
          <CardDescription>Quick overview of your health status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Blood Pressure</p>
                  <p className="text-sm text-muted-foreground">120/80 mmHg - Normal</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">View History</Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Heart Rate</p>
                  <p className="text-sm text-muted-foreground">72 bpm - Normal</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">View History</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Link href="/dashboard/appointments">
              <Button variant="outline" className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                Book Appointment
              </Button>
            </Link>
            <Link href="/dashboard/records">
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                View Records
              </Button>
            </Link>
            <Link href="/dashboard/prescriptions">
              <Button variant="outline" className="w-full">
                <Heart className="mr-2 h-4 w-4" />
                Prescriptions
              </Button>
            </Link>
            <Link href="/dashboard/consent">
              <Button variant="outline" className="w-full">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Manage Consent
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
