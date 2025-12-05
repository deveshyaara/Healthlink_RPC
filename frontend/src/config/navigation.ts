/**
 * Navigation Configuration - Source of Truth
 * Defines all routes for Doctor, Patient, and Admin portals
 * This is the single source of truth for sidebar navigation
 */

import {
  LayoutDashboard,
  FileText,
  Calendar,
  Pill,
  ShieldCheck,
  TestTube,
  Users,
  History,
  Settings,
  Heart,
  Stethoscope,
  ClipboardList,
} from 'lucide-react';

export interface NavRoute {
  href: string;
  icon: any;
  label: string;
  description?: string;
  roles: string[];
}

/**
 * DOCTOR ROUTES
 * Doctor views focus on managing multiple patients and clinical workflows
 */
export const doctorRoutes: NavRoute[] = [
  {
    href: '/dashboard/doctor',
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'Overview of your practice',
    roles: ['doctor'],
  },
  {
    href: '/dashboard/doctor/patients',
    icon: Users,
    label: 'My Patients',
    description: 'List of all your patients',
    roles: ['doctor'],
  },
  {
    href: '/dashboard/appointments',
    icon: Calendar,
    label: 'Appointments',
    description: 'Schedule and manage appointments',
    roles: ['doctor'],
  },
  {
    href: '/dashboard/prescriptions',
    icon: Pill,
    label: 'Prescriptions',
    description: "Prescriptions you've created",
    roles: ['doctor'],
  },
  {
    href: '/dashboard/lab-tests',
    icon: TestTube,
    label: 'Lab Results',
    description: 'Laboratory test results',
    roles: ['doctor'],
  },
  {
    href: '/dashboard/doctor/records',
    icon: FileText,
    label: 'Medical Records',
    description: 'Search all patient records',
    roles: ['doctor'],
  },
  {
    href: '/dashboard/consent',
    icon: ShieldCheck,
    label: 'Consent Requests',
    description: 'Patient data access permissions',
    roles: ['doctor'],
  },
];

/**
 * PATIENT ROUTES
 * Patient views focus on personal health data
 */
export const patientRoutes: NavRoute[] = [
  {
    href: '/dashboard/patient',
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'Your health overview',
    roles: ['patient'],
  },
  {
    href: '/dashboard/records',
    icon: FileText,
    label: 'My Health Records',
    description: 'Your medical documents',
    roles: ['patient'],
  },
  {
    href: '/dashboard/appointments',
    icon: Calendar,
    label: 'My Appointments',
    description: 'Scheduled visits with doctors',
    roles: ['patient'],
  },
  {
    href: '/dashboard/prescriptions',
    icon: Pill,
    label: 'My Prescriptions',
    description: 'Active medications',
    roles: ['patient'],
  },
  {
    href: '/dashboard/lab-tests',
    icon: TestTube,
    label: 'Lab Results',
    description: 'Your test results',
    roles: ['patient'],
  },
  {
    href: '/dashboard/consent',
    icon: ShieldCheck,
    label: 'Consent Management',
    description: 'Control who accesses your data',
    roles: ['patient'],
  },
];

/**
 * ADMIN ROUTES
 * Admin views have system-wide access
 */
export const adminRoutes: NavRoute[] = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'System overview',
    roles: ['admin'],
  },
  {
    href: '/dashboard/records',
    icon: FileText,
    label: 'All Records',
    description: 'All medical records',
    roles: ['admin'],
  },
  {
    href: '/dashboard/appointments',
    icon: Calendar,
    label: 'All Appointments',
    description: 'System-wide appointments',
    roles: ['admin'],
  },
  {
    href: '/dashboard/prescriptions',
    icon: Pill,
    label: 'All Prescriptions',
    description: 'All prescriptions',
    roles: ['admin'],
  },
  {
    href: '/dashboard/lab-tests',
    icon: TestTube,
    label: 'All Lab Tests',
    description: 'All laboratory results',
    roles: ['admin'],
  },
  {
    href: '/dashboard/consent',
    icon: ShieldCheck,
    label: 'All Consents',
    description: 'All consent records',
    roles: ['admin'],
  },
  {
    href: '/dashboard/audit-trail',
    icon: History,
    label: 'Audit Trail',
    description: 'System activity log',
    roles: ['admin'],
  },
];

/**
 * COMMON ROUTES (appears for all roles)
 */
export const commonRoutes: NavRoute[] = [
  {
    href: '/dashboard/settings',
    icon: Settings,
    label: 'Settings',
    description: 'Account preferences',
    roles: ['patient', 'doctor', 'admin'],
  },
];

/**
 * Get routes for a specific user role
 */
export function getRoutesForRole(role: string | undefined): NavRoute[] {
  if (!role) {return [];}

  switch (role.toLowerCase()) {
    case 'doctor':
      return [...doctorRoutes, ...commonRoutes];
    case 'patient':
      return [...patientRoutes, ...commonRoutes];
    case 'admin':
      return [...adminRoutes, ...commonRoutes];
    default:
      return commonRoutes;
  }
}

/**
 * Get page title from route href
 */
export function getPageTitle(href: string, role?: string): string {
  const allRoutes = [...doctorRoutes, ...patientRoutes, ...adminRoutes, ...commonRoutes];
  const route = allRoutes.find((r) => r.href === href);
  return route?.label || 'Dashboard';
}

/**
 * Get page description from route href
 */
export function getPageDescription(href: string, role?: string): string {
  const allRoutes = [...doctorRoutes, ...patientRoutes, ...adminRoutes, ...commonRoutes];
  const route = allRoutes.find((r) => r.href === href);
  return route?.description || '';
}
