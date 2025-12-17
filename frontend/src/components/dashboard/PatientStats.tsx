'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, Pill, Shield, Loader2 } from 'lucide-react';
import { medicalRecordsApi, appointmentsApi, prescriptionsApi, consentsApi } from '@/lib/api-client';

/**
 * PatientStats Component
 *
 * Displays dashboard statistics for PATIENT role only
 * Fetches data specific to the current patient user
 */
export function PatientStats() {
  const [stats, setStats] = useState({
    records: 0,
    appointments: 0,
    prescriptions: 0,
    consents: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientStats = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all patient data in parallel with Promise.allSettled
        // This ensures one failure doesn't block the others
        const [recordsResult, appointmentsResult, prescriptionsResult, consentsResult] =
          await Promise.allSettled([
            medicalRecordsApi.getAll(),
            appointmentsApi.getAll(),
            prescriptionsApi.getAll(),
            consentsApi.getAll(),
          ]);

        // Extract successful results, default to empty array for failures
        const records = recordsResult.status === 'fulfilled' ? recordsResult.value : [];
        const appointments = appointmentsResult.status === 'fulfilled' ? appointmentsResult.value : [];
        const prescriptions = prescriptionsResult.status === 'fulfilled' ? prescriptionsResult.value : [];
        const consents = consentsResult.status === 'fulfilled' ? consentsResult.value : [];

        // Log any failures for debugging
        const results = [
          { name: 'records', result: recordsResult },
          { name: 'appointments', result: appointmentsResult },
          { name: 'prescriptions', result: prescriptionsResult },
          { name: 'consents', result: consentsResult },
        ];

        // Update stats
        setStats({
          records: records.length,
          appointments: appointments.length,
          prescriptions: prescriptions.length,
          consents: consents.length,
        });

        // Only show error if ALL requests failed
        const allFailed = results.every(({ result }) => result.status === 'rejected');
        if (allFailed) {
          setError('Unable to load dashboard data. Please try again.');
        }

      } catch (err) {
        console.error('[PatientStats] Unexpected error:', err);
        setError('An unexpected error occurred while loading data.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientStats();
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
      {/* Medical Records Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Medical Records</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.records}</div>
          <p className="text-xs text-muted-foreground">
            Total records in your account
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
            Scheduled and past appointments
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
            Active and past prescriptions
          </p>
        </CardContent>
      </Card>

      {/* Consents Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Data Sharing</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.consents}</div>
          <p className="text-xs text-muted-foreground">
            Active consent agreements
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
