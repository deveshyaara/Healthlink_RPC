'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { usersApi, doctorsApi } from '../lib/api-client';

interface User {
  id?: string;
  address?: string;
  wallet?: string;
  name?: string;
  email?: string;
  role?: string;
}

export default function UserManager(): JSX.Element {
  const [roleFilter, setRoleFilter] = useState<'all' | 'doctor' | 'patient'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [users, setUsers] = useState<User[]>([]);
  const [_total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'doctor' | 'patient'>('patient');
  const endpoint = useCallback(async (r: string | null) => {
    // Use doctors API for doctor list
    if (r === 'doctor') {
      const doctors = await doctorsApi.getVerified();
      return { items: doctors, total: doctors.length };
    }
    // For patients and all, use users API
    const users = await usersApi.getUsers();
    return { items: users, total: users.length };
  }, []);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await endpoint(roleFilter === 'all' ? null : roleFilter);
      setUsers(result.items || []);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setUsers([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, endpoint]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers, refreshTrigger]);

  async function invite() {
    if (!inviteEmail) {return;}
    try {
      await usersApi.invite({ email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      setPage(1);
      // Reload data to show updated invitation list
      setRefreshTrigger(prev => prev + 1);
    } catch (_error: unknown) { // eslint-disable-line @typescript-eslint/no-unused-vars
      // Could add error state here
    }
  }

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="font-medium mb-3">User Manager</h3>
      {error && <div className="mb-3 text-red-600">{error}</div>}
      <div className="flex gap-2 mb-3">
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as 'all' | 'doctor' | 'patient'); setPage(1); }} className="rounded border px-2 py-1">
          <option value="all">All</option>
          <option value="doctor">Doctors</option>
          <option value="patient">Patients</option>
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by wallet or email" className="flex-1 rounded border px-2 py-1" />
        <button onClick={() => { setPage(1); }} className="px-3 py-1 bg-indigo-600 text-white rounded">Search</button>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="py-2">Address</th>
              <th className="py-2">Name / Email</th>
              <th className="py-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={3} className="py-4">Loading…</td></tr>}
            {!isLoading && users.length === 0 && <tr><td colSpan={3} className="py-4">No users</td></tr>}
            {users.map((u: User) => (
              <tr key={u.address || u.id} className="border-t">
                <td className="py-2">{u.address || u.wallet || u.id}</td>
                <td className="py-2">{u.name || u.email || '-'}</td>
                <td className="py-2">{u.role || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-2 items-center">
          <input placeholder="invite email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="rounded border px-2 py-1" />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'doctor' | 'patient')} className="rounded border px-2 py-1">
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
          </select>
          <button onClick={invite} className="px-3 py-1 bg-green-600 text-white rounded">Invite</button>
        </div>

        <div className="flex gap-2 items-center">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded">Prev</button>
          <div className="text-sm">{page}</div>
          <button disabled={users.length < pageSize} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 border rounded">Next</button>
        </div>
      </div>
    </div>
  );
}
