"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { consentsApi } from "@/lib/api-client";

interface Consent {
  consentId: string;
  patientId: string;
  granteeId: string;
  scope: string;
  purpose: string;
  validUntil: string;
  status?: string;
  createdAt?: string;
}

const statusVariant: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
    "Active": "default",
    "Pending": "secondary",
    "Expired": "outline",
    "Revoked": "destructive",
}

export default function ConsentPage() {
    const [consents, setConsents] = useState<Consent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchConsents = async () => {
        try {
            const data = await consentsApi.getAllConsents();
            setConsents(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch consents:', error);
            setConsents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConsents();
    }, []);

    const handleRevokeConsent = async (consentId: string) => {
        if (!confirm('Are you sure you want to revoke this consent?')) return;
        
        try {
            await consentsApi.revokeConsent(consentId, { reason: 'Revoked by user' });
            // Refresh the consents list
            await fetchConsents();
        } catch (error) {
            console.error('Failed to revoke consent:', error);
            alert('Failed to revoke consent. Please try again.');
        }
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Consent Management</CardTitle>
                    <p className="text-muted-foreground">Loading your consents...</p>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="font-headline text-2xl">Consent Management</CardTitle>
                        <p className="text-muted-foreground">Control who has access to your records.</p>
                    </div>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Grant Consent
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Consent ID</TableHead>
                            <TableHead>Granted To</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Expires On</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {consents.map((consent) => (
                            <TableRow key={consent.consentId}>
                                <TableCell className="font-medium">{consent.consentId}</TableCell>
                                <TableCell>{consent.granteeId}</TableCell>
                                <TableCell>{consent.scope}</TableCell>
                                <TableCell>
                                    <Badge variant={statusVariant[consent.status || "Active"] || "secondary"}>
                                        {consent.status || "Active"}
                                    </Badge>
                                </TableCell>
                                <TableCell>{consent.validUntil}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem>View Details</DropdownMenuItem>
                                            {(consent.status !== 'Revoked' && consent.status !== 'Expired') && (
                                                <DropdownMenuItem 
                                                    onClick={() => handleRevokeConsent(consent.consentId)}
                                                    className="text-destructive"
                                                >
                                                    Revoke Access
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-muted-foreground">Archive</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
