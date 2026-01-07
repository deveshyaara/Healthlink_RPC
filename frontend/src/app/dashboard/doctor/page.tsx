'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Activity, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { DoctorStats } from '@/components/dashboard/DoctorStats';
import { AddPatientDialog, ScheduleAppointmentDialog } from '@/components/doctor/DoctorActions';
import { CreatePrescriptionDialog } from '@/components/doctor/CreatePrescriptionDialog';
import { RequireDoctor } from '@/components/auth/RequireRole';
import { useState, useEffect } from 'react';
import { appointmentsApi, auditApi } from '@/lib/api-client';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoadingAppointments(true);
      setLoadingActivity(true);

      try {
        // Load appointments
        const result: any = await appointmentsApi.getAll();
        const appts = Array.isArray(result) ? result : (result?.data || result?.appointments || []);

        // Filter for FUTURE appointments only
        const now = new Date();
        const upcoming = appts.filter((apt: any) => {
          const aptDate = new Date(apt.scheduledAt || apt.appointmentDate);
          return aptDate > now; // Only future appointments
        }).sort((a: any, b: any) => {
          // Sort by date ascending (nearest first)
          const dateA = new Date(a.scheduledAt || a.appointmentDate);
          const dateB = new Date(b.scheduledAt || b.appointmentDate);
          return dateA.getTime() - dateB.getTime();
        });

        if (mounted) {
          setUpcomingAppointments(upcoming.slice(0, 5)); // Show next 5 appointments
        }
      } catch (error) {
        console.error('Failed to load upcoming appointments:', error);
        if (mounted) {
          setUpcomingAppointments([]);
        }
      } finally {
        if (mounted) {
          setLoadingAppointments(false);
        }
      }

      try {
        // Load recent activity from audit logs
        const activity = await auditApi.getRecentActivity(5);
        if (mounted) {
          setRecentActivity(activity);
        }
      } catch (error) {
        console.error('Failed to load recent activity:', error);
        if (mounted) {
          setRecentActivity([]);
        }
      } finally {
        if (mounted) {
          setLoadingActivity(false);
        }
      }
    };

    loadData();
    return () => { mounted = false; };
  }, []);

  return (
    <RequireDoctor>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, Dr. {user?.name || 'Doctor'}!
            </h1>
            <p className="text-muted-foreground mt-2">
              Here&apos;s your overview for today
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <AddPatientDialog />
            <CreatePrescriptionDialog />
            <ScheduleAppointmentDialog />
          </div>
        </div>

        {/* Stats Cards - Now using DoctorStats component */}
        <DoctorStats />

        {/* Main Content Areas */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Upcoming Appointments - Now with real data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Appointments
              </CardTitle>
              <CardDescription>Your next scheduled appointments</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAppointments ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Loading appointments...</p>
                </div>
              ) : upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((apt) => (
                    <div key={apt.appointmentId || apt.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{apt.patient?.name || apt.patientName || 'Patient'}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(apt.scheduledAt || apt.appointmentDate).toLocaleString()} - {apt.title || apt.type || 'Visit'}
                        </p>
                      </div>
                      <Link href={`/dashboard/appointments/${apt.appointmentId || apt.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No upcoming appointments scheduled</p>
                </div>
              )}
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
              {loadingActivity ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 animate-pulse">
                      <div className="mt-1 h-2 w-2 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => {
                    const colorMap: Record<string, string> = {
                      appointment: 'bg-blue-500',
                      prescription: 'bg-green-500',
                      record: 'bg-purple-500',
                      consent: 'bg-orange-500',
                    };
                    const color = colorMap[activity.type] || 'bg-gray-500';

                    return (
                      <div key={activity.id} className="flex gap-3">
                        <div className={`mt-1 h-2 w-2 rounded-full ${color}`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.user} - {activity.timestamp}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              )}
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
    </RequireDoctor>
  );
}
