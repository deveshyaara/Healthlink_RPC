'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Server, Wifi, AlertCircle, CheckCircle2 } from 'lucide-react';
import { healthApi } from '@/lib/api-client';

interface HealthStatus {
    status: 'UP' | 'DOWN' | 'DEGRADED';
    online: boolean;
    database: string;
    blockchainSync?: string;
    timestamp: string;
}

export default function SystemHealthPage() {
    const [healthData, setHealthData] = useState<HealthStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastChecked, setLastChecked] = useState<Date>(new Date());

    const fetchHealthStatus = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await healthApi.check();
            setHealthData(response);
            setLastChecked(new Date());
        } catch (err: any) {
            setError(err.message || 'Failed to fetch health status');
            setHealthData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealthStatus();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchHealthStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status: string | undefined) => {
        switch (status) {
            case 'UP':
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'DOWN':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'DEGRADED':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default:
                return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getStatusIcon = (status: string | undefined) => {
        switch (status) {
            case 'UP':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'DOWN':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Activity className="h-5 w-5 text-yellow-500" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
                    <p className="text-muted-foreground">
                        Monitor system connectivity and service status
                    </p>
                </div>
                <button
                    onClick={fetchHealthStatus}
                    disabled={loading}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                    {loading ? 'Checking...' : 'Refresh'}
                </button>
            </div>

            {error && (
                <Card className="border-red-500/20 bg-red-500/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-red-500">
                            <AlertCircle className="h-5 w-5" />
                            <p className="font-medium">{error}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Overall Status */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Status</CardTitle>
                        <Server className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {getStatusIcon(healthData?.status)}
                            <Badge className={getStatusColor(healthData?.status)}>
                                {loading ? 'Checking...' : healthData?.status || 'UNKNOWN'}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Last checked: {lastChecked.toLocaleTimeString()}
                        </p>
                    </CardContent>
                </Card>

                {/* Database Status */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Database</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {healthData?.database === 'UP' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                            <Badge className={getStatusColor(healthData?.database)}>
                                {loading ? 'Checking...' : healthData?.database || 'UNKNOWN'}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            PostgreSQL (Supabase)
                        </p>
                    </CardContent>
                </Card>

                {/* API Status */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">API Connection</CardTitle>
                        <Wifi className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            {healthData?.online ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                            <Badge className={healthData?.online ? getStatusColor('UP') : getStatusColor('DOWN')}>
                                {loading ? 'Checking...' : healthData?.online ? 'ONLINE' : 'OFFLINE'}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Middleware API
                        </p>
                    </CardContent>
                </Card>

                {/* Blockchain Status */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blockchain</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-blue-500" />
                            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                {loading ? 'Checking...' : healthData?.blockchainSync || 'N/A'}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Hyperledger Fabric
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed System Information */}
            <Card>
                <CardHeader>
                    <CardTitle>System Information</CardTitle>
                    <CardDescription>
                        Detailed health check results and system metadata
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center text-muted-foreground py-8">
                            Loading system information...
                        </div>
                    ) : healthData ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Overall Status</p>
                                    <p className="text-lg font-semibold">{healthData.status}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Online Status</p>
                                    <p className="text-lg font-semibold">{healthData.online ? 'Online' : 'Offline'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Database Connection</p>
                                    <p className="text-lg font-semibold">{healthData.database}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Last Check</p>
                                    <p className="text-lg font-semibold">
                                        {new Date(healthData.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                    All systems operational. Monitoring continues every 30 seconds.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            Unable to fetch system information
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
