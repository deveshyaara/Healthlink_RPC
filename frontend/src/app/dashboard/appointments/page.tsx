'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { appointmentsApi } from '@/lib/api-client';
import { Calendar, Clock, User, PlusCircle } from 'lucide-react';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ScheduleAppointmentDialog } from '@/components/doctor/DoctorActions';

interface Appointment {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  type: string;
  notes?: string;
  prescriptionIds?: string[];
  labTestIds?: string[];
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setError(null);
        const data = await appointmentsApi.getAll();
        setAppointments(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch appointments:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load appointments';
        setError(errorMessage);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-government-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-government-navy dark:text-white">Appointments</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                        Manage patient appointments and schedules
          </p>
        </div>
        <Button
          className="bg-government-blue hover:bg-government-blue/90"
          onClick={() => setShowScheduleDialog(true)}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Schedule Appointment
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          title="Failed to Load Appointments"
          message={error}
          onRetry={() => window.location.reload()}
        />
      )}

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {!error && appointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No appointments found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Doctor ID</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow key={appointment.appointmentId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {appointment.patientId}
                      </div>
                    </TableCell>
                    <TableCell>{appointment.doctorId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(appointment.appointmentDate).toLocaleDateString()}
                        <Clock className="h-4 w-4 ml-2" />
                        {appointment.appointmentTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{appointment.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(appointment.status)}>
                        {appointment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                                                View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Schedule Appointment Dialog */}
      {showScheduleDialog && (
        <ScheduleAppointmentDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          onSuccess={() => {
            setShowScheduleDialog(false);
            // Refresh appointments list
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
