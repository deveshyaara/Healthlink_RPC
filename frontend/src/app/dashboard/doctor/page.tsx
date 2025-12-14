'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Activity, ClipboardList } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { DoctorStats } from '@/components/dashboard/DoctorStats';
import { AddPatientDialog, ScheduleAppointmentDialog } from '@/components/doctor/DoctorActions';
import { CreatePrescriptionDialog } from '@/components/doctor/CreatePrescriptionDialog';
import { RequireDoctor } from '@/components/auth/RequireRole';

export default function DoctorDashboard() {
  const { user } = useAuth();

  return (
    <RequireDoctor>
      <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, Dr. {user?.name || 'Doctor'}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's your overview for today
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <AddPatientDialog />
          <CreatePrescriptionDialog />
          <ScheduleAppointmentDialog />
        </div>
      </div>

      {/* Stats Cards - Now using DoctorStats component */}
      <DoctorStats />

      {/* Main Content Areas */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>Your appointments for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">John Doe</p>
                  <p className="text-sm text-muted-foreground">10:00 AM - Checkup</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">Jane Smith</p>
                  <p className="text-sm text-muted-foreground">11:30 AM - Follow-up</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bob Johnson</p>
                  <p className="text-sm text-muted-foreground">2:00 PM - Consultation</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            </div>
            <Link href="/dashboard/appointments">
              <Button className="w-full mt-4" variant="secondary">View All Appointments</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates and actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Lab results received</p>
                  <p className="text-xs text-muted-foreground">Patient: John Doe - 2 hours ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Prescription approved</p>
                  <p className="text-xs text-muted-foreground">Patient: Jane Smith - 4 hours ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-yellow-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Appointment rescheduled</p>
                  <p className="text-xs text-muted-foreground">Patient: Bob Johnson - 1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Link href="/dashboard/records">
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                View Records
              </Button>
            </Link>
            <Link href="/dashboard/prescriptions">
              <Button variant="outline" className="w-full">
                <ClipboardList className="mr-2 h-4 w-4" />
                Prescriptions
              </Button>
            </Link>
            <Link href="/dashboard/appointments">
              <Button variant="outline" className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule
              </Button>
            </Link>
            <Link href="/dashboard/lab-tests">
              <Button variant="outline" className="w-full">
                <Activity className="mr-2 h-4 w-4" />
                Lab Tests
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
    </RequireDoctor>
  );
}
