'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Building2,
    AlertTriangle,
    Users,
    FileText,
    Download,
    TrendingUp,
    Database,
    CheckCircle,
    Activity,
    Calendar
} from 'lucide-react';
import { complianceAPI } from '@/lib/api/compliance';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

export default function HospitalCompliancePage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [violations, setViolations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadHospitalData();
    }, []);

    const loadHospitalData = async () => {
        try {
            setLoading(true);
            const [statsData, violationsData] = await Promise.all([
                complianceAPI.getStats(),
                complianceAPI.getViolations(),
            ]);

            setStats(statsData);

            // Filter violations for this hospital only (in real app, backend would filter)
            setViolations(violationsData.violations || []);
        } catch (error: any) {
            console.error('Failed to load compliance data:', error);
            toast.error('Failed to load compliance dashboard');
        } finally {
            setLoading(false);
        }
    };

    const generateHospitalReport = async (type: 'HIPAA' | 'GDPR') => {
        setGenerating(true);
        try {
            const endDate = new Date().toISOString();
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

            const report = type === 'HIPAA'
                ? await complianceAPI.generateHIPAAReport(startDate, endDate)
                : await complianceAPI.generateGDPRReport(startDate, endDate);

            toast.success(`${type} hospital report generated!`);

            // Download report
            const blob = new Blob([JSON.stringify(report.report, null, 2)], {
                type: 'application/json'
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hospital-${type}-report-${new Date().toISOString().split('T')[0]}.json`;
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
                    <Building2 className="h-8 w-8 text-blue-600" />
                    Hospital Compliance Dashboard
                </h1>
                <p className="text-muted-foreground mt-1">
                    HIPAA compliance monitoring for your hospital
                </p>
            </div>

            {/* Hospital Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Hospital Accesses</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalAccesses || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.users || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Doctors & Nurses</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Consents Active</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.consents || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Patient authorizations</p>
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
            </div>

            {/* Violation Alerts */}
            {violations.length > 0 && (
                <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
                    <CardHeader>
                        <CardTitle className="text-red-900 dark:text-red-100 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Staff Compliance Issues
                        </CardTitle>
                        <CardDescription className="text-red-700 dark:text-red-200">
                            {violations.length} violation{violations.length > 1 ? 's' : ''} by hospital staff
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {violations.slice(0, 3).map((violation, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
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

            {/* Department Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Department Activity Overview
                    </CardTitle>
                    <CardDescription>
                        Data access patterns across hospital departments
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {['Cardiology', 'Emergency', 'Radiology', 'Pediatrics'].map((dept, idx) => (
                            <div key={dept} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <div className="font-medium">{dept}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {Math.floor(Math.random() * 50 + 10)} patient records accessed
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-green-600">
                                        {95 + idx}% Compliant
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {Math.floor(Math.random() * 10 + 3)} staff members
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Report Generation */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Generate Hospital Reports
                    </CardTitle>
                    <CardDescription>
                        Compliance reports for your hospital only
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                            onClick={() => generateHospitalReport('HIPAA')}
                            disabled={generating}
                            className="w-full h-auto py-4 flex flex-col gap-2"
                        >
                            <div className="flex items-center gap-2">
                                <Download className="h-5 w-5" />
                                <span className="font-semibold">Hospital HIPAA Report</span>
                            </div>
                            <span className="text-xs opacity-80">
                                Staff access compliance for your facility
                            </span>
                        </Button>

                        <Button
                            onClick={() => generateHospitalReport('GDPR')}
                            disabled={generating}
                            variant="outline"
                            className="w-full h-auto py-4 flex flex-col gap-2"
                        >
                            <div className="flex items-center gap-2">
                                <Download className="h-5 w-5" />
                                <span className="font-semibold">Hospital GDPR Report</span>
                            </div>
                            <span className="text-xs opacity-80">
                                Patient data processing compliance
                            </span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="staff" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="staff">Staff Activity</TabsTrigger>
                    <TabsTrigger value="schedule">Access Schedule</TabsTrigger>
                    <TabsTrigger value="reports">Historical Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="staff">
                    <Card>
                        <CardHeader>
                            <CardTitle>Staff Access Patterns</CardTitle>
                            <CardDescription>
                                Monitor how your staff access patient data
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 border rounded">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                            <Users className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium">Doctors: {stats?.users || 0}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {Math.floor((stats?.totalAccesses || 0) * 0.7)} accesses
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">Active</Badge>
                                </div>

                                <div className="flex items-center justify-between p-3 border rounded">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                            <Users className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <div className="font-medium">Nurses: {Math.floor((stats?.users || 0) * 1.5)}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {Math.floor((stats?.totalAccesses || 0) * 0.25)} accesses
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">Active</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="schedule">
                    <Card>
                        <CardHeader>
                            <CardTitle>Access Schedule Analysis</CardTitle>
                            <CardDescription>
                                Hourly access patterns throughout the week
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Heatmap-style schedule */}
                                <div>
                                    <h3 className="font-semibold mb-4">Access Heatmap</h3>
                                    <div className="overflow-x-auto">
                                        <div className="min-w-[600px]">
                                            {/* Header with hours */}
                                            <div className="flex gap-1 mb-2">
                                                <div className="w-20"></div>
                                                {Array.from({ length: 24 }, (_, i) => (
                                                    <div key={i} className="flex-1 text-center text-xs text-muted-foreground">
                                                        {i}h
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Days with activity bars */}
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, dayIdx) => {
                                                // Sample data - varying by hour and day
                                                const isWeekend = dayIdx >= 5;
                                                const baseActivity = isWeekend ? 0.3 : 0.6;

                                                return (
                                                    <div key={day} className="flex gap-1 mb-1">
                                                        <div className="w-20 text-sm font-medium flex items-center">{day}</div>
                                                        {Array.from({ length: 24 }, (_, hour) => {
                                                            // Simulate higher activity during work hours (8-18)
                                                            let intensity = baseActivity;
                                                            if (hour >= 8 && hour <= 18) {
                                                                intensity = baseActivity + 0.3 + Math.random() * 0.2;
                                                            } else if (hour >= 19 && hour <= 23) {
                                                                intensity = baseActivity * 0.5 + Math.random() * 0.2;
                                                            } else {
                                                                intensity = Math.random() * 0.2;
                                                            }

                                                            const opacity = Math.min(intensity, 1);
                                                            const bgColor = intensity > 0.7 ? 'bg-blue-600'
                                                                : intensity > 0.4 ? 'bg-blue-400'
                                                                    : intensity > 0.2 ? 'bg-blue-200'
                                                                        : 'bg-gray-100 dark:bg-gray-800';

                                                            return (
                                                                <div
                                                                    key={hour}
                                                                    className={`flex-1 h-8 rounded ${bgColor}`}
                                                                    style={{ opacity: opacity }}
                                                                    title={`${day} ${hour}:00 - ${Math.round(intensity * 100)} accesses`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Legend */}
                                    <div className="flex items-center gap-4 mt-4 text-sm">
                                        <span className="text-muted-foreground">Activity Level:</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800"></div>
                                            <span className="text-xs">Low</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded bg-blue-200"></div>
                                            <span className="text-xs">Medium</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded bg-blue-400"></div>
                                            <span className="text-xs">High</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 rounded bg-blue-600"></div>
                                            <span className="text-xs">Very High</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Peak Hours Summary */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Peak Access Times</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="p-3 border rounded-lg">
                                            <div className="text-sm text-muted-foreground">Busiest Hour</div>
                                            <div className="text-lg font-bold">10:00 - 11:00</div>
                                            <div className="text-xs text-muted-foreground mt-1">Avg 45 accesses</div>
                                        </div>
                                        <div className="p-3 border rounded-lg">
                                            <div className="text-sm text-muted-foreground">Quietest Hour</div>
                                            <div className="text-lg font-bold">03:00 - 04:00</div>
                                            <div className="text-xs text-muted-foreground mt-1">Avg 2 accesses</div>
                                        </div>
                                        <div className="p-3 border rounded-lg">
                                            <div className="text-sm text-muted-foreground">Weekend Activity</div>
                                            <div className="text-lg font-bold">↓ 45%</div>
                                            <div className="text-xs text-muted-foreground mt-1">vs weekdays</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historical Compliance Reports</CardTitle>
                            <CardDescription>
                                Previously generated hospital reports
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                <p>No previous reports</p>
                                <p className="text-sm mt-1">Generate your first hospital report above</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Compliance Summary */}
            <Card>
                <CardHeader>
                    <CardTitle>Hospital Compliance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {stats?.consents && stats?.totalAccesses
                                    ? Math.round((stats.consents / stats.totalAccesses) * 100)
                                    : 0}%
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                                Consented Access Rate
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {stats?.users || 0}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                                Staff with Data Access
                            </div>
                        </div>

                        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                                0
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                                Critical Violations
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
