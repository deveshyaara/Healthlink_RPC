"use client";

import { UserNav } from "@/components/user-nav";
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import {
    Bell,
    FileText,
    History,
    LayoutDashboard,
    Settings,
    ShieldCheck,
    Shield,
    Calendar,
    Pill,
    TestTube,
    Users,
} from "lucide-react"
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ErrorBoundary from "@/components/error-boundary";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user } = useAuth();

    const getMenuItems = () => {
        const baseItems = [
            {
                href: "/dashboard",
                icon: LayoutDashboard,
                label: "Dashboard",
                roles: ['patient', 'doctor', 'admin']
            }
        ];

        const patientItems = [
            {
                href: "/dashboard/records",
                icon: FileText,
                label: "My Records",
                roles: ['patient']
            },
            {
                href: "/dashboard/consent",
                icon: ShieldCheck,
                label: "Consent Management",
                roles: ['patient']
            },
            {
                href: "/dashboard/appointments",
                icon: Calendar,
                label: "My Appointments",
                roles: ['patient']
            },
            {
                href: "/dashboard/prescriptions",
                icon: Pill,
                label: "My Prescriptions",
                roles: ['patient']
            },
        ];

        const doctorItems = [
            {
                href: "/dashboard/records",
                icon: FileText,
                label: "Patient Records",
                roles: ['doctor']
            },
            {
                href: "/dashboard/consent",
                icon: ShieldCheck,
                label: "Consent Requests",
                roles: ['doctor']
            },
            {
                href: "/dashboard/appointments",
                icon: Calendar,
                label: "Appointments",
                roles: ['doctor']
            },
            {
                href: "/dashboard/prescriptions",
                icon: Pill,
                label: "Prescriptions",
                roles: ['doctor']
            },
            {
                href: "/dashboard/lab-tests",
                icon: TestTube,
                label: "Lab Tests",
                roles: ['doctor']
            },
        ];

        const adminItems = [
            {
                href: "/dashboard/records",
                icon: FileText,
                label: "All Records",
                roles: ['admin']
            },
            {
                href: "/dashboard/consent",
                icon: ShieldCheck,
                label: "All Consents",
                roles: ['admin']
            },
            {
                href: "/dashboard/appointments",
                icon: Calendar,
                label: "All Appointments",
                roles: ['admin']
            },
            {
                href: "/dashboard/prescriptions",
                icon: Pill,
                label: "All Prescriptions",
                roles: ['admin']
            },
            {
                href: "/dashboard/lab-tests",
                icon: TestTube,
                label: "All Lab Tests",
                roles: ['admin']
            },
            {
                href: "/dashboard/audit-trail",
                icon: History,
                label: "Audit Trail",
                roles: ['admin']
            },
            {
                href: "/dashboard/users",
                icon: Users,
                label: "User Management",
                roles: ['admin']
            },
        ];

        const allItems = [
            {
                href: "/dashboard/settings",
                icon: Settings,
                label: "Settings",
                roles: ['patient', 'doctor', 'admin']
            }
        ];

        return [...baseItems, ...patientItems, ...doctorItems, ...adminItems, ...allItems]
            .filter(item => user && item.roles.includes(user.role));
    };

    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <SidebarProvider>
            <Sidebar className="border-r-2 border-government-saffron/30">
                <SidebarHeader className="border-b border-neutral-200 dark:border-neutral-800">
                    <Link href="/" className="flex items-center gap-3 p-4">
                        <div className="h-10 w-10 bg-government-blue rounded-full flex items-center justify-center flex-shrink-0">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div className="group-data-[collapsible=icon]:hidden">
                            <div className="font-bold text-base text-government-navy dark:text-white">
                                HealthLink Pro
                            </div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-400">
                                Digital Health Exchange
                            </div>
                            <div className="text-xs text-government-blue font-medium capitalize">
                                {user.role} Portal
                            </div>
                        </div>
                    </Link>
                </SidebarHeader>
                <SidebarContent className="px-2 py-4">
                    <SidebarMenu>
                        {getMenuItems().map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton asChild tooltip={item.label} className="hover:bg-government-blue/10 hover:text-government-blue">
                                    <Link href={item.href}>
                                        <item.icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>
            <SidebarInset>
                <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b-2 border-government-saffron/30 bg-white/80 dark:bg-neutral-900/80 px-4 backdrop-blur-md sm:px-8 shadow-sm">
                    <div className="flex items-center gap-4">
                        <SidebarTrigger className="hover:bg-government-blue/10 hover:text-government-blue" />
                        <div className="hidden md:flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <Shield className="h-4 w-4 text-government-blue" />
                            <span>HealthLink Pro</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-government-blue/10 hover:text-government-blue">
                            <Bell className="h-5 w-5" />
                            <span className="sr-only">Notifications</span>
                        </Button>
                        <UserNav />
                    </div>
                </header>
                <main className="min-h-[calc(100vh-4rem)] bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-6 lg:p-8">
                    <ErrorBoundary>
                        {children}
                    </ErrorBoundary>
                </main>
            </SidebarInset>
        </SidebarProvider>
    )
}
