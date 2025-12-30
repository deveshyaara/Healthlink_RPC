'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Pill,
    QrCode,
    PackageCheck,
    AlertTriangle,
    CheckCircle,
    Clock,
    TrendingUp,
    Activity,
    FileText
} from 'lucide-react';
import { complianceAPI } from '@/lib/api/compliance';
import { toast } from 'sonner';

interface VerificationLog {
    timestamp: string;
    prescriptionId: string;
    patientName: string;
    medication: string;
    status: 'verified' | 'rejected' | 'flagged';
    reason?: string;
    pharmacist: string;
}

export default function PharmacyCompliancePage() {
    const [verificationLogs, setVerificationLogs] = useState<VerificationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, verified: 0, rejected: 0, flagged: 0 });

    useEffect(() => {
        loadPharmacyActivity();
    }, []);

    const loadPharmacyActivity = async () => {
        try {
            setLoading(true);

            // Fetch real audit logs from backend - filter by PRESCRIPTION resource type
            const response = await complianceAPI.getAuditLogs({
                resourceType: 'PRESCRIPTION',
                limit: 50,
                page: 1,
            });

            // Map backend audit log format to frontend VerificationLog interface
            const logs: VerificationLog[] = (response.logs || []).map((log: any) => {
                // Determine status from action and success fields
                let status: 'verified' | 'rejected' | 'flagged' = 'verified';
                if (!log.success) status = 'rejected';
                if (log.details?.flagged) status = 'flagged';

                return {
                    timestamp: log.timestamp || log.createdAt,
                    prescriptionId: log.resourceId || 'Unknown',
                    patientName: log.details?.patientName || 'Unknown Patient',
                    medication: log.details?.medication || 'Unknown Medication',
                    status,
                    reason: log.errorMessage || log.details?.reason,
                    pharmacist: log.user?.fullName || 'Unknown Pharmacist',
                };
            });

            setVerificationLogs(logs);
            setStats({
                total: logs.length,
                verified: logs.filter(log => log.status === 'verified').length,
                rejected: logs.filter(log => log.status === 'rejected').length,
                flagged: logs.filter(log => log.status === 'flagged').length,
            });
        } catch (error: any) {
            console.error('Failed to load pharmacy activity:', error);
            toast.error('Failed to load verification logs');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'verified': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
            case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
            case 'flagged': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getRelativeTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));

        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <QrCode className="h-8 w-8 text-blue-600" />
                    Pharmacy Compliance Audit
                </h1>
                <p className="text-muted-foreground mt-1">
                    Prescription verification and dispensing compliance tracking
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Verifications</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Verified</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}% success rate
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                        <p className="text-xs text-muted-foreground mt-1">Invalid prescriptions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Flagged</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.flagged}</div>
                        <p className="text-xs text-muted-foreground mt-1">Needs review</p>
                    </CardContent>
                </Card>
            </div>

            {/* Flagged Items Alert */}
            {stats.flagged > 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10">
                    <CardHeader>
                        <CardTitle className="text-orange-900 dark:text-orange-100 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Flagged Prescriptions Require Attention
                        </CardTitle>
                        <CardDescription className="text-orange-700 dark:text-orange-200">
                            {stats.flagged} prescription{stats.flagged > 1 ? 's' : ''} flagged for potential issues
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {verificationLogs.filter(log => log.status === 'flagged').map((log, idx) => (
                                <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                                    <div className="font-medium">{log.prescriptionId} - {log.medication}</div>
                                    <div className="text-sm text-muted-foreground">{log.reason}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Verification Log */}
            <Card>
                <CardHeader>
                    <CardTitle>Prescription Verification Log</CardTitle>
                    <CardDescription>
                        Complete audit trail of all prescription verifications
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {verificationLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No verification logs yet</p>
                            <p className="text-sm mt-1">Your verification history will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {verificationLogs.map((log, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                        {log.status === 'verified' ? (
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-medium">{log.prescriptionId}</div>
                                                <div className="text-sm text-muted-foreground">Patient: {log.patientName}</div>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                <Clock className="h-3 w-3 inline mr-1" />
                                                {getRelativeTime(log.timestamp)}
                                            </div>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <Pill className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">{log.medication}</span>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <Badge className={`text-xs ${getStatusColor(log.status)}`}>
                                                {log.status.toUpperCase()}
                                            </Badge>
                                            {log.reason && (
                                                <span className="text-xs text-muted-foreground">
                                                    {log.reason}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="stats" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="stats">Statistics</TabsTrigger>
                    <TabsTrigger value="controlled">Controlled Substances</TabsTrigger>
                    <TabsTrigger value="inventory">Inventory</TabsTrigger>
                </TabsList>

                <TabsContent value="stats">
                    <Card>
                        <CardHeader>
                            <CardTitle>Verification Statistics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div>
                                        <div className="font-medium">Success Rate</div>
                                        <div className="text-sm text-muted-foreground">Valid vs total verifications</div>
                                    </div>
                                    <div className="text-3xl font-bold text-green-600">
                                        {stats.total > 0 ? Math.round((stats.verified / stats.total) * 100) : 0}%
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 border rounded-lg">
                                        <div className="text-sm text-muted-foreground">Verified</div>
                                        <div className="text-2xl font-bold mt-1">{stats.verified}</div>
                                    </div>

                                    <div className="p-4 border rounded-lg">
                                        <div className="text-sm text-muted-foreground">Rejected</div>
                                        <div className="text-2xl font-bold mt-1">{stats.rejected}</div>
                                    </div>

                                    <div className="p-4 border rounded-lg">
                                        <div className="text-sm text-muted-foreground">Flagged</div>
                                        <div className="text-2xl font-bold mt-1">{stats.flagged}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="controlled">
                    <Card>
                        <CardHeader>
                            <CardTitle>Controlled Substance Tracking</CardTitle>
                            <CardDescription>
                                Special monitoring for controlled medications
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <PackageCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Controlled substance logs coming soon</p>
                                <p className="text-sm mt-1">DEA-compliant tracking for Schedule II-V drugs</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="inventory">
                    <Card>
                        <CardHeader>
                            <CardTitle>Inventory Audit Trail</CardTitle>
                            <CardDescription>
                                Stock changes and expiry compliance
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>Inventory audit logs coming soon</p>
                                <p className="text-sm mt-1">Track stock levels and expiry dates</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
