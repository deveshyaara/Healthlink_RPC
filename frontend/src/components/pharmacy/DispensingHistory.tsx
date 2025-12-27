'use client';

import { useState, useEffect } from 'react';
import { History, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { pharmacyAPI } from '@/lib/api/phase1';
import { toast } from 'sonner';

interface DispensingRecord {
    id: string;
    prescriptionId: string;
    patientName: string;
    medication: string;
    quantity: number;
    dispensedAt: string;
    dispensedBy: string;
}

interface DispensingHistoryProps {
    pharmacyId: string;
}

export function DispensingHistory({ pharmacyId }: DispensingHistoryProps) {
    const [history, setHistory] = useState<DispensingRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, [pharmacyId]);

    const loadHistory = async () => {
        try {
            const response = await pharmacyAPI.getDispensingHistory(pharmacyId, { limit: 50 }) as any;
            setHistory(response.data || []);
        } catch (error: any) {
            toast.error(error.message || 'Failed to load dispensing history');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading history...</div>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold">Dispensing History</h3>
                <p className="text-sm text-muted-foreground">
                    Record of all prescriptions dispensed
                </p>
            </div>

            {history.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No dispensing history found</p>
                            <p className="text-sm mt-2">Dispensed prescriptions will appear here</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Prescription ID</TableHead>
                                    <TableHead>Patient</TableHead>
                                    <TableHead>Medication</TableHead>
                                    <TableHead>Quantity</TableHead>
                                    <TableHead>Dispensed By</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell>
                                            {new Date(record.dispensedAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {record.prescriptionId}
                                        </TableCell>
                                        <TableCell className="font-medium">{record.patientName}</TableCell>
                                        <TableCell>{record.medication}</TableCell>
                                        <TableCell>{record.quantity}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {record.dispensedBy}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="default" className="gap-1">
                                                <CheckCircle className="h-3 w-3" />
                                                Dispensed
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
