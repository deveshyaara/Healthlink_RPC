'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, QrCode as QrCodeIcon } from 'lucide-react';

interface QRCodeDisplayProps {
    data: string;
    title?: string;
    filename?: string;
    size?: number;
}

/**
 * QRCodeDisplay Component
 * 
 * Generates and displays a QR code for the given data (prescription ID or appointment ID)
 * Patients can download the QR code for easy sharing with pharmacies/doctors
 */
export function QRCodeDisplay({
    data,
    title = 'QR Code',
    filename = 'qrcode.png',
    size = 256
}: QRCodeDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [generating, setGenerating] = useState(true);

    useEffect(() => {
        const generateQR = async () => {
            if (!canvasRef.current || !data) {
                setError('Unable to generate QR code');
                setGenerating(false);
                return;
            }

            try {
                setGenerating(true);
                setError(null);

                await QRCode.toCanvas(canvasRef.current, data, {
                    width: size,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    },
                    errorCorrectionLevel: 'H'
                });

                setGenerating(false);
            } catch (err) {
                console.error('QR Code generation failed:', err);
                setError('Failed to generate QR code');
                setGenerating(false);
            }
        };

        generateQR();
    }, [data, size]);

    const handleDownload = () => {
        if (!canvasRef.current) return;

        try {
            const url = canvasRef.current.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            link.click();
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <QrCodeIcon className="h-5 w-5" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center">
                    {generating && (
                        <div className="flex items-center justify-center" style={{ width: size, height: size }}>
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-8">
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    <canvas
                        ref={canvasRef}
                        className={`rounded-lg border-2 border-border ${generating || error ? 'hidden' : ''}`}
                    />
                </div>

                {!generating && !error && (
                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={handleDownload}
                            className="w-full"
                            variant="outline"
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download QR Code
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            Scan this QR code at pharmacies or show to doctors
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
