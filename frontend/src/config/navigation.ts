/**
 * Navigation Configuration - Source of Truth
 * Defines all routes for Doctor, Patient, and Admin portals
 * This is the single source of truth for sidebar navigation
 */

import React from 'react';
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
  Building2,
  Stethoscope,
  QrCode,
  Shield,
} from 'lucide-react';

export interface NavRoute {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
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
    roles: ['doctor', 'patient'], // ✅ Allow both
  },
  {
    href: '/dashboard/prescriptions',
    icon: Pill,
    label: 'Prescriptions',
    description: "Prescriptions you've created",
    roles: ['doctor', 'patient'], // ✅ Allow both
  },
  {
    href: '/dashboard/lab-tests',
    icon: TestTube,
    label: 'Lab Results',
    description: 'Laboratory test results',
    roles: ['doctor', 'patient'], // ✅ Allow both
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
    roles: ['doctor', 'patient'], // ✅ FIXED: Allow both doctors and patients
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
  // Note: appointments, prescriptions, and lab-tests are now in doctorRoutes with both roles
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
 * Admin views have system-wide access to everything
 */
export const adminRoutes: NavRoute[] = [
  // Top-level admin console overview
  {
    href: '/dashboard/admin',
    icon: LayoutDashboard,
    label: 'Dashboard',
    description: 'System management console',
    roles: ['admin'],
  },

  // User Management grouping and specific pages
  {
    href: '/dashboard/admin/users',
    icon: Users,
    label: 'User Management',
    description: 'Manage doctors, patients and verifications',
    roles: ['admin'],
  },
  {
    href: '/dashboard/admin/users/doctors',
    icon: Users,
    label: 'Doctors',
    description: 'Manage registered doctors',
    roles: ['admin'],
  },
  {
    href: '/dashboard/admin/users/patients',
    icon: Users,
    label: 'Patients',
    description: 'Manage registered patients',
    roles: ['admin'],
  },
  {
    href: '/dashboard/admin/users/pending',
    icon: ShieldCheck,
    label: 'Pending Verifications',
    description: 'Approve or reject pending doctor verifications',
    roles: ['admin'],
  },

  // System logs and audit
  {
    href: '/dashboard/audit-trail',
    icon: History,
    label: 'System Logs',
    description: 'Audit trails and access logs',
    roles: ['admin'],
  },

  // System health and misc
  {
    href: '/dashboard/system-health',
    icon: FileText,
    label: 'System Health',
    description: 'Monitoring and connectivity status',
    roles: ['admin'],
  },
];

/**
 * PHARMACY ROUTES (Phase 1)
 * Pharmacist views for prescription verification and dispensing
 */
export const pharmacyRoutes: NavRoute[] = [
  {
    href: '/dashboard/pharmacy',
    icon: QrCode,
    label: 'Pharmacy',
    description: 'E-prescription verification and dispensing',
    roles: ['pharmacist', 'admin'],
  },
];

/**
 * HOSPITAL ROUTES (Phase 1)
 * Hospital management for staff and departments
 */
export const hospitalRoutes: NavRoute[] = [
  {
    href: '/dashboard/hospital',
    icon: Building2,
    label: 'Hospital Management',
    description: 'Manage departments and staff',
    roles: ['hospital_admin', 'doctor', 'admin'],
  },
];

/**
 * INSURANCE ROUTES (Phase 1)
 * Insurance claims and policy management
 */
export const insuranceRoutes: NavRoute[] = [
  {
    href: '/dashboard/insurance',
    icon: Shield,
    label: 'Insurance',
    description: 'Claims and policy management',
    roles: ['insurance', 'patient', 'admin'],
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
  if (!role) { return []; }

  const normalizedRole = role.toLowerCase();

  switch (normalizedRole) {
    case 'doctor':
      return [...doctorRoutes, ...hospitalRoutes, ...commonRoutes];
    case 'patient':
      // Include patient-specific routes + shared routes from doctorRoutes that patients can access
      const sharedRoutes = doctorRoutes.filter(route => route.roles.includes('patient'));
      return [...patientRoutes, ...sharedRoutes, ...insuranceRoutes, ...commonRoutes];
    case 'admin':
      return [...adminRoutes, ...pharmacyRoutes, ...hospitalRoutes, ...insuranceRoutes, ...commonRoutes];
    case 'pharmacist':
      return [...pharmacyRoutes, ...commonRoutes];
    case 'hospital_admin':
      return [...hospitalRoutes, ...commonRoutes];
    case 'insurance':
      return [...insuranceRoutes, ...commonRoutes];
    default:
      return commonRoutes;
  }
}

/**
 * Check if a user has access to a specific route
 * Admin users have access to ALL routes
 * Now supports sub-routes (e.g., /dashboard/doctor/patients/add)
 */
export function canAccessRoute(userRole: string | undefined, routeHref: string): boolean {
  if (!userRole) {
    return false;
  }

  const normalizedRole = userRole.toLowerCase();

  // ADMIN HAS ACCESS TO EVERYTHING
  if (normalizedRole === 'admin') {
    return true;
  }

  // Allow signin/signout routes for everyone
  if (routeHref.includes('/signin') || routeHref.includes('/signout') || routeHref === '/') {
    return true;
  }

  const allRoutes = [...doctorRoutes, ...patientRoutes, ...adminRoutes, ...pharmacyRoutes, ...hospitalRoutes, ...insuranceRoutes, ...commonRoutes];

  // First, try exact match
  const exactRoute = allRoutes.find((r) => r.href === routeHref);
  if (exactRoute) {
    return exactRoute.roles.includes(normalizedRole);
  }

  // If no exact match, check if the current route is a sub-route of an allowed route
  // Example: /dashboard/doctor/patients/add should match /dashboard/doctor/patients
  const parentRoute = allRoutes.find((r) => routeHref.startsWith(r.href + '/') || routeHref.startsWith(r.href));

  if (parentRoute) {
    return parentRoute.roles.includes(normalizedRole);
  }

  // If route not found in config, check by role-based dashboard prefix
  // This allows new pages under /dashboard/doctor/ or /dashboard/patient/ without explicit config
  if (routeHref.startsWith('/dashboard/doctor') && normalizedRole === 'doctor') {
    return true;
  }

  if (routeHref.startsWith('/dashboard/patient') && normalizedRole === 'patient') {
    return true;
  }

  if (routeHref.startsWith('/dashboard/admin') && normalizedRole === 'admin') {
    return true;
  }

  // Phase 1 routes
  if (routeHref.startsWith('/dashboard/pharmacy') && (normalizedRole === 'pharmacist' || normalizedRole === 'admin')) {
    return true;
  }

  if (routeHref.startsWith('/dashboard/hospital') && (normalizedRole === 'hospital_admin' || normalizedRole === 'doctor' || normalizedRole === 'admin')) {
    return true;
  }

  if (routeHref.startsWith('/dashboard/insurance') && (normalizedRole === 'insurance' || normalizedRole === 'patient' || normalizedRole === 'admin')) {
    return true;
  }

  // Default deny for safety
  return false;
}

/**
 * Check if a route path is restricted to specific role
 */
export function isRestrictedRoute(pathname: string): { isRestricted: boolean; allowedRoles: string[] } {
  const allRoutes = [...doctorRoutes, ...patientRoutes, ...adminRoutes, ...pharmacyRoutes, ...hospitalRoutes, ...insuranceRoutes, ...commonRoutes];
  const route = allRoutes.find((r) => pathname.startsWith(r.href));

  if (!route) {
    return { isRestricted: false, allowedRoles: [] };
  }

  return {
    isRestricted: route.roles.length < 3, // If less than 3 roles, it's restricted
    allowedRoles: route.roles,
  };
}

/**
 * Get page title from route href
 */
export function getPageTitle(href: string, _role?: string): string {
  const allRoutes = [...doctorRoutes, ...patientRoutes, ...adminRoutes, ...pharmacyRoutes, ...hospitalRoutes, ...insuranceRoutes, ...commonRoutes];
  const route = allRoutes.find((r) => r.href === href);
  return route?.label || 'Dashboard';
}

/**
 * Get page description from route href
 */
export function getPageDescription(href: string, _role?: string): string {
  const allRoutes = [...doctorRoutes, ...patientRoutes, ...adminRoutes, ...pharmacyRoutes, ...hospitalRoutes, ...insuranceRoutes, ...commonRoutes];
  const route = allRoutes.find((r) => r.href === href);
  return route?.description || '';
}
