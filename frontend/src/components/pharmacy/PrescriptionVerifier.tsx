'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, User, Pill, FileText, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { pharmacyAPI } from '@/lib/api/phase1';
import { toast } from 'sonner';

interface Prescription {
    id: string;
    medication: string;
    dosage: string;
    instructions: string;
    patient: {
        name: string;
        email: string;
    };
    doctor: {
        fullName: string;
    };
    expiryDate: string;
}

interface PrescriptionVerifierProps {
    pharmacyId: string;
    onDispenseComplete?: () => void;
}

export function PrescriptionVerifier({ pharmacyId, onDispenseComplete }: PrescriptionVerifierProps) {
    const [prescriptionId, setPrescriptionId] = useState('');
    const [prescription, setPrescription] = useState<Prescription | null>(null);
    const [loading, setLoading] = useState(false);
    const [verified, setVerified] = useState(false);
    const [dispensing, setDispensing] = useState(false);

    const handleVerify = async () => {
        if (!prescriptionId.trim()) {
            toast.error('Please enter a prescription ID');
            return;
        }

        setLoading(true);
        try {
            const response = await pharmacyAPI.verifyPrescription(pharmacyId, {
                prescriptionId: prescriptionId.trim(),
            }) as any;

            if (response.verified) {
                setPrescription(response.data.prescription);
                setVerified(true);
                toast.success('Prescription verified successfully');
            } else {
                toast.error(response.message || 'Prescription verification failed');
                setVerified(false);
                setPrescription(null);
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to verify prescription');
            setVerified(false);
            setPrescription(null);
        } finally {
            setLoading(false);
        }
    };

    const handleDispense = async () => {
        if (!prescriptionId) return;

        setDispensing(true);
        try {
            await pharmacyAPI.dispensePrescription(pharmacyId, {
                prescriptionId,
            });

            toast.success('Prescription dispensed successfully');

            // Reset form
            setPrescription(null);
            setVerified(false);
            setPrescriptionId('');

            onDispenseComplete?.();
        } catch (error: any) {
            toast.error(error.message || 'Failed to dispense prescription');
        } finally {
            setDispensing(false);
        }
    };

    const handleReset = () => {
        setPrescription(null);
        setVerified(false);
        setPrescriptionId('');
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Prescription Verification</CardTitle>
                <CardDescription>
                    Enter prescription ID or use QR scanner to verify
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Manual Entry */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Enter Prescription ID (e.g., RX-12345)"
                        value={prescriptionId}
                        onChange={(e) => setPrescriptionId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                        disabled={verified}
                        className="flex-1 px-3 py-2 border rounded-md"
                    />
                    {!verified ? (
                        <Button onClick={handleVerify} disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify'}
                        </Button>
                    ) : (
                        <Button onClick={handleReset} variant="outline">
                            Reset
                        </Button>
                    )}
                </div>

                {/* Verification Result */}
                {verified && prescription && (
                    <div className="space-y-4">
                        <Alert>
                            <CheckCircle2 className="h-4 w-4" />
                            <AlertTitle>Prescription Verified</AlertTitle>
                            <AlertDescription>
                                This prescription is valid and can be dispensed
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                            {/* Patient Info */}
                            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Patient</p>
                                    <p className="text-sm text-muted-foreground">{prescription.patient.name}</p>
                                    <p className="text-xs text-muted-foreground">{prescription.patient.email}</p>
                                </div>
                            </div>

                            {/* Doctor Info */}
                            <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                                <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Prescribed by</p>
                                    <p className="text-sm text-muted-foreground">{prescription.doctor.fullName}</p>
                                </div>
                            </div>

                            <Separator />

                            {/* Medication Details */}
                            <div className="space-y-2">
                                <div className="flex items-start gap-3">
                                    <Pill className="h-5 w-5 mt-0.5 text-primary" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Medication</p>
                                        <p className="text-lg font-semibold">{prescription.medication}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 pl-8">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Dosage</p>
                                        <p className="text-sm text-muted-foreground">{prescription.dosage}</p>
                                    </div>
                                </div>

                                {prescription.instructions && (
                                    <div className="flex items-start gap-3">
                                        <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">Instructions</p>
                                            <p className="text-sm text-muted-foreground">{prescription.instructions}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3">
                                    <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Valid Until</p>
                                        <p className="text-sm text-muted-foreground">
                                            {new Date(prescription.expiryDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {!verified && prescriptionId && !loading && prescription === null && (
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertTitle>Verification Failed</AlertTitle>
                        <AlertDescription>
                            This prescription could not be verified. Please check the ID and try again.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>

            {verified && prescription && (
                <CardFooter>
                    <Button
                        onClick={handleDispense}
                        disabled={dispensing}
                        className="w-full"
                        size="lg"
                    >
                        {dispensing ? 'Dispensing...' : 'Dispense Prescription'}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
