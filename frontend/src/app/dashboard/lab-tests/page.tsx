"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { labTestsApi } from "@/lib/api-client";
import { TestTube, PlusCircle, FileText } from "lucide-react";

interface LabTest {
  labTestId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  testType: string;
  testName: string;
  instructions: string;
  priority: 'routine' | 'urgent' | 'asap';
  status?: 'pending' | 'completed' | 'cancelled';
  results?: string;
  createdAt?: string;
}

export default function LabTestsPage() {
    const [labTests, setLabTests] = useState<LabTest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLabTests = async () => {
            try {
                const data = await labTestsApi.getAllLabTests();
                setLabTests(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Failed to fetch lab tests:', error);
                setLabTests([]);
            } finally {
                setLoading(false);
            }
        };
        fetchLabTests();
    }, []);

    const getStatusVariant = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'default';
            case 'pending': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    const getPriorityVariant = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'urgent': return 'destructive';
            case 'asap': return 'destructive';
            case 'routine': return 'secondary';
            default: return 'outline';
        }
    };

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-government-blue mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading lab tests...</p>
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
                    <h1 className="text-3xl font-bold text-government-navy dark:text-white">Lab Tests</h1>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                        Manage laboratory test orders and results
                    </p>
                </div>
                <Button className="bg-government-blue hover:bg-government-blue/90">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Order Lab Test
                </Button>
            </div>

            {/* Lab Tests Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Lab Tests</CardTitle>
                </CardHeader>
                <CardContent>
                    {labTests.length === 0 ? (
                        <div className="text-center py-8">
                            <TestTube className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No lab tests found</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Test ID</TableHead>
                                    <TableHead>Patient ID</TableHead>
                                    <TableHead>Test Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {labTests.map((test) => (
                                    <TableRow key={test.labTestId}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                {test.labTestId}
                                            </div>
                                        </TableCell>
                                        <TableCell>{test.patientId}</TableCell>
                                        <TableCell>{test.testName}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{test.testType}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getPriorityVariant(test.priority)}>
                                                {test.priority.toUpperCase()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(test.status)}>
                                                {test.status || 'Pending'}
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