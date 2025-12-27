'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { hospitalAPI } from '@/lib/api/phase1';
import { toast } from 'sonner';

interface HospitalAnalyticsProps {
    hospitalId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function HospitalAnalytics({ hospitalId }: HospitalAnalyticsProps) {
    const [stats, setStats] = useState<any>(null);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, [hospitalId]);

    const loadAnalytics = async () => {
        try {
            const [statsResponse, deptsResponse] = await Promise.all([
                hospitalAPI.getAnalytics(hospitalId) as any,
                hospitalAPI.getDepartments(hospitalId) as any,
            ]);

            setStats(statsResponse.data);
            setDepartments(deptsResponse.data || []);
        } catch (error: any) {
            toast.error(error.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading analytics...</div>;
    }

    // Prepare data for charts
    const staffDistribution = [
        { name: 'Doctors', value: stats?.doctors || 0 },
        { name: 'Nurses', value: stats?.nurses || 0 },
        { name: 'Others', value: (stats?.staffCount || 0) - (stats?.doctors || 0) - (stats?.nurses || 0) },
    ].filter(item => item.value > 0);

    const departmentData = departments.map((dept, index) => ({
        name: dept.name,
        staff: dept._count?.users || 0,
        color: COLORS[index % COLORS.length],
    }));

    const monthlyData = [
        { month: 'Jan', appointments: 45 },
        { month: 'Feb', appointments: 52 },
        { month: 'Mar', appointments: 48 },
        { month: 'Apr', appointments: 60 },
        { month: 'May', appointments: 55 },
        { month: 'Jun', appointments: 67 },
    ];

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Staff Distribution Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Staff Distribution</CardTitle>
                        <CardDescription>
                            Breakdown of staff by role
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={staffDistribution}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {staffDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Department Staff Count */}
                <Card>
                    <CardHeader>
                        <CardTitle>Department Staffing</CardTitle>
                        <CardDescription>
                            Number of staff members per department
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={departmentData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="staff" fill="#8884d8" name="Staff Count" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Appointments Trend */}
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Appointment Trends</CardTitle>
                    <CardDescription>
                        Number of appointments scheduled per month
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="appointments" fill="#0088FE" name="Appointments" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.staffCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Doctors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.doctors || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Departments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.departmentCount || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalAppointments || 0}</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
