'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Pill, Activity, Loader2 } from 'lucide-react';
import { appointmentsApi, prescriptionsApi } from '@/lib/api-client';

/**
 * DoctorStats Component
 *
 * Displays dashboard statistics for DOCTOR role only
 * Fetches data specific to the current doctor user
 */
export function DoctorStats() {
  const [stats, setStats] = useState({
    patients: 0,
    appointments: 0,
    prescriptions: 0,
    consultations: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctorStats = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch doctor-specific data in parallel with Promise.allSettled
        const [appointmentsResult, prescriptionsResult] =
          await Promise.allSettled([
            appointmentsApi.getAll(),  // Backend filters by doctorId automatically
            prescriptionsApi.getAll(), // Backend filters by doctorId automatically
          ]);

        // Extract successful results, default to empty array for failures
        const appointments = appointmentsResult.status === 'fulfilled' ? appointmentsResult.value : [];
        const prescriptions = prescriptionsResult.status === 'fulfilled' ? prescriptionsResult.value : [];

        // Calculate stats from fetched data
        // Extract unique patient IDs from appointments and prescriptions
        const patientIds = new Set<string>();
        appointments.forEach((apt: { patientId?: string }) => {
          if (apt.patientId) {patientIds.add(apt.patientId);}
        });
        prescriptions.forEach((rx: { patientId?: string }) => {
          if (rx.patientId) {patientIds.add(rx.patientId);}
        });

        // Count consultations (completed appointments)
        const completedAppointments = appointments.filter(
          (apt: { status?: string }) => apt.status === 'Completed'
        );

        // Update stats
        setStats({
          patients: patientIds.size,
          appointments: appointments.length,
          prescriptions: prescriptions.length,
          consultations: completedAppointments.length,
        });

        // Only show error if ALL requests failed
        const allFailed = [appointmentsResult, prescriptionsResult].every(
          result => result.status === 'rejected'
        );
        if (allFailed) {
          setError('Unable to load dashboard data. Please try again.');
        }

      } catch (err) {
        console.error('[DoctorStats] Unexpected error:', err);
        setError('An unexpected error occurred while loading data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading your dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Patients Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Patients</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.patients}</div>
          <p className="text-xs text-muted-foreground">
            Total patients under care
          </p>
        </CardContent>
      </Card>

      {/* Appointments Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Appointments</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.appointments}</div>
          <p className="text-xs text-muted-foreground">
            Scheduled appointments
          </p>
        </CardContent>
      </Card>

      {/* Prescriptions Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
          <Pill className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.prescriptions}</div>
          <p className="text-xs text-muted-foreground">
            Total prescriptions issued
          </p>
        </CardContent>
      </Card>

      {/* Consultations Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Consultations</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.consultations}</div>
          <p className="text-xs text-muted-foreground">
            Completed consultations
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
