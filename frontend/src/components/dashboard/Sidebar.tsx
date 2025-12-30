import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { getRoutesForRole } from '@/config/navigation';
import { ChevronDown, Users, ServerCog, FileText, Settings as Cog, LayoutDashboard, Shield } from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const role = user?.role?.toLowerCase() || '';
  const routes = getRoutesForRole(user?.role);
  const [usersOpen, setUsersOpen] = useState(true);

  if (!user) return null;

  // Admin-specific visual style and grouping
  if (role === 'admin') {
    const userRoutes = routes.filter((r) => r.href.startsWith('/dashboard/admin/users'));
    const otherRoutes = routes.filter((r) => !r.href.startsWith('/dashboard/admin/users'));

    return (
      <nav className="p-4 w-64 bg-white dark:bg-neutral-900 border-r">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 bg-government-blue rounded flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold">Admin Console | {user.name || user.email}</div>
            <div className="text-xs text-neutral-500">System Management</div>
          </div>
        </div>

        <ul className="space-y-2">
          {otherRoutes.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex items-center gap-3 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <item.icon className="h-5 w-5 text-government-navy" />
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          ))}

          <li>
            <button onClick={() => setUsersOpen((s) => !s)} className="w-full flex items-center justify-between gap-3 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-government-navy" />
                <span className="font-medium">User Management</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${usersOpen ? 'rotate-180' : ''}`} />
            </button>
            {usersOpen && (
              <ul className="mt-2 ml-8 space-y-1">
                {userRoutes.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className="flex items-center gap-2 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm">
                      <r.icon className="h-4 w-4 text-neutral-500" />
                      <span>{r.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>

          <li>
            <Link href="/dashboard/admin/compliance" className="flex items-center gap-3 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <Shield className="h-5 w-5 text-government-navy" />
              <span className="font-medium">Compliance</span>
            </Link>
          </li>

          <li>
            <Link href="/dashboard/settings" className="flex items-center gap-3 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <Cog className="h-5 w-5 text-government-navy" />
              <span className="font-medium">Settings</span>
            </Link>
          </li>
        </ul>
      </nav>
    );
  }

  // Non-admin: fallback to simple list
  return (
    <nav className="p-4 w-64 bg-white dark:bg-neutral-900 border-r">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-10 w-10 bg-government-blue rounded flex items-center justify-center">
          <LayoutDashboard className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-bold">{user.role} Portal</div>
          <div className="text-xs text-neutral-500">HealthLink</div>
        </div>
      </div>
      <ul className="space-y-2">
        {routes.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="flex items-center gap-3 p-2 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <item.icon className="h-5 w-5 text-government-navy" />
              <span className="font-medium">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
