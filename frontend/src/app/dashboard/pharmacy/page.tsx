'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Package, History, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRScanner } from '@/components/pharmacy/QRScanner';
import { PrescriptionVerifier } from '@/components/pharmacy/PrescriptionVerifier';
import { InventoryManager } from '@/components/pharmacy/InventoryManager';
import { DispensingHistory } from '@/components/pharmacy/DispensingHistory';
import { pharmacyAPI } from '@/lib/api/phase1';
import { toast } from 'sonner';

export default function PharmacyDashboard() {
    const [pharmacyId, setPharmacyId] = useState<string | null>(null);
    const [stats, setStats] = useState({
        totalDispensed: 0,
        pendingVerifications: 0,
        lowStockAlerts: 0,
        expiringItems: 0,
    });
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Get pharmacyId from user session or localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.pharmacyId) {
                    setPharmacyId(user.pharmacyId);
                    loadStats(user.pharmacyId);
                } else {
                    toast.error('No pharmacy associated with your account');
                }
            } catch (error) {
                console.error('Failed to parse user data:', error);
            }
        }
        setLoading(false);
    }, []);

    const loadStats = async (pharmacyId: string) => {
        try {
            // Load dispensing history
            const historyResponse = await pharmacyAPI.getDispensingHistory(pharmacyId) as any;

            // Load inventory alerts
            const alertsResponse = await pharmacyAPI.getInventoryAlerts(pharmacyId) as any;

            setStats({
                totalDispensed: historyResponse.data?.length || 0,
                pendingVerifications: 0, // Would come from separate endpoint
                lowStockAlerts: alertsResponse.data?.lowStock?.length || 0,
                expiringItems: alertsResponse.data?.expiringSoon?.length || 0,
            });
        } catch (error: any) {
            toast.error(error.message || 'Failed to load pharmacy data');
        }
    };

    const handleQRScanSuccess = (prescriptionId: string, qrHash: string) => {
        toast.success(`Scanned prescription: ${prescriptionId}`);
        // The PrescriptionVerifier component will handle the verification
    };

    const handleQRScanError = (error: string) => {
        toast.error(error);
    };

    const handleDispenseComplete = () => {
        if (pharmacyId) {
            loadStats(pharmacyId);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!pharmacyId) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>No Pharmacy Associated</CardTitle>
                        <CardDescription>
                            Your account is not linked to a pharmacy. Please contact your administrator.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Pharmacy Dashboard</h1>
                <p className="text-muted-foreground">
                    Manage prescriptions, inventory, and dispensing
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Dispensed</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalDispensed}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
                        <QrCode className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingVerifications}</div>
                        <p className="text-xs text-muted-foreground">Awaiting review</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.lowStockAlerts}</div>
                        <p className="text-xs text-muted-foreground">Items below threshold</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
                        <History className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.expiringItems}</div>
                        <p className="text-xs text-muted-foreground">Within 30 days</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="verify" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="verify">
                        <QrCode className="mr-2 h-4 w-4" />
                        Verify & Dispense
                    </TabsTrigger>
                    <TabsTrigger value="inventory">
                        <Package className="mr-2 h-4 w-4" />
                        Inventory
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="mr-2 h-4 w-4" />
                        History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="verify" className="space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* QR Scanner */}
                        <QRScanner
                            onScanSuccess={handleQRScanSuccess}
                            onScanError={handleQRScanError}
                        />

                        {/* Prescription Verifier */}
                        <PrescriptionVerifier
                            pharmacyId={pharmacyId}
                            onDispenseComplete={handleDispenseComplete}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="inventory">
                    <InventoryManager pharmacyId={pharmacyId} />
                </TabsContent>

                <TabsContent value="history">
                    <DispensingHistory pharmacyId={pharmacyId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
