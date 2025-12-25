"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { appointmentsApi, type Appointment } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Eye } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

type BadgeVariant = "scheduled" | "completed" | "cancelled" | "no_show" | "default";

function getStatusBadgeVariant(status: string): BadgeVariant {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
        case "scheduled":
            return "scheduled";
        case "completed":
            return "completed";
        case "cancelled":
            return "cancelled";
        case "no_show":
        case "no-show":
            return "no_show";
        default:
            return "default";
    }
}

function formatAppointmentDateTime(appointment: Appointment): string {
    try {
        if (appointment.appointmentDate) {
            return new Date(appointment.appointmentDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            }) + (appointment.appointmentTime ? ` at ${appointment.appointmentTime}` : "");
        }
        if (appointment.time) {
            return new Date(appointment.time * 1000).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        return "N/A";
    } catch {
        return "N/A";
    }
}

export function AppointmentHistory() {
    const router = useRouter();
    const { toast } = useToast();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await appointmentsApi.getAll() || [];
            setAppointments(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to fetch appointments";
            setError(errorMessage);
            toast({
                variant: "destructive",
                title: "Error Loading Appointments",
                description: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleViewAppointment = (appointmentId: string) => {
        router.push(`/appointments/${appointmentId}`);
    };

    const handleScheduleAppointment = () => {
        router.push("/appointments/new");
    };

    if (loading) {
        return <SkeletonTable rows={5} columns={5} />;
    }

    if (error && appointments.length === 0) {
        return (
            <EmptyState
                icon="alert"
                title="Failed to Load Appointments"
                description={error}
                action={{
                    label: "Try Again",
                    onClick: fetchAppointments,
                }}
            />
        );
    }

    if (appointments.length === 0) {
        return (
            <EmptyState
                icon="inbox"
                title="No Appointments Found"
                description="You don't have any appointments yet. Schedule one to get started."
                action={{
                    label: "Schedule Appointment",
                    onClick: handleScheduleAppointment,
                    icon: <Calendar className="mr-2 h-4 w-4" />,
                }}
            />
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Patient / Doctor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {appointments.map((appointment) => (
                        <TableRow key={appointment.appointmentId || appointment.id}>
                            <TableCell className="font-medium">
                                {formatAppointmentDateTime(appointment)}
                            </TableCell>
                            <TableCell>
                                {appointment.doctorName || appointment.doctor || appointment.doctorId || "N/A"}
                            </TableCell>
                            <TableCell className="capitalize">
                                {appointment.type || "General"}
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusBadgeVariant(appointment.status)}>
                                    {appointment.status.replace("_", " ").toUpperCase()}
                                </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                                {appointment.notes || appointment.details || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewAppointment(appointment.appointmentId || appointment.id!)}
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
