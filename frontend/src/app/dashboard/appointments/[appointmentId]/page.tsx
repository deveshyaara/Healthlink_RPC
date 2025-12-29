'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, User, FileText, MapPin } from 'lucide-react';
import { appointmentsApi } from '@/lib/api-client';
import type { AppointmentStatus } from '@/types';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';

interface Appointment {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    appointmentDate?: string;
    scheduledAt?: string;
    appointmentTime?: string;
    status: AppointmentStatus;
    type: string;
    notes?: string;
    prescriptionIds?: string[];
    labTestIds?: string[];
}

export default function AppointmentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const appointmentId = params?.appointmentId as string;

    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAppointment = async () => {
            try {
                const data: any = await appointmentsApi.getById(appointmentId);

                // Handle various response formats
                let appt = null;
                if (data && typeof data === 'object') {
                    if (data.data) appt = data.data;
                    else if (data.appointment) appt = data.appointment;
                    else appt = data;
                }

                setAppointment(appt);
            } catch (err) {
                console.error('Failed to fetch appointment:', err);
                setError(err instanceof Error ? err.message : 'Failed to load appointment');
            } finally {
                setLoading(false);
            }
        };

        if (appointmentId) {
            fetchAppointment();
        }
    }, [appointmentId]);

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

    const formatDate = (dateStr?: string): string => {
        if (!dateStr) return 'No date set';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            });
        } catch {
            return 'Invalid date';
        }
    };

    const formatTime = (appt: Appointment): string => {
        if (appt.appointmentTime) return appt.appointmentTime;
        if (appt.scheduledAt) {
            try {
                const date = new Date(appt.scheduledAt);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    });
                }
            } catch { }
        }
        return 'No time set';
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-government-blue mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading appointment details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !appointment) {
        return (
            <div className="space-y-8">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Appointment Not Found</h3>
                            <p className="text-muted-foreground">{error || 'Could not load appointment details'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-government-navy dark:text-white">
                            Appointment Details
                        </h1>
                        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                            ID: {appointment.appointmentId}
                        </p>
                    </div>
                </div>
                <Badge variant={getStatusVariant(appointment.status)}>
                    {String(appointment.status).replace(/_/g, ' ').toLowerCase().replace(/(^|\s)\S/g, t => t.toUpperCase())}
                </Badge>
            </div>

            {/* Main Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Appointment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Date */}
                        <div className="flex items-start gap-3">
                            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Date</p>
                                <p className="text-base font-semibold">
                                    {formatDate(appointment.scheduledAt || appointment.appointmentDate)}
                                </p>
                            </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Time</p>
                                <p className="text-base font-semibold">{formatTime(appointment)}</p>
                            </div>
                        </div>

                        {/* Patient */}
                        <div className="flex items-start gap-3">
                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Patient</p>
                                <p className="text-base font-semibold">{appointment.patientId}</p>
                            </div>
                        </div>

                        {/* Doctor */}
                        <div className="flex items-start gap-3">
                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Doctor</p>
                                <p className="text-base font-semibold">{appointment.doctorId}</p>
                            </div>
                        </div>

                        {/* Type */}
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Type</p>
                                <Badge variant="outline">{appointment.type}</Badge>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {appointment.notes && (
                        <div className="pt-4 border-t">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Notes</p>
                            <p className="text-base">{appointment.notes}</p>
                        </div>
                    )}

                    {/* Related Records */}
                    {(appointment.prescriptionIds?.length || appointment.labTestIds?.length) && (
                        <div className="pt-4 border-t space-y-4">
                            {appointment.prescriptionIds && appointment.prescriptionIds.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Prescriptions</p>
                                    <div className="flex flex-wrap gap-2">
                                        {appointment.prescriptionIds.map((id) => (
                                            <Badge key={id} variant="outline">{id}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {appointment.labTestIds && appointment.labTestIds.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">Lab Tests</p>
                                    <div className="flex flex-wrap gap-2">
                                        {appointment.labTestIds.map((id) => (
                                            <Badge key={id} variant="outline">{id}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* QR Code Card */}
            <QRCodeDisplay
                data={appointment.appointmentId}
                title="Appointment QR Code"
                filename={`appointment-${appointment.appointmentId}.png`}
            />
        </div>
    );
}
