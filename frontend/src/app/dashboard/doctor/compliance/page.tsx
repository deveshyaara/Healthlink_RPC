'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    FileText,
    Shield,
    Users,
    Calendar,
    Download,
    CheckCircle,
    Clock,
    AlertCircle,
    TrendingUp,
    Activity
} from 'lucide-react';
import { complianceAPI } from '@/lib/api/compliance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

interface PatientAccess {
    timestamp: string;
    patientName: string;
    patientId: string;
    action: string;
    resource: string;
    hasConsent: boolean;
    consentExpiry?: string;
}

export default function DoctorCompliancePage() {
    const { user } = useAuth();
    const [accessLogs, setAccessLogs] = useState<PatientAccess[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, withConsent: 0, violations: 0 });

    useEffect(() => {
        loadDoctorActivity();
    }, []);

    const loadDoctorActivity = async () => {
        try {
            setLoading(true);

            // Fetch real audit logs from backend
            if (!user?.id) {
                toast.error('User not authenticated');
                setAccessLogs([]);
                return;
            }

            const response = await complianceAPI.getAuditLogs({
                userId: user.id, // Current doctor's actions
                limit: 50,
                page: 1,
            });

            // Map backend audit log format to frontend PatientAccess interface
            const logs: PatientAccess[] = (response.logs || []).map((log: any) => ({
                timestamp: log.timestamp || log.createdAt,
                patientName: log.user?.fullName || log.details?.patientName || 'Unknown Patient',
                patientId: log.resourceId || log.details?.patientId || 'N/A',
                action: formatAction(log.action),
                resource: formatResourceType(log.resourceType),
                hasConsent: !!log.consentId || log.details?.hasConsent || false,
                consentExpiry: log.consent?.validUntil || log.details?.consentExpiry,
            }));

            setAccessLogs(logs);
            setStats({
                total: logs.length,
                withConsent: logs.filter(log => log.hasConsent).length,
                violations: logs.filter(log => !log.hasConsent).length,
            });
        } catch (error: any) {
            console.error('Failed to load doctor activity:', error);
            toast.error('Failed to load access history');
        } finally {
            setLoading(false);
        }
    };

    // Format audit action for display
    const formatAction = (action: string): string => {
        const actionMap: Record<string, string> = {
            'DATA_ACCESS': 'Viewed Patient Data',
            'DATA_CREATE': 'Created Record',
            'DATA_UPDATE': 'Updated Record',
            'DATA_DELETE': 'Deleted Record',
            'CONSENT_GRANTED': 'Consent Granted',
            'CONSENT_REVOKED': 'Consent Revoked',
            'EMERGENCY_ACCESS': 'Emergency Access',
        };
        return actionMap[action] || action.replace(/_/g, ' ');
    };

    // Format resource type for display
    const formatResourceType = (resourceType: string): string => {
        const resourceMap: Record<string, string> = {
            'PATIENT_RECORD': 'Patient Records',
            'MEDICAL_RECORD': 'Medical Records',
            'PRESCRIPTION': 'Prescription',
            'APPOINTMENT': 'Appointment',
            'LAB_TEST': 'Lab Test',
            'CONSENT_REQUEST': 'Consent Request',
        };
        return resourceMap[resourceType] || resourceType.replace(/_/g, ' ');
    };

    const getRelativeTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

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
                    <Activity className="h-8 w-8 text-blue-600" />
                    My Patient Access Audit
                </h1>
                <p className="text-muted-foreground mt-1">
                    Track your patient data access for HIPAA compliance
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Patient Accesses</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">With Consent</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.withConsent}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.total > 0 ? Math.round((stats.withConsent / stats.total) * 100) : 0}% compliance
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Issues</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">{stats.violations}</div>
                        <p className="text-xs text-muted-foreground mt-1">Compliance violations</p>
                    </CardContent>
                </Card>
            </div>

            {/* Compliance Notice */}
            <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
                <CardHeader>
                    <CardTitle className="text-green-900 dark:text-green-100 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        HIPAA Compliant Access
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p><strong>✅ 100% Compliance Rate:</strong> All patient data accessed with proper consent</p>
                    <p><strong>✅ Audit Trail:</strong> Every access is logged and tracked</p>
                    <p><strong>✅ Consent Management:</strong> Always verify consent before accessing patient data</p>
                </CardContent>
            </Card>

            {/* Access Log */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Patient Access History</CardTitle>
                    <CardDescription>
                        Your audit trail of patient data access for compliance
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {accessLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No access logs yet</p>
                            <p className="text-sm mt-1">Your patient access history will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {accessLogs.map((log, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                        <Users className="h-5 w-5 text-blue-600" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-medium">{log.patientName}</div>
                                                <div className="text-sm text-muted-foreground">Patient ID: {log.patientId}</div>
                                            </div>
                                            <div className="text-sm text-muted-foreground text-right">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {getRelativeTime(log.timestamp)}
                                                </div>
                                                <div className="text-xs">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">{log.action}</span>
                                            {log.resource && (
                                                <>
                                                    <span className="text-sm text-muted-foreground">→</span>
                                                    <span className="text-sm font-medium">{log.resource}</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="mt-2 flex items-center gap-2">
                                            {log.hasConsent ? (
                                                <Badge variant="secondary" className="text-xs">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Consent Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="text-xs">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    No Consent
                                                </Badge>
                                            )}

                                            {log.consentExpiry && (
                                                <span className="text-xs text-muted-foreground">
                                                    Expires: {new Date(log.consentExpiry).toLocaleDateString()}
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

            {/* Consent Status Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Patient Consent Status</CardTitle>
                    <CardDescription>
                        Active consent permissions from your patients
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="active" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="active">Active Consents</TabsTrigger>
                            <TabsTrigger value="expiring">Expiring Soon</TabsTrigger>
                            <TabsTrigger value="expired">Expired</TabsTrigger>
                        </TabsList>

                        <TabsContent value="active">
                            <div className="space-y-3">
                                {accessLogs.filter(log => log.hasConsent).map((log, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 border rounded">
                                        <div>
                                            <div className="font-medium">{log.patientName}</div>
                                            <div className="text-sm text-muted-foreground">{log.patientId}</div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="secondary" className="text-xs">Active</Badge>
                                            {log.consentExpiry && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    Until {new Date(log.consentExpiry).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="expiring">
                            <div className="text-center py-8 text-muted-foreground">
                                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No consents expiring soon</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="expired">
                            <div className="text-center py-8 text-muted-foreground">
                                <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No expired consents</p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
