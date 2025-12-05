'use client';

import { UserNav } from '@/components/user-nav';
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
} from '@/components/ui/sidebar';
import {
  Bell,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ErrorBoundary from '@/components/error-boundary';
import { useAuth } from '@/contexts/auth-context';
import { getRoutesForRole } from '@/config/navigation';

export default function DashboardLayout({
  children,
}: {
    children: React.ReactNode
}) {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  const menuItems = getRoutesForRole(user.role);

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
            {menuItems.map((item) => (
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
  );
}
