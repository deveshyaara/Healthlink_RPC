"use client";

import { UX4GCard, UX4GCardContent, UX4GCardHeader, UX4GCardTitle } from "@/components/ui/ux4g-card"
import { UX4GBadge } from "@/components/ui/ux4g-badge"
import { Bell, FileText, History, ShieldCheck, TrendingUp, Calendar, UploadCloud } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { dashboardApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
    const { toast } = useToast()
    const [stats, setStats] = useState([
        {
            title: "Active Records",
            value: "0",
            description: "Total medical files",
            icon: FileText,
            trend: "+0%",
            variant: "primary" as const,
        },
        {
            title: "Pending Consents",
            value: "0",
            description: "Requests awaiting approval",
            icon: ShieldCheck,
            trend: "0 new",
            variant: "warning" as const,
        },
        {
            title: "Audit Events (24h)",
            value: "0",
            description: "Total access events today",
            icon: History,
            trend: "+0%",
            variant: "info" as const,
        },
        {
            title: "Unread Notifications",
            value: "0",
            description: "Important system alerts",
            icon: Bell,
            trend: "0 urgent",
            variant: "danger" as const,
        },
    ])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setError(null)
                const data = await dashboardApi.getStats()
                setStats([
                    {
                        title: "Active Records",
                        value: data.activeRecords.toString(),
                        description: "Total medical files",
                        icon: FileText,
                        trend: "+0%", // Placeholder
                        variant: "primary" as const,
                    },
                    {
                        title: "Pending Consents",
                        value: data.pendingConsents.toString(),
                        description: "Requests awaiting approval",
                        icon: ShieldCheck,
                        trend: "0 new",
                        variant: "warning" as const,
                    },
                    {
                        title: "Audit Events (24h)",
                        value: data.auditEvents24h.toString(),
                        description: "Total access events today",
                        icon: History,
                        trend: "+0%",
                        variant: "info" as const,
                    },
                    {
                        title: "Unread Notifications",
                        value: data.unreadNotifications.toString(),
                        description: "Important system alerts",
                        icon: Bell,
                        trend: "0 urgent",
                        variant: "danger" as const,
                    },
                ])
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error)
                setError('Unable to load dashboard statistics. Please check your connection and try again.')
                toast({
                    title: "Connection Error",
                    description: "Failed to load dashboard statistics. Some data may be outdated.",
                    variant: "destructive",
                })
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [toast])

    if (loading) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-government-navy dark:text-white">Dashboard</h1>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                        Loading your health data overview...
                    </p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-government-navy dark:text-white">Dashboard</h1>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                        Health data overview
                    </p>
                </div>
                <UX4GCard elevation="medium" padding="lg">
                    <UX4GCardContent className="text-center py-8">
                        <div className="text-red-500 mb-4">
                            <Bell className="h-12 w-12 mx-auto" />
                        </div>
                        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
                            Connection Error
                        </h3>
                        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                            {error}
                        </p>
                        <Button 
                            onClick={() => window.location.reload()}
                            variant="outline"
                        >
                            Try Again
                        </Button>
                    </UX4GCardContent>
                </UX4GCard>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-government-navy dark:text-white">Dashboard</h1>
                    <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                        Welcome back! Here&apos;s your health data overview.
                    </p>
                </div>
                <UX4GBadge variant="success" className="hidden md:inline-flex">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    All Systems Operational
                </UX4GBadge>
            </div>
            
            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <UX4GCard key={stat.title} elevation="medium" hover padding="md">
                        <UX4GCardHeader>
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                        {stat.title}
                                    </p>
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-3xl font-bold text-government-navy dark:text-white">
                                            {stat.value}
                                        </h3>
                                        <UX4GBadge variant={stat.variant} className="text-xs">
                                            {stat.trend}
                                        </UX4GBadge>
                                    </div>
                                </div>
                                <div className={`p-3 rounded-lg bg-${stat.variant === 'primary' ? 'government-blue' : stat.variant === 'warning' ? 'warning' : stat.variant === 'info' ? 'info' : 'danger'}/10`}>
                                    <stat.icon className={`h-6 w-6 text-${stat.variant === 'primary' ? 'government-blue' : stat.variant}`} />
                                </div>
                            </div>
                        </UX4GCardHeader>
                        <UX4GCardContent>
                            <p className="text-xs text-neutral-600 dark:text-neutral-400">
                                {stat.description}
                            </p>
                        </UX4GCardContent>
                    </UX4GCard>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Activity */}
                <UX4GCard elevation="medium" padding="none">
                    <UX4GCardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                        <UX4GCardTitle>Recent Activity</UX4GCardTitle>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            Latest actions on your account
                        </p>
                    </UX4GCardHeader>
                    <UX4GCardContent className="p-6">
                        <ul className="space-y-4">
                            <li className="flex items-start gap-4 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                                <div className="p-2 bg-government-blue/10 rounded-full flex-shrink-0">
                                    <FileText className="h-5 w-5 text-government-blue"/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">
                                        Dr. Smith requested access to &apos;Annual Checkup 2023.pdf&apos;
                                    </p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                                        2 hours ago
                                    </p>
                                </div>
                                <UX4GBadge variant="warning" className="text-xs">Pending</UX4GBadge>
                            </li>
                            <li className="flex items-start gap-4 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                                <div className="p-2 bg-success/10 rounded-full flex-shrink-0">
                                    <ShieldCheck className="h-5 w-5 text-success"/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">
                                        You granted access to &apos;Blood Test Results.pdf&apos; to Mercy Hospital
                                    </p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                                        1 day ago
                                    </p>
                                </div>
                                <UX4GBadge variant="success" className="text-xs">Approved</UX4GBadge>
                            </li>
                            <li className="flex items-start gap-4 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                                <div className="p-2 bg-info/10 rounded-full flex-shrink-0">
                                    <FileText className="h-5 w-5 text-info"/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">
                                        You uploaded &apos;X-Ray-Scan-Left-Arm.dcm&apos;
                                    </p>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                                        3 days ago
                                    </p>
                                </div>
                                <UX4GBadge variant="info" className="text-xs">New</UX4GBadge>
                            </li>
                        </ul>
                    </UX4GCardContent>
                </UX4GCard>

                {/* Quick Actions */}
                <UX4GCard elevation="medium" padding="none">
                    <UX4GCardHeader className="p-6 border-b border-neutral-200 dark:border-neutral-800">
                        <UX4GCardTitle>Quick Actions</UX4GCardTitle>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            Common tasks and shortcuts
                        </p>
                    </UX4GCardHeader>
                    <UX4GCardContent className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Link href="/dashboard/records">
                                <UX4GCard 
                                    elevation="low" 
                                    hover 
                                    padding="md"
                                    className="cursor-pointer border-2 border-transparent hover:border-government-blue"
                                >
                                    <div className="flex flex-col items-center justify-center gap-3 py-4">
                                        <div className="p-3 bg-government-blue/10 rounded-lg">
                                            <FileText className="h-8 w-8 text-government-blue"/>
                                        </div>
                                        <span className="font-medium text-center text-sm">
                                            View Records
                                        </span>
                                    </div>
                                </UX4GCard>
                            </Link>
                            <Link href="/dashboard/consent">
                                <UX4GCard 
                                    elevation="low" 
                                    hover 
                                    padding="md"
                                    className="cursor-pointer border-2 border-transparent hover:border-success"
                                >
                                    <div className="flex flex-col items-center justify-center gap-3 py-4">
                                        <div className="p-3 bg-success/10 rounded-lg">
                                            <ShieldCheck className="h-8 w-8 text-success"/>
                                        </div>
                                        <span className="font-medium text-center text-sm">
                                            Manage Consent
                                        </span>
                                    </div>
                                </UX4GCard>
                            </Link>
                            <Link href="/dashboard/audit-trail">
                                <UX4GCard 
                                    elevation="low" 
                                    hover 
                                    padding="md"
                                    className="cursor-pointer border-2 border-transparent hover:border-info"
                                >
                                    <div className="flex flex-col items-center justify-center gap-3 py-4">
                                        <div className="p-3 bg-info/10 rounded-lg">
                                            <History className="h-8 w-8 text-info"/>
                                        </div>
                                        <span className="font-medium text-center text-sm">
                                            Audit Trail
                                        </span>
                                    </div>
                                </UX4GCard>
                            </Link>
                            <Link href="/dashboard/appointments">
                                <UX4GCard 
                                    elevation="low" 
                                    hover 
                                    padding="md"
                                    className="cursor-pointer border-2 border-transparent hover:border-purple-500"
                                >
                                    <div className="flex flex-col items-center justify-center gap-3 py-4">
                                        <div className="p-3 bg-purple-500/10 rounded-lg">
                                            <Calendar className="h-8 w-8 text-purple-500"/>
                                        </div>
                                        <span className="font-medium text-center text-sm">
                                            Appointments
                                        </span>
                                    </div>
                                </UX4GCard>
                            </Link>
                            <Link href="/dashboard/settings">
                                <UX4GCard 
                                    elevation="low" 
                                    hover 
                                    padding="md"
                                    className="cursor-pointer border-2 border-transparent hover:border-warning"
                                >
                                    <div className="flex flex-col items-center justify-center gap-3 py-4">
                                        <div className="p-3 bg-warning/10 rounded-lg">
                                            <TrendingUp className="h-8 w-8 text-warning"/>
                                        </div>
                                        <span className="font-medium text-center text-sm">
                                            Settings
                                        </span>
                                    </div>
                                </UX4GCard>
                            </Link>
                            <Link href="/dashboard/records">
                                <UX4GCard 
                                    elevation="low" 
                                    hover 
                                    padding="md"
                                    className="cursor-pointer border-2 border-transparent hover:border-danger"
                                >
                                    <div className="flex flex-col items-center justify-center gap-3 py-4">
                                        <div className="p-3 bg-danger/10 rounded-lg">
                                            <UploadCloud className="h-8 w-8 text-danger"/>
                                        </div>
                                        <span className="font-medium text-center text-sm">
                                            Upload Record
                                        </span>
                                    </div>
                                </UX4GCard>
                            </Link>
                        </div>
                    </UX4GCardContent>
                </UX4GCard>
            </div>
        </div>
    )
}
