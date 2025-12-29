'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CheckCircle,
    XCircle,
    AlertTriangle,
    Pill,
    User,
    Calendar,
    FileText,
    Shield,
    Printer
} from 'lucide-react';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { motion } from 'framer-motion';

interface PrescriptionData {
    prescriptionId: string;
    medication: string;
    dosage: string;
    instructions: string;
    status: string;
    expiryDate: string | null;
    isExpired: boolean;
    createdAt: string;
    doctor: {
        name: string;
        specialization?: string;
        licenseNumber?: string;
    };
    patient: {
        name: string;
    };
    verifiedAt: string;
}

export default function VerifyPrescriptionPage() {
    const params = useParams();
    const prescriptionId = params?.prescriptionId as string;

    const [prescription, setPrescription] = useState<PrescriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPrescription = async () => {
            try {
                setLoading(true);
                setError(null);

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                const response = await fetch(`${apiUrl}/api/public/verify/prescription/${prescriptionId}`);

                if (!response.ok) {
                    throw new Error('Prescription not found');
                }

                const data = await response.json();
                setPrescription(data.data);
            } catch (err) {
                console.error('Verification failed:', err);
                setError(err instanceof Error ? err.message : 'Failed to verify prescription');
            } finally {
                setLoading(false);
            }
        };

        if (prescriptionId) {
            fetchPrescription();
        }
    }, [prescriptionId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardContent className="py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Verifying prescription...</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !prescription) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl border-red-200">
                    <CardContent className="py-12">
                        <div className="text-center">
                            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
                            <p className="text-muted-foreground mb-4">
                                {error || 'Unable to verify this prescription'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Please ensure the QR code is valid or contact the prescribing doctor
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getStatusColor = () => {
        if (prescription.isExpired) return 'destructive';
        if (prescription.status === 'ACTIVE') return 'default';
        if (prescription.status === 'COMPLETED') return 'secondary';
        return 'outline';
    };

    const getStatusIcon = () => {
        if (prescription.isExpired) return <XCircle className="h-5 w-5" />;
        if (prescription.status === 'ACTIVE') return <CheckCircle className="h-5 w-5" />;
        return <AlertTriangle className="h-5 w-5" />;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4 py-8 overflow-hidden">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header with 3D animation */}
                <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: -50, rotateX: -15 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 0.8, type: "spring" }}
                >
                    <motion.div
                        className="flex items-center justify-center gap-2 mb-2"
                        whileHover={{ scale: 1.05, rotateY: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <Shield className="h-8 w-8 text-blue-600" />
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Prescription Verification
                        </h1>
                    </motion.div>
                    <motion.p
                        className="text-muted-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Verified healthcare prescription details
                    </motion.p>
                </motion.div>

                {/* Verification Status Banner with 3D effect */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotateX: -20 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    whileHover={{ scale: 1.02, rotateX: 2, rotateY: 2 }}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    <Card className={`border-2 shadow-2xl ${prescription.isExpired ? 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50' : 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50'}`}>
                        <CardContent className="py-6">
                            <motion.div
                                className="flex items-center justify-center gap-3"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                            >
                                {prescription.isExpired ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: [0, -10, 10, -10, 0] }}
                                            transition={{ duration: 0.5, delay: 0.6 }}
                                        >
                                            <XCircle className="h-8 w-8 text-red-600" />
                                        </motion.div>
                                        <div className="text-center">
                                            <h3 className="text-xl font-bold text-red-900">Prescription Expired</h3>
                                            <p className="text-sm text-red-700">This prescription is no longer valid</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 0.5, delay: 0.6 }}
                                        >
                                            <CheckCircle className="h-8 w-8 text-green-600" />
                                        </motion.div>
                                        <div className="text-center">
                                            <h3 className="text-xl font-bold text-green-900">Verified Prescription</h3>
                                            <p className="text-sm text-green-700">This is a valid prescription</p>
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Prescription Details Card with 3D hover */}
                <motion.div
                    initial={{ opacity: 0, y: 50, rotateX: 20 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                    whileHover={{
                        scale: 1.02,
                        rotateX: -2,
                        rotateY: 2,
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                    }}
                    style={{ transformStyle: "preserve-3d" }}
                >
                    <Card className="shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Prescription Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Prescription ID */}
                            <motion.div
                                className="flex items-center justify-between pb-4 border-b"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.6 }}
                            >
                                <div>
                                    <p className="text-sm text-muted-foreground">Prescription ID</p>
                                    <p className="font-mono font-semibold">{prescription.prescriptionId}</p>
                                </div>
                                <Badge variant={getStatusColor()} className="gap-1">
                                    {getStatusIcon()}
                                    {prescription.status}
                                </Badge>
                            </motion.div>

                            {/* Medication with floating animation */}
                            <motion.div
                                className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg shadow-lg"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.7 }}
                                whileHover={{
                                    scale: 1.03,
                                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <motion.div
                                        animate={{
                                            y: [0, -5, 0],
                                            rotate: [0, 5, -5, 0]
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            repeatType: "reverse"
                                        }}
                                    >
                                        <Pill className="h-6 w-6 text-blue-600 mt-1" />
                                    </motion.div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg mb-2">Medication</h3>
                                        <motion.p
                                            className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.9 }}
                                        >
                                            {prescription.medication}
                                        </motion.p>
                                        <motion.div
                                            className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 1 }}
                                        >
                                            <div>
                                                <p className="text-sm text-muted-foreground">Dosage</p>
                                                <p className="font-semibold">{prescription.dosage}</p>
                                            </div>
                                            {prescription.expiryDate && (
                                                <div>
                                                    <p className="text-sm text-muted-foreground">Valid Until</p>
                                                    <p className="font-semibold">
                                                        {new Date(prescription.expiryDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Instructions */}
                            {prescription.instructions && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.1 }}
                                    whileHover={{ scale: 1.01 }}
                                >
                                    <h4 className="font-semibold mb-2">Instructions</h4>
                                    <p className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg whitespace-pre-wrap shadow-inner">
                                        {prescription.instructions}
                                    </p>
                                </motion.div>
                            )}

                            {/* Doctor Information with 3D card */}
                            <motion.div
                                className="bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg shadow-lg"
                                initial={{ opacity: 0, rotateY: -20 }}
                                animate={{ opacity: 1, rotateY: 0 }}
                                transition={{ delay: 1.2 }}
                                whileHover={{
                                    scale: 1.02,
                                    rotateY: 2,
                                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                                }}
                                style={{ transformStyle: "preserve-3d" }}
                            >
                                <div className="flex items-start gap-3">
                                    <motion.div
                                        animate={{ rotate: [0, 360] }}
                                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    >
                                        <User className="h-5 w-5 text-muted-foreground mt-1" />
                                    </motion.div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold mb-2">Prescribing Doctor</h4>
                                        <p className="text-lg font-bold">{prescription.doctor.name}</p>
                                        {prescription.doctor.specialization && (
                                            <p className="text-sm text-muted-foreground">
                                                {prescription.doctor.specialization}
                                            </p>
                                        )}
                                        {prescription.doctor.licenseNumber && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                License: {prescription.doctor.licenseNumber}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Dates with stagger animation */}
                            <motion.div
                                className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.3 }}
                            >
                                <motion.div
                                    className="flex items-center gap-2"
                                    whileHover={{ x: 5 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Issued On</p>
                                        <p className="text-sm font-semibold">
                                            {new Date(prescription.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </motion.div>
                                <motion.div
                                    className="flex items-center gap-2"
                                    whileHover={{ x: 5 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                >
                                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">Verified At</p>
                                        <p className="text-sm font-semibold">
                                            {new Date(prescription.verifiedAt).toLocaleString()}
                                        </p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* QR Code Section with 3D rotation */}
                <motion.div
                    className="print:hidden"
                    initial={{ opacity: 0, scale: 0.5, rotateZ: -180 }}
                    animate={{ opacity: 1, scale: 1, rotateZ: 0 }}
                    transition={{ duration: 0.8, delay: 1.4, type: "spring" }}
                    whileHover={{
                        scale: 1.05,
                        rotateZ: 5
                    }}
                >
                    <QRCodeDisplay
                        data={typeof window !== 'undefined' ? window.location.href : ''}
                        title="Prescription QR Code"
                        filename={`prescription-${prescription.prescriptionId}.png`}
                        size={200}
                    />
                </motion.div>

                {/* Print Button with pulse animation */}
                <motion.div
                    className="flex justify-center print:hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                >
                    <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Button onClick={handlePrint} size="lg" className="gap-2 shadow-lg">
                            <Printer className="h-4 w-4" />
                            Print Prescription
                        </Button>
                    </motion.div>
                </motion.div>

                {/* Footer Note with fade-in */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6 }}
                    whileHover={{ scale: 1.01 }}
                >
                    <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 shadow-lg">
                        <CardContent className="py-4">
                            <p className="text-sm text-center text-amber-900 dark:text-amber-100">
                                <strong>Note:</strong> This is a verified prescription from HealthLink.
                                For questions, please contact the prescribing doctor.
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
