'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { appointmentsApi } from '@/lib/api-client';
import { Calendar, Clock, User, PlusCircle, LayoutList, CalendarDays } from 'lucide-react';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ScheduleAppointmentDialog } from '@/components/doctor/DoctorActions';
import { useRouter } from 'next/navigation';
import type { AppointmentStatus } from '@/types';
import { AppointmentCalendar } from '@/components/calendar/appointment-calendar';
import { useAuth } from '@/contexts/auth-context';

interface Appointment {
  appointmentId: string;
  patientId: string;
  doctorId: string;
  appointmentDate?: string; // Old field
  scheduledAt?: string; // New field from backend
  appointmentTime?: string;
  status: AppointmentStatus;
  type: string;
  notes?: string;
  prescriptionIds?: string[];
  labTestIds?: string[];
  // Backend includes these via Prisma relations
  patient?: {
    name: string;
    email?: string;
  };
  doctor?: {
    fullName: string;
    email?: string;
  };
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const router = useRouter();

  const isDoctor = user?.role?.toLowerCase() === 'doctor';

  const fetchAppointments = async () => {
    try {
      setError(null);
      const data: any = await appointmentsApi.getAll();

      // Handle various response formats
      let appts: Appointment[] = [];
      if (Array.isArray(data)) {
        appts = data;
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data.data)) appts = data.data;
        else if (Array.isArray(data.appointments)) appts = data.appointments;
        else if (Array.isArray(data.result)) appts = data.result;
      }

      setAppointments(appts);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load appointments';
      setError(errorMessage);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const getStatusVariant = (status: AppointmentStatus | string) => {
    const s = String(status).toUpperCase();
    switch (s) {
      case 'SCHEDULED': return 'default';
      case 'COMPLETED': return 'secondary';
      case 'CANCELLED': return 'destructive';
      case 'NO_SHOW': return 'outline';
      default: return 'outline';
    }
  };

  // Helper function to safely format date
  const formatAppointmentDate = (appointment: Appointment): string => {
    try {
      // Try scheduledAt first (new field), then appointmentDate (old field)
      const dateStr = appointment.scheduledAt || appointment.appointmentDate;

      if (!dateStr) return 'No date set';

      const date = new Date(dateStr);

      // Check if date is valid
      if (isNaN(date.getTime())) return 'Invalid date';

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  // Helper function to extract time from scheduledAt or use appointmentTime
  const formatAppointmentTime = (appointment: Appointment): string => {
    try {
      if (appointment.appointmentTime) {
        return appointment.appointmentTime;
      }

      // Extract time from scheduledAt field
      if (appointment.scheduledAt) {
        const date = new Date(appointment.scheduledAt);
        if (!isNaN(date.getTime())) {
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        }
      }

      return 'No time set';
    } catch (error) {
      console.error('Time formatting error:', error);
      return 'No time';
    }
  };

  // Handle View Details click
  const handleViewDetails = (appointment: Appointment) => {
    router.push(`/dashboard/appointments/${appointment.appointmentId}`);
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
            {isDoctor ? 'Manage patient appointments and schedules' : 'View your appointments'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle - Only show for doctors */}
          {isDoctor && (
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="gap-2"
              >
                <CalendarDays className="h-4 w-4" />
                Calendar
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-2"
              >
                <LayoutList className="h-4 w-4" />
                List
              </Button>
            </div>
          )}
          {/* Schedule Appointment - Only show for doctors */}
          {isDoctor && (
            <Button
              className="bg-government-blue hover:bg-government-blue/90"
              onClick={() => setShowScheduleDialog(true)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Schedule Appointment
            </Button>
          )}
        </div>
      </div>

      {/* Calendar or Table View */}
      {isDoctor && viewMode === 'calendar' ? (
        <AppointmentCalendar
          appointments={appointments.map(apt => ({
            ...apt,
            appointmentDate: apt.scheduledAt || apt.appointmentDate || new Date().toISOString(),
            type: apt.type || 'General',
          }))}
          onAppointmentClick={(apt) => handleViewDetails({
            ...apt,
            type: apt.type || 'General',
            status: apt.status as AppointmentStatus
          })}
        />
      ) : (
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
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Doctor Name</TableHead>
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
                          {appointment.patient?.name || appointment.patientId}
                        </div>
                      </TableCell>
                      <TableCell>{appointment.doctor?.fullName || appointment.doctorId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {formatAppointmentDate(appointment)}
                          <Clock className="h-4 w-4 ml-2" />
                          {formatAppointmentTime(appointment)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{appointment.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(appointment.status)}>
                          {String(appointment.status).replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, t => t.toUpperCase())}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(appointment)}
                        >
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
      )}

      {/* Schedule Appointment Dialog - Only for doctors */}
      {isDoctor && showScheduleDialog && (
        <ScheduleAppointmentDialog
          open={showScheduleDialog}
          onOpenChange={setShowScheduleDialog}
          onSuccess={() => {
            setShowScheduleDialog(false);
            // Refresh appointments list properly
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
}

