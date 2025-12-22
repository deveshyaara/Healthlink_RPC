'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, Heart, ShieldCheck, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';
import { PatientStats } from '@/components/dashboard/PatientStats';
import { PatientProfile } from '@/components/PatientProfile';

export default function PatientDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.name || 'Patient'}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here&apos;s an overview of your health information
          </p>
        </div>
      </div>

      {/* Stats Cards - Now using PatientStats component */}
      <PatientStats />

      {/* Patient Profile */}
      <PatientProfile />

      {/* Main Content Areas */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Appointments
            </CardTitle>
            <CardDescription>Your scheduled visits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">Dr. Sarah Johnson</p>
                  <p className="text-sm text-muted-foreground">Tomorrow, 10:00 AM - Checkup</p>
                </div>
                <Button variant="outline" size="sm">Details</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dr. Michael Chen</p>
                  <p className="text-sm text-muted-foreground">Dec 15, 2:00 PM - Follow-up</p>
                </div>
                <Button variant="outline" size="sm">Details</Button>
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
            <CardDescription>Your latest health updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New lab results available</p>
                  <p className="text-xs text-muted-foreground">Blood test - 1 day ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Prescription refilled</p>
                  <p className="text-xs text-muted-foreground">Medication ABC - 3 days ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-purple-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Consent granted</p>
                  <p className="text-xs text-muted-foreground">To Dr. Johnson - 1 week ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Health Summary</CardTitle>
          <CardDescription>Quick overview of your health status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Blood Pressure</p>
                  <p className="text-sm text-muted-foreground">120/80 mmHg - Normal</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">View History</Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Heart Rate</p>
                  <p className="text-sm text-muted-foreground">72 bpm - Normal</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">View History</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Link href="/dashboard/appointments">
              <Button variant="outline" className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                Book Appointment
              </Button>
            </Link>
            <Link href="/dashboard/records">
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                View Records
              </Button>
            </Link>
            <Link href="/dashboard/prescriptions">
              <Button variant="outline" className="w-full">
                <Heart className="mr-2 h-4 w-4" />
                Prescriptions
              </Button>
            </Link>
            <Link href="/dashboard/consent">
              <Button variant="outline" className="w-full">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Manage Consent
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
