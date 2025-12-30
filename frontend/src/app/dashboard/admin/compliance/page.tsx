'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Shield,
    AlertTriangle,
    Users,
    Clock,
    FileText,
    Download,
    TrendingUp,
    Database,
    CheckCircle,
    XCircle,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { complianceAPI } from '@/lib/api/compliance';
import { toast } from 'sonner';

// Audit Log Viewer Component
function AuditLogViewer() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState<string>('all');
    const [filterResource, setFilterResource] = useState<string>('all');
    const limit = 10;

    useEffect(() => {
        loadAuditLogs();
    }, [page, filterAction, filterResource]);

    const loadAuditLogs = async () => {
        try {
            setLoading(true);
            const params: any = {
                page,
                limit,
            };

            if (filterAction !== 'all') params.action = filterAction;
            if (filterResource !== 'all') params.resourceType = filterResource;

            const response = await complianceAPI.getAuditLogs(params);
            setLogs(response.logs || []);
            setTotalPages(response.pagination?.pages || 1);
        } catch (error: any) {
            console.error('Failed to load audit logs:', error);
            toast.error('Failed to load audit logs');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const formatAction = (action: string): string => {
        const actionMap: Record<string, string> = {
            'DATA_ACCESS': 'Data Access',
            'DATA_CREATE': 'Created',
            'DATA_UPDATE': 'Updated',
            'DATA_DELETE': 'Deleted',
            'CONSENT_GRANTED': 'Consent Granted',
            'CONSENT_REVOKED': 'Consent Revoked',
            'LOGIN': 'Login',
            'LOGOUT': 'Logout',
            'EMERGENCY_ACCESS': 'Emergency Access',
            'EXPORT_DATA': 'Data Export',
            'SHARE_DATA': 'Data Shared',
        };
        return actionMap[action] || action.replace(/_/g, ' ');
    };

    const formatResourceType = (resourceType: string): string => {
        const resourceMap: Record<string, string> = {
            'PATIENT_RECORD': 'Patient Record',
            'MEDICAL_RECORD': 'Medical Record',
            'PRESCRIPTION': 'Prescription',
            'APPOINTMENT': 'Appointment',
            'LAB_TEST': 'Lab Test',
            'CONSENT_REQUEST': 'Consent',
            'USER_PROFILE': 'User Profile',
            'INSURANCE_CLAIM': 'Insurance Claim',
        };
        return resourceMap[resourceType] || resourceType.replace(/_/g, ' ');
    };

    const getActionBadgeColor = (action: string) => {
        if (action.includes('DELETE') || action.includes('REVOKE')) return 'destructive';
        if (action.includes('CREATE') || action.includes('GRANT')) return 'default';
        if (action.includes('ACCESS')) return 'secondary';
        return 'outline';
    };

    const filteredLogs = logs.filter(log => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            log.user?.fullName?.toLowerCase().includes(search) ||
            log.user?.email?.toLowerCase().includes(search) ||
            log.resourceId?.toLowerCase().includes(search)
        );
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Audit Log Viewer</CardTitle>
                <CardDescription>
                    Detailed access and activity logs for compliance auditing
                </CardDescription>
            </CardHeader>
            <CardContent>
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by user or resource ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    <Select value={filterAction} onValueChange={setFilterAction}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            <SelectItem value="DATA_ACCESS">Data Access</SelectItem>
                            <SelectItem value="DATA_CREATE">Create</SelectItem>
                            <SelectItem value="DATA_UPDATE">Update</SelectItem>
                            <SelectItem value="DATA_DELETE">Delete</SelectItem>
                            <SelectItem value="CONSENT_GRANTED">Consent Granted</SelectItem>
                            <SelectItem value="CONSENT_REVOKED">Consent Revoked</SelectItem>
                            <SelectItem value="EMERGENCY_ACCESS">Emergency Access</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterResource} onValueChange={setFilterResource}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by resource" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Resources</SelectItem>
                            <SelectItem value="PATIENT_RECORD">Patient Record</SelectItem>
                            <SelectItem value="MEDICAL_RECORD">Medical Record</SelectItem>
                            <SelectItem value="PRESCRIPTION">Prescription</SelectItem>
                            <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                            <SelectItem value="LAB_TEST">Lab Test</SelectItem>
                            <SelectItem value="CONSENT_REQUEST">Consent</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Logs Table */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No audit logs found</p>
                        <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                ) : (
                    <>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Resource</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredLogs.map((log, idx) => (
                                        <tr key={idx} className="hover:bg-muted/20">
                                            <td className="px-4 py-3 text-sm">
                                                <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="font-medium">{log.user?.fullName || 'Unknown'}</div>
                                                <div className="text-xs text-muted-foreground">{log.user?.email || ''}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <Badge variant={getActionBadgeColor(log.action)}>
                                                    {formatAction(log.action)}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div>{formatResourceType(log.resourceType)}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {log.resourceId}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {log.success ? (
                                                    <Badge variant="secondary" className="text-green-600">
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Success
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive">
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                        Failed
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {filteredLogs.length} of {logs.length} logs
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

export default function ComplianceDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [violations, setViolations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const [statsData, violationsData] = await Promise.all([
                complianceAPI.getStats(),
                complianceAPI.getViolations(),
            ]);

            setStats(statsData);
            setViolations(violationsData.violations || []);
        } catch (error: any) {
            console.error('Failed to load compliance data:', error);
            toast.error('Failed to load compliance dashboard');
        } finally {
            setLoading(false);
        }
    };

    const generateReport = async (type: 'HIPAA' | 'GDPR') => {
        setGenerating(true);
        try {
            const endDate = new Date().toISOString();
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const report = type === 'HIPAA'
                ? await complianceAPI.generateHIPAAReport(startDate, endDate)
                : await complianceAPI.generateGDPRReport(startDate, endDate);

            toast.success(`${type} report generated successfully!`);

            // Download report as JSON for now
            const blob = new Blob([JSON.stringify(report.report, null, 2)], {
                type: 'application/json'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}-report-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error(`Failed to generate ${type} report:`, error);
            toast.error(`Failed to generate ${type} report`);
        } finally {
            setGenerating(false);
        }
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
                    <Shield className="h-8 w-8 text-blue-500" />
                    Compliance & Audit Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                    HIPAA/GDPR compliance monitoring and automated reporting
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Accesses</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalAccesses || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Consents Granted</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.consents || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Active consents</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Violations</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-500">
                            {violations.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.users || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                    </CardContent>
                </Card>
            </div>

            {/* Violations Alert */}
            {violations.length > 0 && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
                    <CardHeader>
                        <CardTitle className="text-red-900 dark:text-red-100 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Compliance Violations Detected
                        </CardTitle>
                        <CardDescription className="text-red-700 dark:text-red-200">
                            {violations.length} violation{violations.length > 1 ? 's' : ''} found in the last 24 hours
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {violations.slice(0, 5).map((violation, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="font-medium">{violation.user}</div>
                                        <div className="text-sm text-muted-foreground">{violation.reason}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="destructive" className="text-xs">
                                                {violation.severity}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(violation.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Report Generation */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Generate Compliance Reports
                    </CardTitle>
                    <CardDescription>
                        One-click HIPAA and GDPR compliance reports for the last 30 days
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                            onClick={() => generateReport('HIPAA')}
                            disabled={generating}
                            className="w-full h-auto py-4 flex flex-col gap-2"
                        >
                            <div className="flex items-center gap-2">
                                <Download className="h-5 w-5" />
                                <span className="font-semibold">Generate HIPAA Report</span>
                            </div>
                            <span className="text-xs opacity-80">
                                Healthcare compliance report with violation analysis
                            </span>
                        </Button>

                        <Button
                            onClick={() => generateReport('GDPR')}
                            disabled={generating}
                            variant="outline"
                            className="w-full h-auto py-4 flex flex-col gap-2"
                        >
                            <div className="flex items-center gap-2">
                                <Download className="h-5 w-5" />
                                <span className="font-semibold">Generate GDPR Report</span>
                            </div>
                            <span className="text-xs opacity-80">
                                Data protection and privacy compliance report
                            </span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs for detailed views */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
                    <TabsTrigger value="reports">Saved Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <Card>
                        <CardHeader>
                            <CardTitle>Compliance Overview</CardTitle>
                            <CardDescription>
                                Summary of compliance metrics and trends
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                    <div>
                                        <div className="font-medium">Overall Compliance Rate</div>
                                        <div className="text-sm text-muted-foreground">
                                            Based on consented access vs total access
                                        </div>
                                    </div>
                                    <div className="text-3xl font-bold text-green-600">
                                        {stats?.consents && stats?.totalAccesses
                                            ? Math.round((stats.consents / stats.totalAccesses) * 100)
                                            : 0}%
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 border rounded-lg">
                                        <div className="text-sm text-muted-foreground">Data Accesses</div>
                                        <div className="text-2xl font-bold mt-1">{stats?.totalAccesses || 0}</div>
                                        <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3" />
                                            Tracking enabled
                                        </div>
                                    </div>

                                    <div className="p-4 border rounded-lg">
                                        <div className="text-sm text-muted-foreground">Consented Access</div>
                                        <div className="text-2xl font-bold mt-1">{stats?.consents || 0}</div>
                                        <div className="text-xs text-green-600 mt-1">
                                            HIPAA compliant
                                        </div>
                                    </div>

                                    <div className="p-4 border rounded-lg">
                                        <div className="text-sm text-muted-foreground">Emergency Access</div>
                                        <div className="text-2xl font-bold mt-1">0</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Documented
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="audit-logs">
                    <AuditLogViewer />
                </TabsContent>

                <TabsContent value="reports">
                    <Card>
                        <CardHeader>
                            <CardTitle>Saved Compliance Reports</CardTitle>
                            <CardDescription>
                                Previously generated HIPAA and GDPR reports
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No saved reports yet</p>
                                <p className="text-sm mt-1">Generate your first report above</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
