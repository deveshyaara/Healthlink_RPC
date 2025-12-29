'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pill, User, FileText, Calendar } from 'lucide-react';
import { prescriptionsApi } from '@/lib/api-client';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';

interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
}

interface Prescription {
    prescriptionId: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    medication?: string;
    medications: Medication[];
    instructions: string;
    status?: string;
    createdAt?: string;
}

export default function PrescriptionDetailPage() {
    const params = useParams();
    const router = useRouter();
    const prescriptionId = params?.prescriptionId as string;

    const [prescription, setPrescription] = useState<Prescription | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrescription = async () => {
            try {
                const data: any = await prescriptionsApi.getById(prescriptionId);

                // Handle various response formats
                let rx = null;
                if (data && typeof data === 'object') {
                    if (data.data) rx = data.data;
                    else if (data.prescription) rx = data.prescription;
                    else rx = data;
                }

                setPrescription(rx);
            } catch (err) {
                console.error('Failed to fetch prescription:', err);
                setError(err instanceof Error ? err.message : 'Failed to load prescription');
            } finally {
                setLoading(false);
            }
        };

        if (prescriptionId) {
            fetchPrescription();
        }
    }, [prescriptionId]);

    const getStatusVariant = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'default';
            case 'completed': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    const formatDate = (dateStr?: string): string => {
        if (!dateStr) return 'No date';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return 'Invalid date';
        }
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-government-blue mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading prescription details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !prescription) {
        return (
            <div className="space-y-8">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <Pill className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Prescription Not Found</h3>
                            <p className="text-muted-foreground">{error || 'Could not load prescription details'}</p>
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
                            Prescription Details
                        </h1>
                        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                            ID: {prescription.prescriptionId}
                        </p>
                    </div>
                </div>
                <Badge variant={getStatusVariant(prescription.status)}>
                    {prescription.status || 'Active'}
                </Badge>
            </div>

            {/* Main Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Prescription Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Patient */}
                        <div className="flex items-start gap-3">
                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Patient</p>
                                <p className="text-base font-semibold">{prescription.patientId}</p>
                            </div>
                        </div>

                        {/* Doctor */}
                        <div className="flex items-start gap-3">
                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Doctor</p>
                                <p className="text-base font-semibold">{prescription.doctorId}</p>
                            </div>
                        </div>

                        {/* Appointment */}
                        <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Appointment</p>
                                <p className="text-base font-semibold">{prescription.appointmentId}</p>
                            </div>
                        </div>

                        {/* Created Date */}
                        {prescription.createdAt && (
                            <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Created</p>
                                    <p className="text-base font-semibold">{formatDate(prescription.createdAt)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Medications Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Pill className="h-5 w-5" />
                        Medications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {Array.isArray(prescription.medications) && prescription.medications.length > 0 ? (
                        <div className="space-y-4">
                            {prescription.medications.map((med, index) => (
                                <div key={index} className="p-4 border rounded-lg">
                                    <h3 className="font-semibold text-lg mb-3">{med.name}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Dosage</p>
                                            <p className="font-medium">{med.dosage}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Frequency</p>
                                            <p className="font-medium">{med.frequency}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Duration</p>
                                            <p className="font-medium">{med.duration}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : prescription.medication ? (
                        <div className="p-4 border rounded-lg">
                            <Badge variant="outline" className="text-base">{prescription.medication}</Badge>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No medications listed</p>
                    )}
                </CardContent>
            </Card>

            {/* Instructions Card */}
            {prescription.instructions && (
                <Card>
                    <CardHeader>
                        <CardTitle>Instructions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-base whitespace-pre-wrap">{prescription.instructions}</p>
                    </CardContent>
                </Card>
            )}

            {/* QR Code Card */}
            <QRCodeDisplay
                data={prescription.prescriptionId}
                title="Prescription QR Code"
                filename={`prescription-${prescription.prescriptionId}.png`}
            />
        </div>
    );
}
