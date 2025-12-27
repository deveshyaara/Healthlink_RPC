'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QRScannerProps {
    onScanSuccess: (prescriptionId: string, qrHash: string) => void;
    onScanError?: (error: string) => void;
    className?: string;
}

export function QRScanner({ onScanSuccess, onScanError, className }: QRScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const qrReaderDivId = 'qr-reader';

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (scannerRef.current && isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [isScanning]);

    const startScanning = async () => {
        try {
            setError(null);

            // Initialize scanner
            const scanner = new Html5Qrcode(qrReaderDivId);
            scannerRef.current = scanner;

            // Start scanning
            await scanner.start(
                { facingMode: 'environment' }, // Use back camera
                {
                    fps: 10, // Frames per second
                    qrbox: { width: 250, height: 250 }, // Scanning box size
                },
                (decodedText) => {
                    // Success callback
                    if (decodedText !== lastScanned) {
                        setLastScanned(decodedText);
                        handleScan(decodedText);
                    }
                },
                (errorMessage) => {
                    // Error callback (most are just "not found" - ignore)
                    // Only log actual errors
                    if (!errorMessage.includes('NotFoundException')) {
                        console.error('QR Scan error:', errorMessage);
                    }
                }
            );

            setIsScanning(true);
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to start camera';
            setError(errorMsg);
            onScanError?.(errorMsg);
            console.error('Scanner start error:', err);
        }
    };

    const stopScanning = async () => {
        try {
            if (scannerRef.current) {
                await scannerRef.current.stop();
                scannerRef.current = null;
            }
            setIsScanning(false);
            setError(null);
        } catch (err) {
            console.error('Scanner stop error:', err);
        }
    };

    const handleScan = (data: string) => {
        try {
            // Parse QR code data
            // Expected format: "RX-{prescriptionId}-{timestamp}-{hash}"
            const parts = data.split('-');

            if (parts[0] !== 'RX' || parts.length < 4) {
                throw new Error('Invalid prescription QR code format');
            }

            const prescriptionId = parts[1];
            const qrHash = parts.slice(2).join('-'); // Rest is the hash

            // Emit success event
            onScanSuccess(prescriptionId, qrHash);

        } catch (err: any) {
            const errorMsg = err.message || 'Invalid QR code';
            setError(errorMsg);
            onScanError?.(errorMsg);
        }
    };

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    QR Code Scanner
                </CardTitle>
                <CardDescription>
                    Scan the prescription QR code to verify and dispense
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Scanner Area */}
                <div className="relative">
                    <div
                        id={qrReaderDivId}
                        className={`w-full ${isScanning ? '' : 'hidden'}`}
                        style={{ minHeight: '300px' }}
                    />

                    {!isScanning && (
                        <div className="flex items-center justify-center bg-muted rounded-lg p-12 min-h-[300px]">
                            <div className="text-center">
                                <CameraOff className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground">
                                    Click "Start Scanner" to begin scanning
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error Alert */}
                {error && (
                    <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Last Scanned */}
                {lastScanned && !error && (
                    <Alert>
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>
                            Last scanned: {lastScanned.substring(0, 20)}...
                        </AlertDescription>
                    </Alert>
                )}

                {/* Control Buttons */}
                <div className="flex gap-2">
                    {!isScanning ? (
                        <Button onClick={startScanning} className="w-full">
                            <Camera className="mr-2 h-4 w-4" />
                            Start Scanner
                        </Button>
                    ) : (
                        <Button onClick={stopScanning} variant="destructive" className="w-full">
                            <CameraOff className="mr-2 h-4 w-4" />
                            Stop Scanner
                        </Button>
                    )}
                </div>

                {/* Instructions */}
                <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Position the QR code within the scanning box</p>
                    <p>• Ensure good lighting for best results</p>
                    <p>• Hold steady until automatic detection</p>
                </div>
            </CardContent>
        </Card>
    );
}
