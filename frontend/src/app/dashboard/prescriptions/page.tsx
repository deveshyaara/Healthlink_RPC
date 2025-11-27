"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { prescriptionsApi } from "@/lib/api-client";
import { Pill, PlusCircle, FileText } from "lucide-react";

interface Prescription {
  prescriptionId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  instructions: string;
  status?: string;
  createdAt?: string;
}

export default function PrescriptionsPage() {
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrescriptions = async () => {
            try {
                const data = await prescriptionsApi.getAllPrescriptions();
                setPrescriptions(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to fetch prescriptions:', error);
                setPrescriptions([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPrescriptions();
    }, []);

    const getStatusVariant = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'default';
            case 'completed': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-government-blue mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading prescriptions...</p>
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
                    <h1 className="text-3xl font-bold text-government-navy dark:text-white">Prescriptions</h1>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                        Manage patient prescriptions and medications
                    </p>
                </div>
                <Button className="bg-government-blue hover:bg-government-blue/90">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Prescription
                </Button>
            </div>

            {/* Prescriptions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Prescriptions</CardTitle>
                </CardHeader>
                <CardContent>
                    {prescriptions.length === 0 ? (
                        <div className="text-center py-8">
                            <Pill className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No prescriptions found</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Prescription ID</TableHead>
                                    <TableHead>Patient ID</TableHead>
                                    <TableHead>Doctor ID</TableHead>
                                    <TableHead>Medications</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {prescriptions.map((prescription) => (
                                    <TableRow key={prescription.prescriptionId}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                {prescription.prescriptionId}
                                            </div>
                                        </TableCell>
                                        <TableCell>{prescription.patientId}</TableCell>
                                        <TableCell>{prescription.doctorId}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {prescription.medications.slice(0, 2).map((med, index) => (
                                                    <Badge key={index} variant="outline" className="text-xs">
                                                        {med.name}
                                                    </Badge>
                                                ))}
                                                {prescription.medications.length > 2 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{prescription.medications.length - 2} more
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(prescription.status)}>
                                                {prescription.status || 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm">
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
        </div>
    );
}