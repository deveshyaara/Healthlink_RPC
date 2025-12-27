'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, Users, FileText, Calendar } from 'lucide-react';

interface Stat {
    label: string;
    value: number | string;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
    icon: React.ElementType;
    color: string;
}

interface StatCardProps {
    stat: Stat;
}

export function StatCard({ stat }: StatCardProps) {
    const Icon = stat.icon;

    const trendColor = stat.trend === 'up'
        ? 'text-green-600'
        : stat.trend === 'down'
            ? 'text-red-600'
            : 'text-gray-600';

    const TrendIcon = stat.trend === 'up' ? TrendingUp : stat.trend === 'down' ? TrendingDown : Activity;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {stat.label}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.change !== undefined && (
                    <div className={`flex items-center text-xs ${trendColor} mt-2`}>
                        <TrendIcon className="h-3 w-3 mr-1" />
                        <span>
                            {stat.change > 0 ? '+' : ''}{stat.change}% from last month
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

interface StatGridProps {
    stats: Stat[];
}

export function StatGrid({ stats }: StatGridProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
                <StatCard key={index} stat={stat} />
            ))}
        </div>
    );
}

// Pre-defined stat configurations
export const createUserStats = (totalUsers: number, newUsers: number, activeUsers: number): Stat[] => [
    {
        label: 'Total Users',
        value: totalUsers,
        change: 12,
        trend: 'up',
        icon: Users,
        color: 'bg-blue-100 text-blue-600',
    },
    {
        label: 'New This Month',
        value: newUsers,
        change: 8,
        trend: 'up',
        icon: TrendingUp,
        color: 'bg-green-100 text-green-600',
    },
    {
        label: 'Active Users',
        value: activeUsers,
        change: 5,
        trend: 'up',
        icon: Activity,
        color: 'bg-purple-100 text-purple-600',
    },
    {
        label: 'Total Records',
        value: '1,234',
        change: 15,
        trend: 'up',
        icon: FileText,
        color: 'bg-orange-100 text-orange-600',
    },
];

export const createAppointmentStats = (total: number, pending: number, completed: number): Stat[] => [
    {
        label: 'Total Appointments',
        value: total,
        icon: Calendar,
        color: 'bg-indigo-100 text-indigo-600',
    },
    {
        label: 'Pending',
        value: pending,
        change: -3,
        trend: 'down',
        icon: Activity,
        color: 'bg-yellow-100 text-yellow-600',
    },
    {
        label: 'Completed',
        value: completed,
        change: 18,
        trend: 'up',
        icon: TrendingUp,
        color: 'bg-green-100 text-green-600',
    },
];
