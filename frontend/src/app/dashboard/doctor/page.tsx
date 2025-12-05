'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, FileText, Activity, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { appointmentsApi, medicalRecordsApi, prescriptionsApi } from '@/lib/api-client';
import { ErrorBanner } from '@/components/ui/error-banner';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    appointments: 0,
    patients: 0,
    prescriptions: 0,
    labResults: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setError(null);
        setLoading(true);

        // Fetch real data from APIs
        const [appointmentsData, recordsData, prescriptionsData] = await Promise.allSettled([
          appointmentsApi.getAllAppointments(),
          medicalRecordsApi.getAllRecords(),
          prescriptionsApi.getAllPrescriptions(),
        ]);

        setStats({
          appointments: appointmentsData.status === 'fulfilled' && Array.isArray(appointmentsData.value) ? appointmentsData.value.length : 0,
          patients: recordsData.status === 'fulfilled' && Array.isArray(recordsData.value) ? recordsData.value.length : 0,
          prescriptions: prescriptionsData.status === 'fulfilled' && Array.isArray(prescriptionsData.value) ? prescriptionsData.value.length : 0,
          labResults: 0, // TODO: Implement lab results API
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
    { label: "Today's Appointments", value: stats.appointments.toString(), icon: Calendar, href: '/dashboard/appointments' },
    { label: 'Active Patients', value: stats.patients.toString(), icon: Users, href: '/dashboard/records' },
    { label: 'Pending Prescriptions', value: stats.prescriptions.toString(), icon: FileText, href: '/dashboard/prescriptions' },
    { label: 'Lab Results', value: stats.labResults.toString(), icon: ClipboardList, href: '/dashboard/lab-tests' },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-headline font-bold">Welcome back, Dr. {user?.name || 'Doctor'}!</h1>
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
        <h1 className="text-3xl font-headline font-bold">Welcome back, Dr. {user?.name || 'Doctor'}!</h1>
        <p className="text-muted-foreground mt-1">Here's your overview for today</p>
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
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>Your appointments for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">John Doe</p>
                  <p className="text-sm text-muted-foreground">10:00 AM - Checkup</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">Jane Smith</p>
                  <p className="text-sm text-muted-foreground">11:30 AM - Follow-up</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bob Johnson</p>
                  <p className="text-sm text-muted-foreground">2:00 PM - Consultation</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
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
            <CardDescription>Latest updates and actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Lab results received</p>
                  <p className="text-xs text-muted-foreground">Patient: John Doe - 2 hours ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Prescription approved</p>
                  <p className="text-xs text-muted-foreground">Patient: Jane Smith - 4 hours ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-yellow-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Appointment rescheduled</p>
                  <p className="text-xs text-muted-foreground">Patient: Bob Johnson - 1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Link href="/dashboard/records">
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                View Records
              </Button>
            </Link>
            <Link href="/dashboard/prescriptions">
              <Button variant="outline" className="w-full">
                <ClipboardList className="mr-2 h-4 w-4" />
                Prescriptions
              </Button>
            </Link>
            <Link href="/dashboard/appointments">
              <Button variant="outline" className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule
              </Button>
            </Link>
            <Link href="/dashboard/lab-tests">
              <Button variant="outline" className="w-full">
                <Activity className="mr-2 h-4 w-4" />
                Lab Tests
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
