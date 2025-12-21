"use client";
import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export default function UserManager(): JSX.Element {
  const [roleFilter, setRoleFilter] = useState<"all" | "doctor" | "patient">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"doctor" | "patient">("patient");
  const endpoint = (r: string | null, s: string, p: number) => {
    // Use wallet identities endpoint and verified doctors endpoint for lists
    if (r === 'doctor') return API_BASE ? `${API_BASE}/api/v1/healthcare/doctors/verified` : `/api/v1/healthcare/doctors/verified`;
    // For patients and all, use wallet identities and filter client-side
    return API_BASE ? `${API_BASE}/api/v1/wallet/identities?page=${p}&pageSize=${pageSize}&search=${encodeURIComponent(s)}` : `/api/v1/wallet/identities?page=${p}&pageSize=${pageSize}&search=${encodeURIComponent(s)}`;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(endpoint(roleFilter === "all" ? null : roleFilter, search, page));
        if (!res.ok) { setUsers([]); setTotal(0); return; }
        const json = await res.json();
        if (!mounted) return;
        setUsers(json.items || json || []);
        setTotal(json.total || (json.items ? json.items.length : users.length));
      } catch (err) {
        setUsers([]); setTotal(0);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, [roleFilter, search, page]);

  async function invite() {
    if (!inviteEmail) return;
    try {
      const endpoint = API_BASE ? `${API_BASE}/users/invite` : `/api/users/invite`;
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
      if (!res.ok) throw new Error('Invite failed');
      setInviteEmail('');
      setPage(1);
    } catch (err) {
      // ignore for now
    }
  }

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="font-medium mb-3">User Manager</h3>
      <div className="flex gap-2 mb-3">
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as any); setPage(1); }} className="rounded border px-2 py-1">
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
            {loading && <tr><td colSpan={3} className="py-4">Loading…</td></tr>}
            {!loading && users.length === 0 && <tr><td colSpan={3} className="py-4">No users</td></tr>}
            {users.map((u: any) => (
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
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} className="rounded border px-2 py-1">
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
