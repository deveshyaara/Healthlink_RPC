'use client';

import { useEffect, useState } from 'react';
import { Shield, FileText, TrendingUp, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { insuranceAPI } from '@/lib/api/phase1';
import { toast } from 'sonner';
import { ClaimSubmitterDialog } from '@/components/insurance/ClaimSubmitterDialog';
import { ClaimReviewCard } from '@/components/insurance/ClaimReviewCard';

export default function InsuranceDashboard() {
    const [policies, setPolicies] = useState<any[]>([]);
    const [claims, setClaims] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalPolicies: 0,
        activeClaims: 0,
        approvedClaims: 0,
        rejectedClaims: 0,
    });
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        // Get user info
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                setUserRole(user.role);
                loadData(user);
            } catch (error) {
                console.error('Failed to parse user data:', error);
            }
        }
        setLoading(false);
    }, []);

    const loadClaims = async () => {
        try {
            setLoading(true);
            const claimsResponse = await insuranceAPI.listClaims() as any;
            setClaims(claimsResponse.data || []);
            return claimsResponse.data || [];
        } catch (error) {
            console.error('Failed to load claims:', error);
            toast.error('Failed to load insurance claims');
            return [];
        } finally {
            setLoading(false);
        }
    };

    const loadData = async (user: any) => {
        try {
            const allClaims = await loadClaims();

            // Calculate stats
            const activeClaims = allClaims.filter(
                (c: any) => c.status === 'SUBMITTED' || c.status === 'VERIFIED'
            ).length;
            const approvedClaims = allClaims.filter(
                (c: any) => c.status === 'APPROVED'
            ).length;
            const rejectedClaims = allClaims.filter(
                (c: any) => c.status === 'REJECTED'
            ).length;

            setStats({
                totalPolicies: 0, // Would load from policies endpoint
                activeClaims,
                approvedClaims,
                rejectedClaims,
            });

            // Load policies if patient
            if (user.role === 'patient' && user.id) {
                const policiesResponse = await insuranceAPI.getPatientPolicies(user.id) as any;
                setPolicies(policiesResponse.data);
                setStats(prev => ({ ...prev, totalPolicies: policiesResponse.data.length }));
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load insurance data');
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; icon: any; label: string }> = {
            SUBMITTED: { variant: 'secondary', icon: Clock, label: 'Submitted' },
            VERIFIED: { variant: 'default', icon: CheckCircle, label: 'Verified' },
            APPROVED: { variant: 'default', icon: CheckCircle, label: 'Approved' },
            REJECTED: { variant: 'destructive', icon: XCircle, label: 'Rejected' },
            PAID: { variant: 'default', icon: CheckCircle, label: 'Paid' },
        };

        const config = variants[status] || variants.SUBMITTED;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="gap-1">
                <Icon className="h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Insurance Management</h1>
                    <p className="text-muted-foreground">
                        Manage policies, claims, and approvals
                    </p>
                </div>
                {userRole === 'hospital_admin' && (
                    <ClaimSubmitterDialog onSuccess={() => loadData({ role: userRole })} />
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalPolicies}</div>
                        <p className="text-xs text-muted-foreground">Active coverage</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Claims</CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.activeClaims}</div>
                        <p className="text-xs text-muted-foreground">Pending review</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.approvedClaims}</div>
                        <p className="text-xs text-muted-foreground">Claims approved</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.rejectedClaims}</div>
                        <p className="text-xs text-muted-foreground">Claims rejected</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="claims" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="claims">
                        <FileText className="mr-2 h-4 w-4" />
                        Claims
                    </TabsTrigger>
                    {userRole === 'patient' && (
                        <TabsTrigger value="policies">
                            <Shield className="mr-2 h-4 w-4" />
                            My Policies
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="analytics">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="claims" className="space-y-4">
                    {userRole === 'insurance_admin' ? (
                        // Insurance Admin View - Full Claim Review
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Claims Requiring Review</CardTitle>
                                    <CardDescription>
                                        Review and approve or reject pending insurance claims
                                    </CardDescription>
                                </CardHeader>
                            </Card>

                            {claims.length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {claims.map((claim) => (
                                        <ClaimReviewCard
                                            key={claim.id}
                                            claim={claim}
                                            onUpdate={() => loadData({ role: userRole })}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="py-12">
                                        <p className="text-muted-foreground text-center">
                                            No claims to review at this time.
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    ) : (
                        // Patient / Hospital View - Read-Only Claims List
                        <Card>
                            <CardHeader>
                                <CardTitle>Insurance Claims</CardTitle>
                                <CardDescription>
                                    {userRole === 'patient'
                                        ? 'View status of your insurance claims'
                                        : 'View and manage insurance claims'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {claims.length > 0 ? (
                                    <div className="space-y-3">
                                        {claims.map((claim) => (
                                            <div key={claim.id} className="p-4 border rounded-lg">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h3 className="font-semibold">Claim #{claim.id.slice(0, 8)}</h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            Policy: {claim.policy?.policyNumber || 'N/A'}
                                                        </p>
                                                    </div>
                                                    {getStatusBadge(claim.status)}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                                    <div>
                                                        <p className="text-muted-foreground">Claimed Amount</p>
                                                        <p className="font-semibold">₹{claim.claimedAmount?.toLocaleString()}</p>
                                                    </div>
                                                    {claim.approvedAmount && (
                                                        <div>
                                                            <p className="text-muted-foreground">Approved Amount</p>
                                                            <p className="font-semibold text-green-600">
                                                                ₹{claim.approvedAmount.toLocaleString()}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-3 text-sm">
                                                    <p className="text-muted-foreground">Submitted</p>
                                                    <p>{new Date(claim.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">
                                        No claims found.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {userRole === 'patient' && (
                    <TabsContent value="policies">
                        <Card>
                            <CardHeader>
                                <CardTitle>My Insurance Policies</CardTitle>
                                <CardDescription>
                                    View your active insurance coverage
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {policies.length > 0 ? (
                                    <div className="space-y-3">
                                        {policies.map((policy) => (
                                            <div key={policy.id} className="p-4 border rounded-lg">
                                                <h3 className="font-semibold">{policy.policyNumber}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Provider: {policy.provider?.name}
                                                </p>
                                                <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                                                    <div>
                                                        <p className="text-muted-foreground">Coverage</p>
                                                        <p className="font-semibold">₹{policy.coverageAmount.toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Valid Until</p>
                                                        <p className="font-semibold">
                                                            {new Date(policy.validUntil).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-center py-8">
                                        No active policies found.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                <TabsContent value="analytics">
                    <Card>
                        <CardHeader>
                            <CardTitle>Insurance Analytics</CardTitle>
                            <CardDescription>
                                View claims trends and statistics
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-center py-8">
                                Analytics charts coming soon...
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
