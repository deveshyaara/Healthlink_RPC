'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CheckCircle,
    XCircle,
    Calendar,
    Clock,
    User,
    FileText,
    Shield,
    MapPin,
    Printer
} from 'lucide-react';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { motion } from 'framer-motion';

interface AppointmentData {
    appointmentId: string;
    type: string;
    status: string;
    scheduledAt: string;
    notes?: string;
    doctor: {
        fullName: string;
        specialization?: string;
    };
    patient: {
        name: string;
    };
    hospital?: {
        name: string;
        address?: string;
    };
    verifiedAt: string;
}

export default function VerifyAppointmentPage() {
    const params = useParams();
    const appointmentId = params?.appointmentId as string;

    const [appointment, setAppointment] = useState<AppointmentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAppointment = async () => {
            try {
                setLoading(true);
                setError(null);

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                const response = await fetch(`${apiUrl}/api/public/verify/appointment/${appointmentId}`);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `Appointment not found (${response.status})`);
                }

                const data = await response.json();
                setAppointment(data.data);
            } catch (err) {
                console.error('Verification failed:', err);
                setError(err instanceof Error ? err.message : 'Failed to verify appointment');
            } finally {
                setLoading(false);
            }
        };

        if (appointmentId) {
            fetchAppointment();
        }
    }, [appointmentId]);

    const handlePrint = () => {
        window.print();
    };

    const getStatusColor = (status: string) => {
        switch (status.toUpperCase()) {
            case 'SCHEDULED':
                return 'default';
            case 'COMPLETED':
                return 'secondary';
            case 'CANCELLED':
                return 'destructive';
            default:
                return 'outline';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardContent className="py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Verifying appointment...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !appointment) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl border-red-200">
                    <CardContent className="py-12">
                        <div className="text-center">
                            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
                            <p className="text-muted-foreground mb-4">
                                {error || 'Unable to verify this appointment'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Please ensure the QR code is valid or contact the healthcare provider
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const appointmentDate = new Date(appointment.scheduledAt);
    const isPast = appointmentDate < new Date();

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Shield className="h-8 w-8 text-blue-600" />
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Appointment Verification
                        </h1>
                    </div>
                    <p className="text-muted-foreground">
                        Verified healthcare appointment details
                    </p>
                </motion.div>

                {/* Verification Status Banner */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
                        <CardContent className="py-6">
                            <div className="flex items-center justify-center gap-3">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-green-900">Verified Appointment</h3>
                                    <p className="text-sm text-green-700">This is a valid appointment</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Appointment Details Card */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                >
                    <Card className="shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Appointment Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Appointment ID */}
                            <div className="flex items-center justify-between pb-4 border-b">
                                <div>
                                    <p className="text-sm text-muted-foreground">Appointment ID</p>
                                    <p className="font-mono font-semibold">{appointment.appointmentId}</p>
                                </div>
                                <Badge variant={getStatusColor(appointment.status)} className="gap-1">
                                    {appointment.status}
                                </Badge>
                            </div>

                            {/* Date & Time */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg shadow-lg">
                                <div className="flex items-start gap-3">
                                    <Calendar className="h-6 w-6 text-blue-600 mt-1" />
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg mb-2">Appointment Schedule</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Date</p>
                                                <p className="font-semibold text-lg">
                                                    {appointmentDate.toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Time</p>
                                                <p className="font-semibold text-lg flex items-center gap-2">
                                                    <Clock className="h-4 w-4" />
                                                    {appointmentDate.toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-sm text-muted-foreground">Type</p>
                                            <p className="font-semibold">{appointment.type}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Doctor Information */}
                            <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg shadow-lg">
                                <div className="flex items-start gap-3">
                                    <User className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div className="flex-1">
                                        <h4 className="font-semibold mb-2">Doctor</h4>
                                        <p className="text-lg font-bold">{appointment.doctor.fullName}</p>
                                        {appointment.doctor.specialization && (
                                            <p className="text-sm text-muted-foreground">
                                                {appointment.doctor.specialization}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Patient Information */}
                            <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg shadow-lg">
                                <div className="flex items-start gap-3">
                                    <User className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div className="flex-1">
                                        <h4 className="font-semibold mb-2">Patient</h4>
                                        <p className="text-lg font-bold">{appointment.patient.name}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Hospital/Location */}
                            {appointment.hospital && (
                                <div className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg shadow-lg">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-5 w-5 text-muted-foreground mt-1" />
                                        <div className="flex-1">
                                            <h4 className="font-semibold mb-2">Location</h4>
                                            <p className="font-bold">{appointment.hospital.name}</p>
                                            {appointment.hospital.address && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {appointment.hospital.address}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {appointment.notes && (
                                <div>
                                    <h4 className="font-semibold mb-2">Notes</h4>
                                    <p className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg whitespace-pre-wrap">
                                        {appointment.notes}
                                    </p>
                                </div>
                            )}

                            {/* Verification Time */}
                            <div className="pt-4 border-t">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Verified At</p>
                                        <p className="text-sm font-semibold">
                                            {new Date(appointment.verifiedAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* QR Code Section */}
                <motion.div
                    className="print:hidden"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                >
                    <QRCodeDisplay
                        data={typeof window !== 'undefined' ? window.location.href : ''}
                        title="Appointment QR Code"
                        filename={`appointment-${appointment.appointmentId}.png`}
                        size={200}
                    />
                </motion.div>

                {/* Print Button */}
                <div className="flex justify-center print:hidden">
                    <Button onClick={handlePrint} size="lg" className="gap-2 shadow-lg">
                        <Printer className="h-4 w-4" />
                        Print Appointment
                    </Button>
                </div>

                {/* Footer Note */}
                <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200">
                    <CardContent className="py-4">
                        <p className="text-sm text-center text-amber-900 dark:text-amber-100">
                            <strong>Note:</strong> This is a verified appointment from HealthLink.
                            For questions, please contact the healthcare provider.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
