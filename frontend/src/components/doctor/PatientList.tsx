"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { patientsApi, type Patient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { Eye, UserPlus } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export function PatientList() {
    const router = useRouter();
    const { toast } = useToast();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            setLoading(true);
            setError(null);

            // Note: Backend might not have a getAll endpoint yet
            // This will gracefully handle 404 responses
            const data = await patientsApi.getAll?.() || [];
            setPatients(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch patients";
            setError(errorMessage);
            toast({
                variant: "destructive",
                title: "Error Loading Patients",
                description: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleViewPatient = (patientId: string) => {
        router.push(`/patient/${patientId}`);
    };

    const handleRegisterPatient = () => {
        router.push("/patients/register");
    };

    if (loading) {
        return <SkeletonTable rows={5} columns={5} />;
    }

    if (error && patients.length === 0) {
        return (
            <EmptyState
                icon="alert"
                title="Failed to Load Patients"
                description={error}
                action={{
                    label: "Try Again",
                    onClick: fetchPatients,
                }}
            />
        );
    }

    if (patients.length === 0) {
        return (
            <EmptyState
                icon="inbox"
                title="No Patients Found"
                description="Get started by registering your first patient to begin managing their healthcare records."
                action={{
                    label: "Register Patient",
                    onClick: handleRegisterPatient,
                    icon: <UserPlus className="mr-2 h-4 w-4" />,
                }}
            />
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Age</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {patients.map((patient) => (
                        <TableRow key={patient.patientId || patient.id}>
                            <TableCell className="font-medium">
                                {patient.publicData?.name || patient.name || "N/A"}
                            </TableCell>
                            <TableCell>
                                {patient.email || "N/A"}
                            </TableCell>
                            <TableCell>
                                {patient.publicData?.age || patient.age || "N/A"}
                            </TableCell>
                            <TableCell className="capitalize">
                                {patient.publicData?.gender || patient.gender || "N/A"}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewPatient(patient.patientId || patient.id!)}
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
