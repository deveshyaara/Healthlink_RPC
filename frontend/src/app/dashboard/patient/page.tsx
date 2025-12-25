'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Heart, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { PatientStats } from '@/components/dashboard/PatientStats';
import { PatientProfile } from '@/components/PatientProfile';
import { useState, useEffect } from 'react';
import { appointmentsApi, medicalRecordsApi } from '@/lib/api-client';

export default function PatientDashboard() {
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setAppointmentsLoading(true);
      setRecordsLoading(true);
      try {
        const [apptsRes, recsRes] = await Promise.allSettled([
          appointmentsApi.getAll(),
          medicalRecordsApi.getAll(),
        ]);

        // Helper to extract array from response
        const extractArray = (res: any) => {
          if (res.status !== 'fulfilled') return [];
          const val = res.value;
          if (Array.isArray(val)) return val;
          if (val && typeof val === 'object') {
            if (Array.isArray(val.data)) return val.data;
            if (Array.isArray(val.appointments)) return val.appointments;
            if (Array.isArray(val.records)) return val.records;
            if (Array.isArray(val.result)) return val.result;
          }
          return [];
        };

        const appts = extractArray(apptsRes);
        const recs = extractArray(recsRes);

        if (!mounted) return;
        setAppointments(appts);
        setRecentRecords(recs.slice(0, 5));
      } catch (err) {
        console.error('Failed to load patient dashboard data:', err);
        if (mounted) {
          setAppointments([]);
          setRecentRecords([]);
        }
      } finally {
        if (mounted) {
          setAppointmentsLoading(false);
          setRecordsLoading(false);
        }
      }
    };

    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || 'Patient'}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here&apos;s an overview of your health information
          </p>
        </div>
      </div>

      {/* Stats Cards - Now using PatientStats component */}
      <PatientStats />

      {/* Patient Profile */}
      <PatientProfile />

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
            {appointmentsLoading ? (
              <div className="text-center py-6">Loading appointments...</div>
            ) : Array.isArray(appointments) && appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.slice(0, 3).map((a) => (
                  <div key={a.appointmentId || `${a.patientId}-${a.appointmentDate}`} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{a.doctorName || a.doctorId || 'Doctor'}</p>
                      <p className="text-sm text-muted-foreground">{new Date(a.appointmentDate).toLocaleString()} - {a.type || 'Visit'}</p>
                    </div>
                    <Button variant="outline" size="sm">Details</Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No upcoming appointments found.</p>
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
            <CardDescription>Your latest health updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Recent records summary (safe rendering) */}
              {recordsLoading ? (
                <div className="text-center py-4">Loading recent activity...</div>
              ) : Array.isArray(recentRecords) && recentRecords.length > 0 ? (
                recentRecords.map((r) => (
                  <div key={r.recordId || r.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{r.description || r.fileName || 'New record uploaded'}</p>
                      <p className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recently'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                </div>
              )}
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
