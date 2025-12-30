'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Eye,
    Shield,
    User,
    Calendar,
    FileText,
    Download,
    CheckCircle,
    Clock,
    AlertCircle
} from 'lucide-react';
import { complianceAPI } from '@/lib/api/compliance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

interface AccessLog {
    timestamp: string;
    user: string;
    userRole: string;
    action: string;
    resource: string;
    hasConsent: boolean;
    emergency: boolean;
}

export default function PatientDataAccessPage() {
    const { user } = useAuth();
    const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30days');

    useEffect(() => {
        loadAccessLogs();
    }, [timeRange]);

    const loadAccessLogs = async () => {
        try {
            setLoading(true);

            if (!user?.id) {
                toast.error('User not authenticated');
                setAccessLogs([]);
                return;
            }

            // Fetch audit logs where this patient's data was accessed
            // Note: For patient view, we want to see who ACCESSED their data (not their own actions)
            const response = await complianceAPI.getAuditLogs({
                // Filter logs where patient is the resource owner (their data was accessed)
                // Backend should filter by resourceId matching patient records
                limit: 50,
                page: 1,
            });

            // Map backend audit log format to frontend AccessLog interface
            const logs: AccessLog[] = (response.logs || []).map((log: any) => ({
                timestamp: log.timestamp || log.createdAt,
                user: log.user?.fullName || 'Unknown User',
                userRole: log.user?.role || 'Unknown',
                action: formatAction(log.action),
                resource: formatResourceType(log.resourceType),
                hasConsent: !!log.consentId || log.details?.hasConsent || false,
                emergency: log.emergency || false,
            }));

            setAccessLogs(logs);
        } catch (error: any) {
            console.error('Failed to load access logs:', error);
            toast.error('Failed to load data access history');
        } finally {
            setLoading(false);
        }
    };

    const exportMyData = async () => {
        try {
            toast.info('Preparing your data export (GDPR Right to Data Portability)...');

            // In production, would call backend endpoint
            await new Promise(resolve => setTimeout(resolve, 1500));

            toast.success('Data export ready! Download starting...');

            // Mock download
            const mockData = {
                patient: user?.name,
                exportDate: new Date().toISOString(),
                medicalRecords: [],
                prescriptions: [],
                appointments: [],
                labTests: [],
                accessLogs: accessLogs,
            };

            const blob = new Blob([JSON.stringify(mockData, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `my-health-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Failed to export data');
        }
    };

    // Format audit action for display
    const formatAction = (action: string): string => {
        const actionMap: Record<string, string> = {
            'DATA_ACCESS': 'Viewed Data',
            'DATA_CREATE': 'Created Record',
            'DATA_UPDATE': 'Updated Record',
            'DATA_DELETE': 'Deleted Record',
            'CONSENT_GRANTED': 'Granted Consent',
            'CONSENT_REVOKED': 'Revoked Consent',
            'EMERGENCY_ACCESS': 'Emergency Access',
            'EXPORT_DATA': 'Exported Data',
            'SHARE_DATA': 'Shared Data',
        };
        return actionMap[action] || action.replace(/_/g, ' ');
    };

    // Format resource type for display
    const formatResourceType = (resourceType: string): string => {
        const resourceMap: Record<string, string> = {
            'PATIENT_RECORD': 'Patient Record',
            'MEDICAL_RECORD': 'Medical Record',
            'PRESCRIPTION': 'Prescription',
            'APPOINTMENT': 'Appointment',
            'LAB_TEST': 'Lab Test',
            'CONSENT_REQUEST': 'Consent',
            'INSURANCE_CLAIM': 'Insurance Claim',
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
                    <Eye className="h-8 w-8 text-blue-500" />
                    Who Accessed My Data
                </h1>
                <p className="text-muted-foreground mt-1">
                    Track who accessed your medical information and when
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Accesses</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{accessLogs.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Authorized Access</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {accessLogs.filter(log => log.hasConsent).length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">With your consent</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Emergency Access</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {accessLogs.filter(log => log.emergency).length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Emergency situations</p>
                    </CardContent>
                </Card>
            </div>

            {/* Privacy Notice */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10">
                <CardHeader>
                    <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Your Privacy Rights
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p><strong>✅ HIPAA Compliance:</strong> All data access is logged and monitored</p>
                    <p><strong>✅ GDPR Rights:</strong> You have the right to know who accessed your data</p>
                    <p><strong>✅ Consent Control:</strong> Revoke access permissions anytime in Consent Management</p>
                    <div className="pt-2">
                        <Button onClick={exportMyData} variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export My Data (GDPR)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Access Log Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Data Access History</CardTitle>
                    <CardDescription>
                        Complete audit trail of who viewed or modified your medical information
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {accessLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No access logs yet</p>
                            <p className="text-sm mt-1">Your data access history will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {accessLogs.map((log, idx) => (
                                <div key={idx} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                    <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                                        <User className="h-5 w-5 text-primary" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-medium">{log.user}</div>
                                                <div className="text-sm text-muted-foreground">{log.userRole}</div>
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
                                            <span className="text-sm text-muted-foreground">→</span>
                                            <span className="text-sm font-medium">{log.resource}</span>
                                        </div>

                                        <div className="mt-2 flex gap-2">
                                            {log.hasConsent ? (
                                                <Badge variant="secondary" className="text-xs">
                                                    <CheckCircle className="h-3 w-3 mr-1" />
                                                    Authorized
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="text-xs">
                                                    <AlertCircle className="h-3 w-3 mr-1" />
                                                    No Consent
                                                </Badge>
                                            )}

                                            {log.emergency && (
                                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30">
                                                    Emergency Access
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* What You Can Do */}
            <Card>
                <CardHeader>
                    <CardTitle>Manage Your Privacy</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="outline" className="justify-start h-auto py-4" asChild>
                            <a href="/dashboard/consent">
                                <div className="flex items-start gap-3 text-left">
                                    <Shield className="h-5 w-5 mt-0.5" />
                                    <div>
                                        <div className="font-semibold">Manage Consents</div>
                                        <div className="text-sm text-muted-foreground">
                                            Control who can access your data
                                        </div>
                                    </div>
                                </div>
                            </a>
                        </Button>

                        <Button variant="outline" className="justify-start h-auto py-4" onClick={exportMyData}>
                            <div className="flex items-start gap-3 text-left">
                                <Download className="h-5 w-5 mt-0.5" />
                                <div>
                                    <div className="font-semibold">Download My Data</div>
                                    <div className="text-sm text-muted-foreground">
                                        Export all your health information
                                    </div>
                                </div>
                            </div>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
