'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, CheckCircle, AlertCircle, Shield, ExternalLink } from 'lucide-react';

interface PrescriptionData {
    id: string;
    patientName: string;
    medication: string;
    dosage: string;
    doctorName: string;
    date: string;
    blockchainHash?: string;
    verified: boolean;
}

interface EnhancedQRDisplayProps {
    prescription: PrescriptionData;
}

export function EnhancedQRDisplay({ prescription }: EnhancedQRDisplayProps) {
    const [showDetails, setShowDetails] = useState(false);

    // Create QR data payload with blockchain proof
    const qrData = JSON.stringify({
        type: 'PRESCRIPTION',
        id: prescription.id,
        hash: prescription.blockchainHash,
        timestamp: new Date().toISOString(),
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Prescription QR Code
                    {prescription.verified && (
                        <Badge className="ml-auto bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <Shield className="h-3 w-3 mr-1" />
                            Blockchain Verified
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    Scan this code at any pharmacy for instant verification
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center gap-6">
                    {/* QR Code Placeholder */}
                    <div className="bg-white p-6 rounded-lg border-4 border-blue-600 flex items-center justify-center">
                        <div className="text-center">
                            <QrCode className="h-32 w-32 mx-auto text-blue-600 mb-2" />
                            <p className="text-xs text-gray-600">QR Code: {prescription.id}</p>
                            <p className="text-xs text-gray-500 font-mono mt-1">{qrData.substring(0, 30)}...</p>
                        </div>
                    </div>

                    {/* Verification Status */}
                    <div className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                    Anti-Counterfeit Protection Active
                                </p>
                                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                    This prescription is secured on Ethereum blockchain and cannot be duplicated
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Blockchain Proof */}
                    {prescription.blockchainHash && (
                        <div className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">Blockchain Transaction:</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(`https://etherscan.io/tx/${prescription.blockchainHash}`, '_blank')}
                                >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Verify
                                </Button>
                            </div>
                            <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                                {prescription.blockchainHash}
                            </p>
                        </div>
                    )}

                    {/* Toggle Details */}
                    <Button
                        variant="outline"
                        onClick={() => setShowDetails(!showDetails)}
                        className="w-full"
                    >
                        {showDetails ? 'Hide' : 'Show'} Prescription Details
                    </Button>

                    {/* Details */}
                    {showDetails && (
                        <div className="w-full space-y-3 p-4 border rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Patient:</span>
                                    <p className="font-medium">{prescription.patientName}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Doctor:</span>
                                    <p className="font-medium">{prescription.doctorName}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Medication:</span>
                                    <p className="font-medium">{prescription.medication}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Dosage:</span>
                                    <p className="font-medium">{prescription.dosage}</p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-500 dark:text-gray-400">Issue Date:</span>
                                    <p className="font-medium">{new Date(prescription.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Features */}
                    <div className="w-full border-t pt-4">
                        <h4 className="text-sm font-medium mb-3">Security Features:</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Blockchain Verified</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Tamper-Proof</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Instant Verification</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Time-Stamped</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Enhanced verification result component
interface VerificationResultProps {
    isValid: boolean;
    prescription?: PrescriptionData;
    error?: string;
}

export function VerificationResult({ isValid, prescription, error }: VerificationResultProps) {
    if (!isValid) {
        return (
            <Card className="border-red-200 dark:border-red-800">
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        <AlertCircle className="h-16 w-16 text-red-600" />
                        <div>
                            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                                Invalid or Counterfeit Prescription
                            </h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                                {error || 'This prescription could not be verified on the blockchain'}
                            </p>
                        </div>
                        <Button variant="destructive">Report Counterfeit</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!prescription) return null;

    return (
        <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center gap-4">
                    <CheckCircle className="h-16 w-16 text-green-600" />
                    <div>
                        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                            Prescription Verified Successfully!
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                            This prescription is authentic and recorded on Ethereum blockchain
                        </p>
                    </div>

                    <div className="w-full mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-left">
                        <h4 className="font-medium mb-3">Prescription Details:</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">ID:</span>
                                <span className="font-medium">{prescription.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Patient:</span>
                                <span className="font-medium">{prescription.patientName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Medication:</span>
                                <span className="font-medium">{prescription.medication}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Dosage:</span>
                                <span className="font-medium">{prescription.dosage}</span>
                            </div>
                        </div>
                    </div>

                    <Button className="w-full">Dispense Medication</Button>
                </div>
            </CardContent>
        </Card>
    );
}
