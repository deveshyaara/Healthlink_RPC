'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, BarChart3, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hospitalAPI } from '@/lib/api/phase1';
import { toast } from 'sonner';
import { AddDepartmentDialog } from '@/components/hospital/AddDepartmentDialog';
import { EditDepartmentDialog } from '@/components/hospital/EditDepartmentDialog';
import { AssignStaffDialog } from '@/components/hospital/AssignStaffDialog';
import { HospitalAnalytics } from '@/components/hospital/HospitalAnalytics';
import { Edit, UserPlus } from 'lucide-react';

export default function HospitalDashboard() {
    const router = useRouter();
    const [hospitalId, setHospitalId] = useState<string | null>(null);
    const [stats, setStats] = useState({
        staffCount: 0,
        departmentCount: 0,
        totalAppointments: 0,
        doctors: 0,
    });
    const [departments, setDepartments] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDepartment, setSelectedDepartment] = useState<any | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showAssignDialog, setShowAssignDialog] = useState(false);

    useEffect(() => {
        // Get hospitalId from user session
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                if (user.hospitalId) {
                    setHospitalId(user.hospitalId);
                    loadHospitalData(user.hospitalId);
                } else {
                    toast.error('No hospital associated with your account');
                }
            } catch (error) {
                console.error('Failed to parse user data:', error);
            }
        }
        setLoading(false);
    }, []);

    const loadHospitalData = async (hospitalId: string) => {
        try {
            // Load analytics
            const statsResponse = await hospitalAPI.getAnalytics(hospitalId) as any;
            setStats(statsResponse.data);

            // Load departments
            const deptsResponse = await hospitalAPI.getDepartments(hospitalId) as any;
            setDepartments(deptsResponse.data);

            // Load staff
            const staffResponse = await hospitalAPI.getStaff(hospitalId) as any;
            setStaff(staffResponse.data);
        } catch (error: any) {
            toast.error(error.message || 'Failed to load hospital data');
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!hospitalId) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardHeader>
                        <CardTitle>No Hospital Associated</CardTitle>
                        <CardDescription>
                            Your account is not linked to a hospital. Please contact your administrator.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Hospital Management</h1>
                    <p className="text-muted-foreground">
                        Manage departments, staff, and operations
                    </p>
                </div>
                <AddDepartmentDialog hospitalId={hospitalId} onSuccess={() => loadHospitalData(hospitalId)} />
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.staffCount}</div>
                        <p className="text-xs text-muted-foreground">Active employees</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Departments</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.departmentCount}</div>
                        <p className="text-xs text-muted-foreground">Active departments</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Doctors</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.doctors}</div>
                        <p className="text-xs text-muted-foreground">Medical staff</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalAppointments}</div>
                        <p className="text-xs text-muted-foreground">Total booked</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="departments" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="departments">
                        <Building2 className="mr-2 h-4 w-4" />
                        Departments
                    </TabsTrigger>
                    <TabsTrigger value="staff">
                        <Users className="mr-2 h-4 w-4" />
                        Staff
                    </TabsTrigger>
                    <TabsTrigger value="analytics">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Analytics
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="departments" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Departments</CardTitle>
                            <CardDescription>
                                Manage hospital departments and their staff
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {departments.length > 0 ? (
                                <div className="space-y-3">
                                    {departments.map((dept) => (
                                        <div key={dept.id} className="p-4 border rounded-lg flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="font-semibold">{dept.name}</h3>
                                                {dept.description && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {dept.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedDepartment(dept);
                                                        setShowAssignDialog(true);
                                                    }}
                                                >
                                                    <UserPlus className="h-4 w-4 mr-1" />
                                                    Assign Staff
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedDepartment(dept);
                                                        setShowEditDialog(true);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">
                                    No departments found. Click "Add Department" to create one.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="staff">
                    <Card>
                        <CardHeader>
                            <CardTitle>Hospital Staff</CardTitle>
                            <CardDescription>
                                View and manage all staff members
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {staff.length > 0 ? (
                                <div className="space-y-3">
                                    {staff.map((member) => (
                                        <div key={member.id} className="p-4 border rounded-lg flex justify-between items-center">
                                            <div>
                                                <h3 className="font-semibold">{member.fullName}</h3>
                                                <p className="text-sm text-muted-foreground">{member.role}</p>
                                                {member.doctorSpecialization && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {member.doctorSpecialization}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/dashboard/hospital/${member.id}`)}
                                            >
                                                View Details
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground text-center py-8">
                                    No staff members found.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analytics">
                    <HospitalAnalytics hospitalId={hospitalId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
