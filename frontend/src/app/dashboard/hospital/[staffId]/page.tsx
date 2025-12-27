'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User } from 'lucide-react';
import { hospitalAPI } from '@/lib/api/phase1';

export default function StaffDetailPage() {
    const params = useParams();
    const router = useRouter();
    const staffId = params?.staffId as string;

    const [staff, setStaff] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                // For now, get all staff and find the one we need
                const userStr = localStorage.getItem('user');
                if (!userStr) {
                    setError('Not authenticated');
                    return;
                }

                const user = JSON.parse(userStr);
                if (!user.hospitalId) {
                    setError('No hospital associated');
                    return;
                }

                const response = await hospitalAPI.getStaff(user.hospitalId) as any;
                const staffList = response.data || [];
                const foundStaff = staffList.find((s: any) => s.id === staffId || s.userId === staffId);

                if (foundStaff) {
                    setStaff(foundStaff);
                } else {
                    setError('Staff member not found');
                }
            } catch (err) {
                console.error('Failed to fetch staff:', err);
                setError(err instanceof Error ? err.message : 'Failed to load staff details');
            } finally {
                setLoading(false);
            }
        };

        if (staffId) {
            fetchStaff();
        }
    }, [staffId]);

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-government-blue mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading staff details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !staff) {
        return (
            <div className="space-y-8">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <Card>
                    <CardContent className="py-12">
                        <div className="text-center">
                            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Staff Member Not Found</h3>
                            <p className="text-muted-foreground">{error || 'Could not load staff details'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-government-navy dark:text-white">
                            {staff.fullName}
                        </h1>
                        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                            {staff.role}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Staff Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name */}
                        <div className="flex items-start gap-3">
                            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                                <p className="text-base font-semibold">{staff.fullName}</p>
                            </div>
                        </div>

                        {/* Role */}
                        <div className="flex items-start gap-3">
                            <div className="h-5 w-5 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Role</p>
                                <Badge variant="outline">{staff.role}</Badge>
                            </div>
                        </div>

                        {/* Staff ID */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Staff ID</p>
                            <p className="text-base font-mono">{staff.id}</p>
                        </div>

                        {/* User ID */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">User ID</p>
                            <p className="text-base font-mono">{staff.userId}</p>
                        </div>

                        {/* Specialization */}
                        {staff.doctorSpecialization && (
                            <div className="col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">Specialization</p>
                                <p className="text-base">{staff.doctorSpecialization}</p>
                            </div>
                        )}

                        {/* Department */}
                        {staff.department && (
                            <div className="col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">Department</p>
                                <p className="text-base">{staff.department}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
