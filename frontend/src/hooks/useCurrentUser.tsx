'use client';
import { useEffect, useState } from 'react';
import { authUtils } from '@/lib/auth-utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export type CurrentUser = {
  address?: string;
  role?: string;
  name?: string;
  email?: string;
};

export default function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const token = authUtils.getToken();
        const endpoint = API_BASE ? `${API_BASE}/api/auth/me` : '/api/auth/me';
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const res = await fetch(endpoint, { headers });
        if (!mounted) {return;}
        if (!res.ok) { setUser(null); return; }
        const json = await res.json();
        setUser({ address: json.address || json.wallet || json.id, role: json.role, name: json.name, email: json.email });
      } catch {
        setUser(null);
      } finally {
        if (mounted) {setLoading(false);}
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { user, loading } as { user: CurrentUser | null; loading: boolean };
}
