'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface ActivityItem {
    id: string;
    type: 'appointment' | 'prescription' | 'record' | 'consent';
    description: string;
    user: string;
    timestamp: string;
}

interface RecentActivityProps {
    activities: ActivityItem[];
    loading?: boolean;
}

const activityIcons = {
    appointment: '📅',
    prescription: '💊',
    record: '📄',
    consent: '✅',
};

const activityColors = {
    appointment: 'bg-blue-50 text-blue-700',
    prescription: 'bg-green-50 text-green-700',
    record: 'bg-purple-50 text-purple-700',
    consent: 'bg-orange-50 text-orange-700',
};

export function RecentActivity({ activities, loading }: RecentActivityProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-start gap-3 animate-pulse">
                                <div className="h-8 w-8 rounded-full bg-gray-200" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent>
                {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No recent activity
                    </p>
                ) : (
                    <div className="space-y-4">
                        {activities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-3">
                                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${activityColors[activity.type]}`}>
                                    <span className="text-sm">{activityIcons[activity.type]}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        {activity.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs text-muted-foreground">
                                            {activity.user}
                                        </p>
                                        <span className="text-xs text-muted-foreground">•</span>
                                        <p className="text-xs text-muted-foreground">
                                            {activity.timestamp}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Utility to generate mock activity data
export function generateMockActivity(): ActivityItem[] {
    return [
        {
            id: '1',
            type: 'appointment',
            description: 'New appointment scheduled',
            user: 'Dr. Smith',
            timestamp: '5 minutes ago',
        },
        {
            id: '2',
            type: 'prescription',
            description: 'Prescription created for patient',
            user: 'Dr. Johnson',
            timestamp: '12 minutes ago',
        },
        {
            id: '3',
            type: 'record',
            description: 'Medical record uploaded',
            user: 'Dr. Williams',
            timestamp: '1 hour ago',
        },
        {
            id: '4',
            type: 'consent',
            description: 'Patient consent granted',
            user: 'Patient John Doe',
            timestamp: '2 hours ago',
        },
        {
            id: '5',
            type: 'appointment',
            description: 'Appointment confirmed',
            user: 'Dr. Brown',
            timestamp: '3 hours ago',
        },
    ];
}
